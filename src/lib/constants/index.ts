import { Category, Severity, PriorityLevel, ComplaintStatus, UserRole } from "../types";

export const CATEGORY_LABELS: Record<Category, string> = {
  POTHOLE_ROAD_DAMAGE: "Pothole / Road Damage",
  GARBAGE: "Solid Waste / Garbage Overflow",
  DRAINAGE_WATERLOGGING: "Drainage / Waterlogging",
  STREETLIGHT_FAILURE: "Streetlight / Electrical Failure",
  FALLEN_TREE: "Fallen Tree / Greenery Hazard",
  WATER_LEAKAGE: "Water Supply / Pipeline Leakage",
  OTHER: "General Civic Grievance",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "Low Severity",
  MEDIUM: "Medium Severity",
  HIGH: "High Severity",
  CRITICAL: "Critical Severity",
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  LOW: "Low Priority",
  MEDIUM: "Medium Priority",
  HIGH: "High Priority",
  CRITICAL: "Critical Priority",
};

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  ANALYZED: "AI Analyzed",
  ROUTED: "Routed to Dept",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  REJECTED: "Rejected",
  DUPLICATE_MERGED: "Merged Duplicate",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  CITIZEN: "Citizen",
  OPERATOR: "Municipal Operator",
  DEPT_OFFICER: "Department Officer",
  ADMIN: "City Administrator",
};

export const CANONICAL_DEPARTMENTS = [
  {
    code: "ROADS_MUNICIPAL_ENGINEERING",
    name: "Roads & Municipal Engineering",
    categories: ["POTHOLE_ROAD_DAMAGE", "OTHER"],
  },
  {
    code: "SOLID_WASTE_MANAGEMENT",
    name: "Solid Waste Management",
    categories: ["GARBAGE"],
  },
  {
    code: "STORM_WATER_DRAINAGE",
    name: "Storm Water & Drainage",
    categories: ["DRAINAGE_WATERLOGGING"],
  },
  {
    code: "ELECTRICAL_STREET_LIGHTING",
    name: "Electrical & Street Lighting",
    categories: ["STREETLIGHT_FAILURE"],
  },
  {
    code: "GARDENS_TREE_AUTHORITY",
    name: "Gardens & Tree Authority",
    categories: ["FALLEN_TREE"],
  },
  {
    code: "WATER_SUPPLY",
    name: "Water Supply & Sewerage",
    categories: ["WATER_LEAKAGE"],
  },
  {
    code: "GENERAL",
    name: "General Municipal Redressal",
    categories: ["OTHER"],
  },
];

export const STATUS_ORDER: ComplaintStatus[] = [
  "SUBMITTED",
  "ANALYZED",
  "ROUTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

// Tailwind color themes
export const SEVERITY_COLORS: Record<
  Severity,
  { bg: string; text: string; border: string; dot: string }
> = {
  LOW: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-800/60",
    dot: "bg-emerald-400",
  },
  MEDIUM: {
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    border: "border-amber-800/60",
    dot: "bg-amber-400",
  },
  HIGH: {
    bg: "bg-orange-950/40",
    text: "text-orange-400",
    border: "border-orange-800/60",
    dot: "bg-orange-400",
  },
  CRITICAL: {
    bg: "bg-rose-950/50",
    text: "text-rose-400",
    border: "border-rose-700/70",
    dot: "bg-rose-500 animate-pulse",
  },
};

export const PRIORITY_COLORS: Record<
  PriorityLevel,
  { bg: string; text: string; border: string; bar: string }
> = {
  LOW: {
    bg: "bg-slate-900/60",
    text: "text-slate-300",
    border: "border-slate-800",
    bar: "bg-slate-500",
  },
  MEDIUM: {
    bg: "bg-sky-950/40",
    text: "text-sky-300",
    border: "border-sky-800/60",
    bar: "bg-sky-500",
  },
  HIGH: {
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    border: "border-amber-800/60",
    bar: "bg-amber-500",
  },
  CRITICAL: {
    bg: "bg-rose-950/60",
    text: "text-rose-300",
    border: "border-rose-700/80",
    bar: "bg-rose-500",
  },
};

export const STATUS_COLORS: Record<
  ComplaintStatus,
  { bg: string; text: string; border: string }
> = {
  SUBMITTED: {
    bg: "bg-slate-900",
    text: "text-slate-300",
    border: "border-slate-700",
  },
  ANALYZED: {
    bg: "bg-indigo-950/50",
    text: "text-indigo-300",
    border: "border-indigo-800/60",
  },
  ROUTED: {
    bg: "bg-cyan-950/50",
    text: "text-cyan-300",
    border: "border-cyan-800/60",
  },
  ACKNOWLEDGED: {
    bg: "bg-blue-950/50",
    text: "text-blue-300",
    border: "border-blue-800/60",
  },
  IN_PROGRESS: {
    bg: "bg-amber-950/50",
    text: "text-amber-300",
    border: "border-amber-800/60",
  },
  RESOLVED: {
    bg: "bg-emerald-950/50",
    text: "text-emerald-300",
    border: "border-emerald-800/60",
  },
  CLOSED: {
    bg: "bg-slate-900/80",
    text: "text-slate-400",
    border: "border-slate-800",
  },
  REOPENED: {
    bg: "bg-violet-950/50",
    text: "text-violet-300",
    border: "border-violet-800/60",
  },
  REJECTED: {
    bg: "bg-zinc-900/80",
    text: "text-zinc-400",
    border: "border-zinc-800",
  },
  DUPLICATE_MERGED: {
    bg: "bg-purple-950/50",
    text: "text-purple-300",
    border: "border-purple-800/60",
  },
};
