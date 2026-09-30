import React from "react";
import { AIAnalysisPreviewResponse } from "@/lib/types";
import { CategoryBadge } from "../ui/CategoryBadge";
import { SeverityBadge } from "../ui/SeverityBadge";
import { PriorityBadge } from "../ui/PriorityBadge";
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Layers,
  HelpCircle,
  Copy,
  BrainCircuit,
  Sliders,
} from "lucide-react";

interface AIAnalysisCardProps {
  analysis: AIAnalysisPreviewResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function AIAnalysisCard({
  analysis,
  loading = false,
  error = null,
}: AIAnalysisCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-blue-900/40 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-blue-400">
          <BrainCircuit className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold tracking-wide uppercase">
            AI Decision Pipeline Analyzing Grievance...
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Extracting multimodal NLP features, estimating hazard severity, evaluating priority weights, and checking neighborhood duplicate clusters.
        </p>
        <div className="space-y-3 pt-2">
          <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-slate-800 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-slate-800 rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5">
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-semibold">AI Analysis Unavailable</span>
        </div>
        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
          The automated analysis service is currently experiencing high load. You can still proceed with your submission, and triage will be processed asynchronously.
        </p>
        <div className="text-[11px] text-amber-300 font-mono bg-amber-950/50 p-2 rounded border border-amber-900/40">
          Note: Your complaint data will not be lost.
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="rounded-xl border border-blue-900/50 bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:p-6 space-y-6 shadow-xl shadow-blue-950/20">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              AI Decision Assessment Preview
            </h3>
            <p className="text-[11px] text-slate-400">
              Verified decision-support suggestions prior to final dispatch
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Ready
        </span>
      </div>

      {/* Primary 3-Metric Assessment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Category */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Predicted Category
          </span>
          <div>
            <CategoryBadge category={analysis.category} size="md" />
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Confidence</span>
              <span className="text-blue-400 font-bold">
                {Math.round(analysis.category_confidence * 100)}%
              </span>
            </div>
            {/* Confidence Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(analysis.category_confidence * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. Severity */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Hazard Severity
          </span>
          <div>
            <SeverityBadge severity={analysis.severity} size="md" />
            <p className="text-[11px] text-slate-400 mt-3 leading-snug">
              Estimated physical risk & disruption level to urban infrastructure.
            </p>
          </div>
        </div>

        {/* 3. Priority */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Calculated Priority
          </span>
          <div>
            <PriorityBadge
              level={analysis.priority.level}
              score={analysis.priority.score}
              size="md"
            />
            {/* Priority Progress Meter */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  analysis.priority.score >= 75
                    ? "bg-rose-500"
                    : analysis.priority.score >= 50
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${analysis.priority.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Cluster Warning (if detected) */}
      {analysis.duplicate_preview.is_duplicate && (
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/50 flex items-start gap-3">
          <Copy className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-purple-200">
              Potential Duplicate Report Detected
            </h4>
            <p className="text-xs text-purple-300 leading-relaxed">
              Our spatial-semantic engine matched this report with{" "}
              <strong className="text-white">
                {analysis.duplicate_preview.similar_count} nearby existing complaint(s)
              </strong>
              . Your report will reinforce this cluster, increasing its triage urgency for field crews.
            </p>
          </div>
        </div>
      )}

      {/* Explainable Reasoning List */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Why AI Made This Decision (Explainability)</span>
        </h4>

        <ul className="space-y-2">
          {analysis.explanation.map((item, idx) => (
            <li
              key={idx}
              className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
              <span>{item}</span>
            </li>
          ))}

          {analysis.priority.reasons.map((reason, idx) => (
            <li
              key={`prio-${idx}`}
              className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 mt-1.5" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
