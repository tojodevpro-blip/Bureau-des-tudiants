"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/site/report-button";
import { initials } from "@/lib/utils";

type CommentItem = {
  id: string;
  contenu: string;
  createdAt: string;
  deletedAt: string | null;
  author: {
    id: string;
    photoUrl: string | null;
    role: string;
    student: { prenoms: string; nom: string } | null;
  };
};

export function Comments({
  targetType,
  targetId,
  items,
  currentUserId,
  canModerate,
  canWrite,
}: {
  targetType: "ANNONCE" | "EVENEMENT";
  targetId: string;
  items: CommentItem[];
  currentUserId: string | null;
  canModerate: boolean;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [contenu, setContenu] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!contenu.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/comments", {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, contenu }),
      });
      setContenu("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’envoyer le commentaire.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    setError(null);
    try {
      await apiFetch(`/api/comments/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de supprimer le commentaire.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="surface p-5" aria-labelledby="comments-title">
      <h2 id="comments-title" className="flex items-center gap-2 text-lg font-bold text-ink-950">
        <MessageSquare className="h-5 w-5 text-brand-700" aria-hidden />
        Commentaires ({items.filter((item) => !item.deletedAt).length})
      </h2>

      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-ink-500">Aucun commentaire pour le moment.</p>
        ) : (
          items.map((item) => {
            const name = item.author.student
              ? `${item.author.student.prenoms} ${item.author.student.nom}`
              : item.author.role === "STUDENT"
                ? "Compte supprimé"
                : "Équipe BDE";
            return (
              <article key={item.id} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                  {item.author.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.author.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(name)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">{name}</span>
                    {item.author.role !== "STUDENT" ? (
                      <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">BDE</span>
                    ) : null}
                    <time className="text-[11px] text-ink-400" dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </time>
                  </div>
                  {item.deletedAt ? (
                    <p className="mt-1 text-sm italic text-ink-400">Commentaire supprimé.</p>
                  ) : (
                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink-700">{item.contenu}</p>
                  )}
                  {!item.deletedAt && currentUserId ? (
                    <div className="mt-1 flex items-center gap-3">
                      {(canModerate || item.author.id === currentUserId) ? (
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          disabled={deleting === item.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Supprimer
                        </button>
                      ) : null}
                      <ReportButton targetType="COMMENTAIRE" targetId={item.id} />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {error ? <div className="mt-4"><Alert variant="error">{error}</Alert></div> : null}

      {canWrite ? (
        <form onSubmit={submit} className="mt-5 space-y-2 border-t border-ink-100 pt-4">
          <label htmlFor={`comment-${targetId}`} className="text-sm font-semibold text-ink-800">
            Ajouter un commentaire
          </label>
          <textarea
            id={`comment-${targetId}`}
            value={contenu}
            onChange={(event) => setContenu(event.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm"
            placeholder="Reste respectueux et constructif."
          />
          <Button type="submit" size="sm" loading={loading} disabled={!contenu.trim()}>
            <Send className="h-4 w-4" aria-hidden />
            Publier
          </Button>
        </form>
      ) : (
        <p className="mt-4 border-t border-ink-100 pt-4 text-sm text-ink-500">
          Connecte-toi avec un compte étudiant approuvé pour participer.
        </p>
      )}
    </section>
  );
}
