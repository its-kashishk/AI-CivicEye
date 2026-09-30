import React from "react";
import { Category } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  AlertTriangle,
  Trash2,
  Droplets,
  Lightbulb,
  Trees,
  Pipette,
  Layers,
} from "lucide-react";

interface CategoryBadgeProps {
  category: Category;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function CategoryBadge({
  category,
  size = "md",
  showIcon = true,
}: CategoryBadgeProps) {
  const label = CATEGORY_LABELS[category] || category;

  const getIcon = () => {
    const iconClass = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
    switch (category) {
      case "POTHOLE_ROAD_DAMAGE":
        return <AlertTriangle className={`${iconClass} text-amber-400`} />;
      case "GARBAGE":
        return <Trash2 className={`${iconClass} text-emerald-400`} />;
      case "DRAINAGE_WATERLOGGING":
        return <Droplets className={`${iconClass} text-cyan-400`} />;
      case "STREETLIGHT_FAILURE":
        return <Lightbulb className={`${iconClass} text-yellow-400`} />;
      case "FALLEN_TREE":
        return <Trees className={`${iconClass} text-lime-400`} />;
      case "WATER_LEAKAGE":
        return <Pipette className={`${iconClass} text-blue-400`} />;
      default:
        return <Layers className={`${iconClass} text-slate-400`} />;
    }
  };

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1.5"
      : "text-xs px-2.5 py-1 gap-2";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md bg-slate-900/90 text-slate-200 border border-slate-800 ${sizeClasses}`}
    >
      {showIcon && getIcon()}
      <span className="truncate max-w-[200px]">{label}</span>
    </span>
  );
}
