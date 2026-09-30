import React from "react";
import { PriorityLevel } from "@/lib/types";
import { PRIORITY_COLORS } from "@/lib/constants";

interface PriorityBadgeProps {
  level: PriorityLevel;
  score?: number;
  size?: "sm" | "md";
}

export function PriorityBadge({
  level,
  score,
  size = "md",
}: PriorityBadgeProps) {
  const colors = PRIORITY_COLORS[level] || PRIORITY_COLORS.LOW;

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1.5"
      : "text-xs px-2.5 py-1 gap-2";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.bar}`} />
      <span>{level}</span>
      {score !== undefined && (
        <span className="text-[10px] font-mono opacity-80 px-1 py-0.2 rounded bg-black/30">
          {score}/100
        </span>
      )}
    </span>
  );
}
