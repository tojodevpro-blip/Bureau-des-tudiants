import {
  CalendarRange,
  Camera,
  CreditCard,
  Megaphone,
  MessageCircleQuestion,
  MessagesSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Modules à venir" };

const modules = [
  {
    icon: Megaphone,
    title: "Annonces du BDE",
    description: "Communiqués, événements et informations importantes publiés par l’équipe.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Questions & demandes",
    description: "Poser une question ou envoyer une demande directement à l’administration.",
  },
  {
    icon: Camera,
    title: "Archive photos",
    description: "Retrouver les photos des événements et activités du Bureau des Étudiants.",
  },
  {
    icon: CalendarRange,
    title: "Programme & agenda",
    description: "Calendrier des activités, réunions et temps forts de l’année.",
  },
  {
    icon: CreditCard,
    title: "Paiement des cotisations",
    description: "Régler les cotisations via Mvola, Orange Money ou Airtel Money selon faisabilité.",
  },
  {
    icon: MessagesSquare,
    title: "Messagerie",
    description: "Échanger avec l’équipe du BDE dans un espace sécurisé.",
  },
];

export default function ComingSoonPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="max-w-2xl space-y-2">
        <Badge variant="info">Phase 2</Badge>
        <h1 className="text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
          Les prochains modules du BDE
        </h1>
        <p className="text-sm leading-relaxed text-ink-500">
          L’élection et l’inscription sont livrées en priorité. L’architecture est déjà
          préparée pour accueillir ces services après le scrutin, sans refonte.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardContent className="space-y-3 p-5">
              <span className="inline-flex rounded-xl bg-ink-100 p-2.5 text-ink-600">
                <module.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold text-ink-950">{module.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {module.description}
                </p>
              </div>
              <Badge>Bientôt disponible</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
