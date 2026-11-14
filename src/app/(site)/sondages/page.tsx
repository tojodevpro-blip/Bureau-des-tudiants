import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CheckCircle2 } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { listPollsForUser } from "@/server/services/polls";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Sondages" };
export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const user = await requireUserPage();
  if (user.role !== "STUDENT") redirect("/admin/sondages");
  await requireModule("sondages");
  const polls = await listPollsForUser({ id: user.id, classe: user.student?.classe ?? null });

  return (
    <div className="container-page py-10 sm:py-14">
      <p className="label-caps">Participation</p>
      <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
        <BarChart3 className="h-7 w-7 text-brand-700" aria-hidden />
        Sondages
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Donne ton avis sur la vie du BDE. Les sondages sont distincts de l’élection officielle.
      </p>

      {polls.length === 0 ? (
        <EmptyState className="mt-6" icon={<BarChart3 className="h-10 w-10" />} title="Aucun sondage" description="Aucun sondage ne concerne ta classe pour le moment." />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {polls.map((poll) => {
            const voted = poll.participations.length > 0;
            const open = poll.statut === "OUVERT";
            return (
              <Card key={poll.id}>
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={open ? "success" : "neutral"}>{open ? "Ouvert" : "Clôturé"}</Badge>
                    {voted ? <Badge variant="info"><CheckCircle2 className="h-3 w-3" aria-hidden /> Répondu</Badge> : null}
                    {poll.multiple ? <Badge variant="neutral">Choix multiples</Badge> : null}
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-ink-950">{poll.question}</h2>
                  {poll.description ? <p className="mt-1 line-clamp-2 text-sm text-ink-500">{poll.description}</p> : null}
                  <p className="mt-2 text-xs text-ink-400">
                    {poll._count.participations} participant(s)
                    {poll.closesAt ? ` · clôture ${formatDateTime(poll.closesAt)}` : ""}
                  </p>
                  <div className="mt-auto pt-4">
                    <Link href={`/sondages/${poll.id}`} className={buttonVariants({ variant: voted || !open ? "outline" : "primary", size: "sm" })}>
                      {voted ? "Voir ma réponse" : open ? "Participer" : "Voir les résultats"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
