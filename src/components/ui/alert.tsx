import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "error";

const styles: Record<Variant, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-900",
    icon: <Info className="h-5 w-5 shrink-0 text-sky-600" aria-hidden />,
  },
  success: {
    wrapper: "border-brand-200 bg-brand-50 text-brand-900",
    icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />,
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />,
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-900",
    icon: <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />,
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: Variant;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const style = styles[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", style.wrapper, className)}
    >
      {style.icon}
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
