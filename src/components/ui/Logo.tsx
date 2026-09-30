import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  href?: string;
}

export function Logo({ size = "md", showTagline = false, href }: LogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const content = (
    <div className="flex items-center gap-2.5 select-none group">
      {/* Abstract Civic Infrastructure & AI Grid Emblem (Geometric Node Matrix) */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border border-blue-500/30 shadow-sm shadow-blue-500/10 group-hover:border-blue-400/50 transition-colors`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5/6 h-5/6 text-blue-400 stroke-current"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Civic Grid Nodes & Interconnected Data Bridges */}
          <rect x="3" y="3" width="7" height="7" rx="1.5" className="fill-blue-500/20" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" className="fill-blue-500/10" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" className="fill-cyan-500/20" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" className="fill-indigo-500/10" />
          {/* Neural Synapse & Geospatial Nexus Center */}
          <circle cx="12" cy="12" r="2" className="fill-blue-400 text-blue-300" />
          <path d="M10 6.5h4M17.5 10v4M14 17.5h-4M6.5 14v-4" strokeDasharray="1 1.5" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className={`font-semibold tracking-tight text-white flex items-center gap-1.5 ${textSizes[size]}`}>
          <span>AI CivicEye</span>
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
            OPS
          </span>
        </div>
        {showTagline && (
          <span className="text-xs text-slate-400 font-normal">
            Intelligent Civic Complaint & Prioritization System
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="inline-block">{content}</Link>;
  }

  return content;
}
