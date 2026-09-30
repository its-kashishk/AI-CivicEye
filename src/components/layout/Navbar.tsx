"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "../ui/Logo";
import {
  FileText,
  Search,
  PlusCircle,
  Shield,
  User as UserIcon,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronDown,
  Activity,
  Layers,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/lib/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, switchDemoRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [trackSearchId, setTrackSearchId] = useState("");

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackSearchId.trim()) {
      router.push(`/citizen/complaints/${encodeURIComponent(trackSearchId.trim())}`);
      setTrackSearchId("");
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { href: "/citizen/dashboard", label: "Dashboard", icon: Activity },
    { href: "/citizen/complaints", label: "My Complaints", icon: FileText },
    { href: "/citizen/report", label: "Report Issue", icon: PlusCircle, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Logo href="/" size="md" />

        {/* Quick Track Input in Navbar (Desktop) */}
        <form
          onSubmit={handleQuickTrack}
          className="hidden md:flex items-center relative max-w-xs w-full"
        >
          <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Track complaint ID..."
            value={trackSearchId}
            onChange={(e) => setTrackSearchId(e.target.value)}
            className="w-full text-xs bg-slate-900/90 text-slate-200 placeholder-slate-500 pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </form>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all shadow-blue-600/20"
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {link.label}
              </Link>
            );
          })}

          <Link
            href="/authority/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-400 hover:bg-cyan-950/40 border border-cyan-800/40 transition-colors ml-1"
          >
            <Shield className="w-3.5 h-3.5" />
            Authority Portal
          </Link>
        </nav>

        {/* User Account / Role Switcher */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Quick Demo Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
              title="Switch demo persona for testing"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Role: {user ? ROLE_LABELS[user.role] : "Guest"}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {roleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-50 text-xs"
                onMouseLeave={() => setRoleDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Switch Active Role
                </div>
                {(["CITIZEN", "OPERATOR", "DEPT_OFFICER", "ADMIN"] as UserRole[]).map(
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

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 hidden md:inline truncate max-w-[120px]">
                {user.name || user.email}
              </span>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-3">
          <form onSubmit={handleQuickTrack} className="flex items-center relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Track complaint ID..."
              value={trackSearchId}
              onChange={(e) => setTrackSearchId(e.target.value)}
              className="w-full text-xs bg-slate-900 text-slate-200 pl-9 pr-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
            />
          </form>

          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    pathname === link.href
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/authority/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-cyan-400 hover:bg-cyan-950/40"
            >
              <Shield className="w-4 h-4" />
              Authority Portal
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Role: <span className="font-semibold text-slate-200">{user ? ROLE_LABELS[user.role] : "Guest"}</span>
            </div>
            {user ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
