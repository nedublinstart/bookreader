"use client";

import type { PaceStatus } from "@/lib/reading";
import { paceLabel } from "@/lib/reading";

const styles: Record<PaceStatus, string> = {
  ahead: "bg-[rgba(47,125,74,0.12)] text-good",
  on_track: "bg-[rgba(31,111,99,0.12)] text-teal-deep",
  behind: "bg-[rgba(196,122,29,0.14)] text-amber",
  overdue: "bg-[rgba(177,67,74,0.14)] text-rose",
  done: "bg-[rgba(21,32,40,0.06)] text-ink-soft",
};

export function PaceBadge({ status }: { status: PaceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${styles[status]}`}
    >
      {paceLabel(status)}
    </span>
  );
}
