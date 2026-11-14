import "server-only";

import { createHmac } from "node:crypto";

type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  unsubscribeUrl?: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function unsubscribeSignature(userId: string) {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("hex");
}

export function unsubscribeUrl(userId: string) {
  const url = new URL("/api/notifications/unsubscribe", appUrl());
  url.searchParams.set("u", userId);
  url.searchParams.set("sig", unsubscribeSignature(userId));
  return url.toString();
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendEmail(input: EmailInput): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const unsubscribe =
    input.unsubscribeUrl ??
    `<p style="font-size:12px;color:#667085">Pour ne plus recevoir ces rappels, <a href="${appUrl()}/profil#notifications">gère tes préférences</a>.</p>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: `${input.html}${unsubscribe}`,
        text: input.text,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
