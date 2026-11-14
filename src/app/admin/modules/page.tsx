import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/guard";
import { getEnabledModules, MODULE_CATALOG, MODULE_KEYS } from "@/lib/modules";
import { getMaintenanceMessage, isMaintenanceEnabled } from "@/lib/maintenance";
import { ModuleSettings } from "@/components/admin/module-settings";

export const metadata: Metadata = { title: "Modules et maintenance" };
export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  await requireAdminPage();
  const [enabled, maintenance, message] = await Promise.all([
    getEnabledModules(),
    isMaintenanceEnabled(),
    getMaintenanceMessage(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps">Réglages</p>
        <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          Modules et maintenance
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Active ou désactive les modules complémentaires et prépare une interruption de service.
        </p>
      </div>
      <ModuleSettings
        catalog={MODULE_KEYS.map((key) => ({ key, ...MODULE_CATALOG[key] }))}
        enabled={[...enabled]}
        maintenance={maintenance}
        maintenanceMessage={message}
      />
    </div>
  );
}
