import React from "react";
import { ComplaintStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] || status;
  const colors = STATUS_COLORS[status] || {
    bg: "bg-slate-900",
    text: "text-slate-300",
    border: "border-slate-800",
  };

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5"
      : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
