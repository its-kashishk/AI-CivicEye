"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../ui/Logo";
import {
  LayoutDashboard,
  Flame,
  FileSpreadsheet,
  Copy,
  MapPin,
  Building2,
  BarChart3,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/authority/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/authority/priority",
    label: "Priority Queue",
    icon: Flame,
    badge: "AI Scored",
  },
  {
    href: "/authority/complaints",
    label: "All Complaints",
    icon: FileSpreadsheet,
  },
  {
    href: "/authority/duplicates",
    label: "Duplicate Clusters",
    icon: Copy,
  },
  {
    href: "/authority/map",
    label: "Map / Hotspots",
    icon: MapPin,
  },
  {
    href: "/authority/departments",
    label: "Departments",
    icon: Building2,
  },
  {
    href: "/authority/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
];

export function AuthoritySidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0B0F17] border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <Logo href="/authority/dashboard" size="md" />
      </div>

      {/* Authority Mode Banner */}
      <div className="mx-4 my-3 p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/50 flex items-center gap-2 text-xs text-blue-300">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-medium">Command & Triage Center</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/authority/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-blue-400" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Switcher */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/citizen/dashboard"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch to Citizen View</span>
        </Link>
        <div className="text-[10px] text-slate-400 font-mono text-center">
          AI CivicEye Operations v2.4
        </div>
      </div>
    </aside>
  );
}
