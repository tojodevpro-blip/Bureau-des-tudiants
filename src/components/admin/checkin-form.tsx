"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ImageUp,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import jsQR from "jsqr";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type CheckinResult = { alreadyCheckedIn: boolean; name: string; at: string | null };

function extractToken(raw: string) {
  const value = raw.trim();
  try {
    const url = new URL(value);
    const fromQuery =
      url.searchParams.get("token") ??
      url.searchParams.get("billet") ??
      url.searchParams.get("qr");
    if (fromQuery) return fromQuery.trim();
  } catch {
    // Le contenu du QR est généralement le jeton brut.
  }
  if (value.includes("/billet/")) {
    const last = value.split("/").filter(Boolean).pop();
    if (last) return last;
  }
  return value;
}

export function CheckinForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [imageScanning, setImageScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopCamera() {
    activeRef.current = false;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCameraStarting(false);
  }

  async function submitToken(rawToken: string) {
    const clean = extractToken(rawToken);
    if (clean.length < 10) {
      setError("Billet invalide : le code QR est trop court.");
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<CheckinResult>(`/api/admin/events/${eventId}/checkin`, {
        method: "POST",
        body: JSON.stringify({ token: clean }),
      });
      setResult(data);
      setToken("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Billet invalide.");
    } finally {
      processingRef.current = false;
      setLoading(false);
    }
  }

  function handleDetected(raw: string) {
    if (processingRef.current) return;
    stopCamera();
    void submitToken(raw);
  }

  function scanFrame() {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const code = jsQR(image.data, image.width, image.height, {
      inversionAttempts: "dontInvert",
    });
    if (code?.data) {
      handleDetected(code.data);
      return;
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }

  async function startCamera() {
    setCameraError(null);
    setError(null);
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "La caméra n’est pas disponible dans ce navigateur. Utilise la saisie manuelle ou importe une photo du QR.",
      );
      return;
    }
    setCameraStarting(true);
    setCameraActive(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      activeRef.current = true;
      setCameraStarting(false);
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      stopCamera();
      const name = err instanceof DOMException ? err.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Accès à la caméra refusé. Autorise la caméra dans le navigateur puis réessaie."
          : name === "NotFoundError"
            ? "Aucune caméra détectée sur cet appareil."
            : "Impossible de démarrer la caméra. Vérifie que la page est bien servie en HTTPS.",
      );
    }
  }

  async function scanImage(file: File) {
    setImageScanning(true);
    setCameraError(null);
    setError(null);
    setResult(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("canvas");
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height);
      if (!code?.data) {
        setCameraError("Aucun QR lisible sur cette image. Essaie une photo plus nette.");
        return;
      }
      await submitToken(code.data);
    } catch {
      setCameraError("Impossible de lire cette image. Essaie une photo au format JPEG ou PNG.");
    } finally {
      setImageScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="error" title="Présence non validée">
          {error}
        </Alert>
      ) : null}
      {result ? (
        <Alert
          variant="success"
          title={result.alreadyCheckedIn ? "Déjà enregistré" : "Présence validée"}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {result.name}
            {result.at ? ` à ${new Date(result.at).toLocaleString("fr-FR")}` : ""}
          </span>
        </Alert>
      ) : null}
      {cameraError ? (
        <Alert variant="warning" title="Scan caméra">
          {cameraError}
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-ink-100 bg-ink-950 p-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className={cameraActive ? "h-full w-full object-cover" : "hidden"}
              playsInline
              muted
            />
            {!cameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center text-ink-300">
                <span className="rounded-full bg-white/10 p-4">
                  <ScanLine className="h-8 w-8" aria-hidden />
                </span>
                <p className="text-sm font-medium text-white">Scanner le QR du billet</p>
                <p className="max-w-xs text-xs leading-relaxed text-ink-300">
                  Place le QR dans le cadre. Le scan fonctionne sur téléphone, tablette et PC
                  équipé d’une caméra.
                </p>
              </div>
            ) : null}
            {cameraActive ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-2xl border-2 border-brand-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            ) : null}
            {cameraStarting ? (
              <div className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-white">
                Démarrage de la caméra…
              </div>
            ) : null}
          </div>
          <canvas ref={canvasRef} className="hidden" aria-hidden />
          <div className="flex flex-wrap gap-2">
            {cameraActive ? (
              <Button type="button" variant="outline" onClick={stopCamera}>
                <CameraOff className="h-4 w-4" aria-hidden />
                Arrêter la caméra
              </Button>
            ) : (
              <Button type="button" onClick={startCamera} loading={cameraStarting}>
                <Camera className="h-4 w-4" aria-hidden />
                {result ? "Scanner un autre billet" : "Activer la caméra"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              loading={imageScanning}
            >
              {imageScanning ? (
                <RefreshCw className="h-4 w-4" aria-hidden />
              ) : (
                <ImageUp className="h-4 w-4" aria-hidden />
              )}
              Importer une photo du QR
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void scanImage(file);
              }}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-ink-400">
            La caméra nécessite HTTPS ou localhost. Si le navigateur la bloque, la saisie manuelle
            et l’import photo restent disponibles.
          </p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void submitToken(token); }} className="space-y-3">
          <Field
            label="Code du billet QR"
            htmlFor="token"
            hint="Colle le jeton ou le lien du billet si le scan n’est pas possible."
          >
            <Input
              id="token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Colle le contenu du QR…"
              required
              minLength={10}
              autoComplete="off"
            />
          </Field>
          <Button type="submit" loading={loading} disabled={token.trim().length < 10}>
            <ScanLine className="h-4 w-4" aria-hidden />
            Valider le billet
          </Button>
          <div className="rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-500">
            <p className="font-semibold text-ink-700">Bon à savoir</p>
            <p className="mt-1">
              Un billet déjà scanné est signalé sans être validé deux fois. Le nom de l’étudiant
              s’affiche après chaque scan.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
