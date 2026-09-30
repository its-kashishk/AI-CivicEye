import React from "react";
import { Severity } from "@/lib/types";
import { SEVERITY_LABELS, SEVERITY_COLORS } from "@/lib/constants";

interface SeverityBadgeProps {
  severity: Severity;
  size?: "sm" | "md";
}

export function SeverityBadge({
  severity,
  size = "md",
}: SeverityBadgeProps) {
  const label = SEVERITY_LABELS[severity] || severity;
  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5"
      : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
}
