import { prisma } from "@/lib/prisma";
import { icsEscape, toIcsDate } from "@/server/services/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return new Response("Événement introuvable", { status: 404 });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BDE//Programme//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@bde.local`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.debut)}`,
    `DTEND:${toIcsDate(event.fin)}`,
    `SUMMARY:${icsEscape(event.titre)}`,
    `LOCATION:${icsEscape(event.lieu)}`,
    `DESCRIPTION:${icsEscape(event.description)}`,
    `URL:${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/programme/${event.id}`,
    ...(event.annuleLe ? ["STATUS:CANCELLED"] : ["STATUS:CONFIRMED"]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="evenement-${event.id}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
