import { timingSafeEqual } from "node:crypto";
import { unsubscribeSignature } from "@/lib/email";
import { setNotificationPreference } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const signature = url.searchParams.get("sig") ?? "";
  const expected = userId ? unsubscribeSignature(userId) : "";
  const valid =
    expected.length > 0 &&
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) {
    return new Response("Lien de désabonnement invalide.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  await setNotificationPreference(userId, false);
  return new Response(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Désabonnement</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:1rem"><h1>Désabonnement confirmé</h1><p>Tu ne recevras plus les notifications par e-mail. Tu peux réactiver ce réglage depuis ton profil.</p><p><a href="/profil#notifications">Gérer mes préférences</a></p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
