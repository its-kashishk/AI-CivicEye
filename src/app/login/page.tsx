"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/ui/Logo";
import {
  LogIn,
  AlertCircle,
  RefreshCw,
  User,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { UserRole } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { login, switchDemoRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password || "password123");
      if (user.role === "CITIZEN") {
        router.push("/citizen/dashboard");
      } else {
        router.push("/authority/dashboard");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      const msg = err instanceof Error ? err.message : "Failed to sign in.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo href="/" size="lg" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Sign In to AI CivicEye
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Access citizen tracking or authority command center
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-8 rounded-2xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@civiceye.internal"
                className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? "Authenticating..." : "Sign In"}</span>
            </button>
          </form>

          {/* Quick Demo Personas */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>1-Click Demo Evaluation Profiles</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => switchDemoRole("CITIZEN")}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-blue-400">
                  Citizen
                </div>
                <div className="text-[10px] text-slate-400">Filing & tracking</div>
              </button>

              <button
                type="button"
                onClick={() => switchDemoRole("OPERATOR")}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-blue-400">
                  Triage Operator
                </div>
                <div className="text-[10px] text-slate-400">Priority triage</div>
              </button>

              <button
                type="button"
                onClick={() => switchDemoRole("DEPT_OFFICER")}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-blue-400">
                  Roads Officer
                </div>
                <div className="text-[10px] text-slate-400">Status updates</div>
              </button>

              <button
                type="button"
                onClick={() => switchDemoRole("ADMIN")}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-blue-400">
                  City Admin
                </div>
                <div className="text-[10px] text-slate-400">Analytics & clusters</div>
              </button>
            </div>
          </div>

          <div className="pt-2 text-center text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-400 hover:text-blue-300"
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
