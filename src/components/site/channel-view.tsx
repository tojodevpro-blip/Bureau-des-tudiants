"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, MessageCircle, Reply, Send, Smile, Trash2, X } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { formatDateTime, initials } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/site/report-button";

export type ChatMessage = {
  id: string;
  contenu: string | null;
  imageUrl: string | null;
  deletedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    role: "STUDENT" | "MEMBRE_BDE" | "ADMIN";
    photoUrl: string | null;
    student: { prenoms: string; nom: string } | null;
  };
  replyTo: {
    id: string;
    contenu: string | null;
    deletedAt: string | null;
    author: { student: { prenoms: string; nom: string } | null; email: string | null };
  } | null;
  reactions: { emoji: string; userId: string }[];
};

const EMOJIS = ["👍", "❤️", "😂", "🎉", "👏"];
const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024;
const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ChannelView({
  channelId,
  channelName,
  readOnly,
  initialMessages,
  currentUser,
  canModerate,
}: {
  channelId: string;
  channelName: string;
  readOnly: boolean;
  initialMessages: ChatMessage[];
  currentUser: { id: string; role: "STUDENT" | "MEMBRE_BDE" | "ADMIN" };
  canModerate: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [contenu, setContenu] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: ChatMessage[] }>(`/api/channels/${channelId}/messages?limit=50`);
      setMessages((current) => {
        const map = new Map(current.map((message) => [message.id, message]));
        for (const message of data.items) map.set(message.id, message);
        return [...map.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    } catch {
      // silencieux pendant le polling
    }
  }, [channelId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selectImage(file: File | null) {
    if (!file) return;
    if (!CHAT_IMAGE_TYPES.includes(file.type)) {
      setError("Choisis une image JPEG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setError("L’image doit faire 3 Mo maximum.");
      return;
    }
    const url = URL.createObjectURL(file);
    setImage(file);
    setPreview(url);
    setError(null);
  }

  function clearImage() {
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function loadOlder() {
    if (messages.length === 0) return;
    setOlderLoading(true);
    try {
      const data = await apiFetch<{ items: ChatMessage[] }>(
        `/api/channels/${channelId}/messages?limit=50&before=${encodeURIComponent(messages[0].createdAt)}`,
      );
      setMessages((current) => {
        const map = new Map(current.map((message) => [message.id, message]));
        for (const message of data.items) map.set(message.id, message);
        return [...map.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de charger les anciens messages.");
    } finally {
      setOlderLoading(false);
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!contenu.trim() && !image) return;
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("contenu", contenu);
      if (image) body.append("image", image);
      if (replyTo) body.append("replyToId", replyTo.id);
      await apiFetch(`/api/channels/${channelId}/messages`, { method: "POST", body });
      setContenu("");
      clearImage();
      setReplyTo(null);
      await refresh();
      scrollToBottom();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’envoyer le message.");
    } finally {
      setLoading(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    setReactingId(null);
    setError(null);
    try {
      await apiFetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Réaction impossible.");
    }
  }

  async function remove(messageId: string) {
    if (!window.confirm("Supprimer ce message ?")) return;
    setError(null);
    try {
      await apiFetch(`/api/messages/${messageId}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    }
  }

  return (
    <div className="surface flex h-[calc(100dvh-12rem)] min-h-[28rem] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <h2 className="flex items-center gap-2 font-bold text-ink-950">
          <MessageCircle className="h-4 w-4 text-brand-700" aria-hidden />
          {channelName}
        </h2>
        <span className="text-xs text-ink-400">Actualisation automatique</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length >= 50 ? (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} loading={olderLoading}>
              Charger les messages précédents
            </Button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">Aucun message. Lance la conversation !</p>
        ) : (
          messages.map((message) => {
            const name = message.author.student
              ? `${message.author.student.prenoms} ${message.author.student.nom}`
              : message.author.role === "STUDENT"
                ? "Étudiant"
                : "Équipe BDE";
            const mine = message.author.id === currentUser.id;
            const grouped = new Map<string, { count: number; mine: boolean }>();
            for (const reaction of message.reactions) {
              const current = grouped.get(reaction.emoji) ?? { count: 0, mine: false };
              grouped.set(reaction.emoji, {
                count: current.count + 1,
                mine: current.mine || reaction.userId === currentUser.id,
              });
            }
            return (
              <article key={message.id} className="flex gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                  {message.author.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={message.author.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(name)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">{name}</span>
                    {message.author.role !== "STUDENT" ? (
                      <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">BDE</span>
                    ) : null}
                    <time className="text-[11px] text-ink-400" dateTime={message.createdAt}>
                      {formatDateTime(message.createdAt)}
                    </time>
                  </div>
                  {message.replyTo ? (
                    <p className="mt-1 border-l-2 border-ink-200 pl-2 text-xs text-ink-500">
                      Réponse à{" "}
                      {message.replyTo.author.student
                        ? `${message.replyTo.author.student.prenoms} ${message.replyTo.author.student.nom}`
                        : "un message"}
                      {" : "}
                      {message.replyTo.deletedAt ? "message supprimé" : message.replyTo.contenu?.slice(0, 80) ?? "image"}
                    </p>
                  ) : null}
                  {message.deletedAt ? (
                    <p className="mt-1 text-sm italic text-ink-400">Message supprimé.</p>
                  ) : (
                    <>
                      {message.contenu ? (
                        <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink-700">{message.contenu}</p>
                      ) : null}
                      {message.imageUrl ? (
                        <a href={message.imageUrl} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={message.imageUrl} alt="Image envoyée dans le chat" loading="lazy" className="mt-2 max-h-72 rounded-xl border border-ink-100 object-contain" />
                        </a>
                      ) : null}
                    </>
                  )}

                  {!message.deletedAt ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {[...grouped.entries()].map(([emoji, info]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => react(message.id, emoji)}
                          className={`rounded-full border px-1.5 py-0.5 text-xs ${info.mine ? "border-brand-300 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-600"}`}
                        >
                          {emoji} {info.count}
                        </button>
                      ))}
                      <button type="button" onClick={() => setReactingId(reactingId === message.id ? null : message.id)} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700" aria-label="Réagir">
                        <Smile className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      {!readOnly ? (
                        <button type="button" onClick={() => setReplyTo(message)} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700">
                          <Reply className="h-3.5 w-3.5" aria-hidden />
                          Répondre
                        </button>
                      ) : null}
                      {mine || canModerate ? (
                        <button type="button" onClick={() => remove(message.id)} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Supprimer
                        </button>
                      ) : null}
                      <ReportButton targetType="MESSAGE" targetId={message.id} />
                    </div>
                  ) : null}

                  {reactingId === message.id ? (
                    <div className="mt-1 flex gap-1 rounded-full border border-ink-200 bg-white p-1">
                      {EMOJIS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => react(message.id, emoji)} className="rounded-full px-2 py-1 text-base hover:bg-ink-50" aria-label={`Réagir ${emoji}`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-ink-100 bg-white p-3">
        {error ? <div className="mb-2"><Alert variant="error">{error}</Alert></div> : null}
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-ink-50 px-2 py-1 text-xs text-ink-600">
            <span className="truncate">Réponse à {replyTo.author.student ? `${replyTo.author.student.prenoms} ${replyTo.author.student.nom}` : "un message"}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Annuler la réponse"><X className="h-3.5 w-3.5" aria-hidden /></button>
          </div>
        ) : null}
        {readOnly ? (
          <p className="py-2 text-center text-sm text-ink-500">Ce canal est en lecture seule.</p>
        ) : (
          <form
            onSubmit={send}
            className="space-y-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) selectImage(file);
            }}
          >
            {preview && image ? (
              <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Aperçu de l’image à envoyer"
                  className="h-16 w-16 rounded-lg border border-ink-100 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-800">{image.name}</p>
                  <p className="text-[11px] text-ink-500">
                    {Math.max(1, Math.round(image.size / 1024))} Ko · prête à envoyer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="rounded-lg p-1.5 text-ink-500 hover:bg-white hover:text-red-700"
                  aria-label="Retirer l’image"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-50"
                aria-label="Joindre une image"
                title="Joindre une photo (3 Mo maximum)"
              >
                <ImagePlus className="h-5 w-5" aria-hidden />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
              />
              <textarea
                value={contenu}
                onChange={(event) => setContenu(event.target.value)}
                onPaste={(event) => {
                  const file = Array.from(event.clipboardData.files)[0];
                  if (file) {
                    event.preventDefault();
                    selectImage(file);
                  }
                }}
                rows={1}
                maxLength={3000}
                placeholder={image ? "Ajouter une légende (optionnel)…" : "Écris un message…"}
                className="max-h-32 min-h-10 flex-1 resize-y rounded-xl border border-ink-200 px-3 py-2 text-sm"
                aria-label="Message"
              />
              <Button type="submit" size="icon" loading={loading} disabled={!contenu.trim() && !image} aria-label="Envoyer">
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="pl-10 text-[11px] text-ink-400">
              Photo JPEG, PNG, WebP ou GIF · 3 Mo maximum. Tu peux aussi la glisser ou la coller.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
