"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type Position = {
  id: string;
  titre: string;
  description: string | null;
};

export function CandidatureForm({
  electionTitle,
  positions,
}: {
  electionTitle: string;
  positions: Position[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    positionId: positions[0]?.id ?? "",
    photoUrl: "",
    slogan: "",
    programme: "",
    videoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/candidatures", {
        method: "POST",
        body: JSON.stringify({
          positionId: form.positionId,
          photoUrl: form.photoUrl || null,
          slogan: form.slogan || null,
          programme: form.programme,
          videoUrl: form.videoUrl || null,
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Dépôt de candidature impossible.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Field
        label="Poste *"
        htmlFor="candidature-position"
        hint={`Élection : ${electionTitle}`}
      >
        <Select
          id="candidature-position"
          value={form.positionId}
          onChange={(event) => setForm({ ...form, positionId: event.target.value })}
          required
        >
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.titre}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Photo (URL)"
        htmlFor="candidature-photo"
        hint="Lien https:// vers une photo. Facultatif."
      >
        <Input
          id="candidature-photo"
          type="url"
          value={form.photoUrl}
          onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
          placeholder="https://exemple.mg/photo.jpg"
        />
      </Field>

      <Field label="Slogan" htmlFor="candidature-slogan">
        <Input
          id="candidature-slogan"
          value={form.slogan}
          onChange={(event) => setForm({ ...form, slogan: event.target.value })}
          placeholder="Une phrase courte"
          maxLength={200}
        />
      </Field>

      <Field
        label="Programme *"
        htmlFor="candidature-programme"
        hint="Présente tes idées et engagements en quelques phrases."
      >
        <Textarea
          id="candidature-programme"
          value={form.programme}
          onChange={(event) => setForm({ ...form, programme: event.target.value })}
          className="min-h-[180px]"
          required
          minLength={20}
          maxLength={10000}
        />
      </Field>

      <Field
        label="Vidéo de présentation (URL)"
        htmlFor="candidature-video"
        hint="Lien https:// facultatif."
      >
        <Input
          id="candidature-video"
          type="url"
          value={form.videoUrl}
          onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
          placeholder="https://youtube.com/..."
        />
      </Field>

      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        <Send className="h-4 w-4" aria-hidden />
        Déposer ma candidature
      </Button>
    </form>
  );
}
