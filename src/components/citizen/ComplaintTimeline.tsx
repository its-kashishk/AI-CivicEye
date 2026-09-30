import React from "react";
import { ComplaintStatus, ComplaintStatusHistoryItem } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface ComplaintTimelineProps {
  currentStatus: ComplaintStatus;
  history?: ComplaintStatusHistoryItem[];
}

export function ComplaintTimeline({
  currentStatus,
  history = [],
}: ComplaintTimelineProps) {
  // Determine active step index in canonical progression
  const currentStepIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-6">
      {/* Visual Step Tracker (Desktop) */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          {STATUS_ORDER.map((step, idx) => {
            const isCompleted =
              currentStepIndex >= 0 && idx <= currentStepIndex;
            const isCurrent = step === currentStatus;

            return (
              <div
                key={step}
                className="relative z-10 flex flex-col items-center group"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-md shadow-blue-500/40"
                      : isCompleted
                      ? "bg-blue-900/60 text-blue-300 border border-blue-600/60"
                      : "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium mt-2 text-center max-w-[80px] leading-tight ${
                    isCurrent
                      ? "text-blue-400 font-semibold"
                      : isCompleted
                      ? "text-slate-300"
                      : "text-slate-400"
                  }`}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Event Log Entries */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4 md:p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Status Event Log</span>
        </h4>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No status transition logs recorded yet.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {history.map((item, idx) => (
              <div key={item.id || idx} className="relative group">
                {/* Node Dot */}
                <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-blue-500 shadow-sm" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <span>
                      {item.fromStatus
                        ? `${STATUS_LABELS[item.fromStatus]} → ${
                            STATUS_LABELS[item.toStatus]
                          }`
                        : STATUS_LABELS[item.toStatus]}
                    </span>
                    {item.changedByName && (
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        by {item.changedByName}
                      </span>
                    )}
                  </div>

                  <time className="text-[11px] text-slate-400 font-mono">
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>

                {item.note && (
                  <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                    {item.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
