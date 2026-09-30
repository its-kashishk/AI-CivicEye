"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/lib/types";
import {
  Layers,
  ChevronDown,
  LogOut,
  Radio,
} from "lucide-react";

interface AuthorityHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AuthorityHeader({
  title = "Operations Center",
  subtitle,
}: AuthorityHeaderProps) {
  const { user, logout, switchDemoRole } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-md px-6 flex items-center justify-between gap-4">
      {/* Title / Breadcrumb */}
      <div>
        <h1 className="text-base font-semibold text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>
        )}
      </div>

      {/* Actions & Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Live System Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-400 font-mono">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>AI Engine Active</span>
        </div>

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-medium transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Role: {user ? ROLE_LABELS[user.role] : "Operator"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {roleDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-50 text-xs"
              onMouseLeave={() => setRoleDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Authority Persona
              </div>
              {(["OPERATOR", "DEPT_OFFICER", "ADMIN", "CITIZEN"] as UserRole[]).map(
                (r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchDemoRole(r);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      user?.role === r ? "text-blue-400 font-semibold" : "text-slate-300"
                    }`}
                  >
                    <span>{ROLE_LABELS[r]}</span>
                    {user?.role === r && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Current User & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
              {user?.name || "Authority User"}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.email || "auth@civiceye.internal"}
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
