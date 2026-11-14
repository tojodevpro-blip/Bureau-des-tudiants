import { ProgressBar } from "@/components/ui/empty-state";

export function PollResults({
  options,
  participations,
}: {
  options: { id: string; label: string; votes: number }[];
  participations: number;
}) {
  const total = options.reduce((sum, option) => sum + option.votes, 0);
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-ink-500">
        {participations} participant(s) · {total} voix exprimée(s)
      </p>
      <div className="space-y-3">
        {options.map((option) => {
          const percent = total > 0 ? (option.votes / total) * 100 : 0;
          return (
            <div key={option.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink-800">{option.label}</span>
                <span className="shrink-0 text-xs text-ink-500">
                  {option.votes} · {percent.toFixed(1).replace(".", ",")} %
                </span>
              </div>
              <ProgressBar value={percent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
