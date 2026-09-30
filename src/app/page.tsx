"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  FileText,
  Search,
  PlusCircle,
  Shield,
  BrainCircuit,
  Camera,
  Mic,
  MapPin,
  Flame,
  Copy,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [trackId, setTrackId] = useState("");

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) {
      router.push(`/citizen/complaints/${encodeURIComponent(trackId.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17]">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-800">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-xs text-blue-300 font-medium">
                <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />
                <span>Next-Generation Municipal Grievance Triage</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                AI-Powered Multimodal Decision Support for Civic Redressal
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                Report civic hazards with voice, photos, or text. AI CivicEye instantly classifies damage, assesses severity, eliminates duplicates, and assigns priority for rapid municipal response.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/citizen/report"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Report an Issue</span>
                </Link>

                <Link
                  href="/authority/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-medium text-sm transition-colors"
                >
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Authority Operations</span>
                </Link>
              </div>

              {/* Quick Complaint Tracking Bar */}
              <div className="pt-6 max-w-lg mx-auto">
                <form
                  onSubmit={handleTrackSubmit}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl focus-within:border-blue-500 transition-colors"
                >
                  <Search className="w-4 h-4 text-slate-500 ml-3" />
                  <input
                    type="text"
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    placeholder="Enter Complaint ID to track status..."
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 px-2 py-2 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors shrink-0"
                  >
                    Track
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step How It Works Workflow */}
        <section className="py-16 bg-slate-950/60 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
                Operational Lifecycle
              </h2>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                How AI CivicEye Operates
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 font-mono font-bold text-sm">
                  01
                </div>
                <h4 className="text-base font-semibold text-white">
                  Multimodal Intake
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Citizens submit grievances via voice recording, photo evidence, text description, or auto-captured GPS coordinates.
                </p>
                <div className="flex items-center gap-2 pt-2 text-slate-500 text-xs">
                  <Mic className="w-3.5 h-3.5" />
                  <Camera className="w-3.5 h-3.5" />
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm">
                  02
                </div>
                <h4 className="text-base font-semibold text-white">
                  AI Feature Fusion
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  NLP classifiers and CV defect models parse intent, classify municipal categories, and estimate physical hazard severity.
                </p>
                <div className="flex items-center gap-1.5 pt-2 text-indigo-400 text-xs font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>NLP + CV Models</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
                  03
                </div>
                <h4 className="text-base font-semibold text-white">
                  Priority & Clustering
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Multi-gate spatial deduplication merges duplicate complaints while calculating an explainable priority score (0–100).
                </p>
                <div className="flex items-center gap-2 pt-2 text-cyan-400 text-xs font-mono">
                  <Flame className="w-3.5 h-3.5" />
                  <Copy className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                  04
                </div>
                <h4 className="text-base font-semibold text-white">
                  Dispatch & Resolution
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automated routing dispatches tickets to the responsible department with live tracking and resolution notes.
                </p>
                <div className="flex items-center gap-1.5 pt-2 text-emerald-400 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Live Status Sync</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Citizen Benefits & Privacy Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Citizen Empowerment
                </h2>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Transparent, Trackable Civic Grievance Resolution
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Traditional civic portals swallow complaints into black boxes. AI CivicEye provides immediate visibility: understand how the AI ranked your report, monitor field officer acknowledgments, and verify status updates in real-time.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        Multi-Modal Flexibility
                      </h4>
                      <p className="text-xs text-slate-400">
                        Submit effortlessly using voice dictation, camera capture, or text.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        Explainable Priority & Duplicate Safety
                      </h4>
                      <p className="text-xs text-slate-400">
                        Duplicate reports boost the cluster priority without fragmenting city response teams.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        Full Auditability & Privacy
                      </h4>
                      <p className="text-xs text-slate-400">
                        Zero data fabrication; location and contact details protected by role-based access.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/citizen/report"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Start filing your grievance now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Card visual preview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono text-slate-400">
                    INCIDENT REPORT PREVIEW
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                    ROUTED
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Category</div>
                  <div className="text-sm font-semibold text-white">
                    Pothole / Road Damage
                  </div>
                  <div className="text-xs text-slate-400 pt-1">
                    Location: Western Expressway, Andheri East (GPS Verified)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Severity</span>
                    <div className="text-xs font-bold text-rose-400 mt-0.5">
                      CRITICAL (0.95 conf)
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      Priority Score
                    </span>
                    <div className="text-xs font-bold text-blue-400 mt-0.5">
                      84 / 100 (Critical)
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">
                    Assigned Department:
                  </div>
                  <div className="text-blue-400 font-medium">
                    Roads & Municipal Engineering
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#090D14] py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">AI CivicEye</span>
            <span>— Multimodal Civic Redressal Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/citizen/report" className="hover:text-slate-200">
              Report Issue
            </Link>
            <Link href="/citizen/complaints" className="hover:text-slate-200">
              Track Complaints
            </Link>
            <Link href="/authority/dashboard" className="hover:text-slate-200">
              Authority Command
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
