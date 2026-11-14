import { cn } from "@/lib/utils";

function initials(shortName: string) {
  return shortName.trim().slice(0, 4).toUpperCase() || "BDE";
}

export function BrandMark({
  shortName,
  logoUrl,
  size = "md",
  className,
}: {
  shortName: string;
  logoUrl: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    sm: "h-8 w-8 rounded-lg text-[10px]",
    md: "h-10 w-10 rounded-xl text-xs",
    lg: "h-14 w-14 rounded-2xl text-sm",
  }[size];

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-brand-600 font-black tracking-tight text-white shadow-sm",
        dimensions,
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initials(shortName)
      )}
    </span>
  );
}
