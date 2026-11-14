import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "@fontsource-variable/inter";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { getBranding } from "@/lib/branding";
import { isMaintenanceEnabled } from "@/lib/maintenance";

const MAINTENANCE_ALLOWED_PATHS = new Set([
  "/maintenance",
  "/connexion",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
  "/statut",
  "/confidentialite",
  "/conditions",
  "/mentions-legales",
]);

function maintenanceAllowed(pathname: string) {
  return (
    MAINTENANCE_ALLOWED_PATHS.has(pathname) ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js"
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: {
      default: `${branding.name} — Plateforme officielle`,
      template: `%s · ${branding.shortName}`,
    },
    description: `${branding.name} : annonces, programme, demandes, archives et vie de la communauté étudiante. ${branding.tagline}`,
    applicationName: branding.shortName,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: { capable: true, statusBarStyle: "default", title: branding.shortName },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#106953",
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-bde-pathname") ?? "";

  if (pathname && !maintenanceAllowed(pathname) && (await isMaintenanceEnabled())) {
    redirect("/maintenance");
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('bde-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-dvh">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
