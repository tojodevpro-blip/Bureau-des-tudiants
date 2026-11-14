import { SiteFooter, SiteHeader } from "@/components/site/site-header";
import { getBranding } from "@/lib/branding";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  return (
    <div className="min-h-dvh bg-ink-50">
      <SiteHeader branding={branding} />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <SiteFooter branding={branding} />
      </div>
    </div>
  );
}
