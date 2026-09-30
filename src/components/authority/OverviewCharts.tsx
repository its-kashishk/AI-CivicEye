import React from "react";
import { Category, Severity, ComplaintStatus } from "@/lib/types";
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { BarChart2, PieChart, Activity, TrendingUp } from "lucide-react";

interface OverviewChartsProps {
  byCategory: Array<{ category: Category; count: number }>;
  bySeverity: Array<{ severity: Severity; count: number }>;
  byStatus: Array<{ status: ComplaintStatus; count: number }>;
  volumeOverTime: Array<{ date: string; count: number }>;
}

export function OverviewCharts({
  byCategory = [],
  bySeverity = [],
  byStatus = [],
  volumeOverTime = [],
}: OverviewChartsProps) {
  const totalByCategory = byCategory.reduce((acc, cur) => acc + cur.count, 0);
  const totalBySeverity = bySeverity.reduce((acc, cur) => acc + cur.count, 0);
  const totalByStatus = byStatus.reduce((acc, cur) => acc + cur.count, 0);
  const maxVolume = Math.max(...volumeOverTime.map((v) => v.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Category Distribution */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Complaints by Civic Category
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {totalByCategory} Total
          </span>
        </div>

        {byCategory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No complaint category records available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {byCategory.map((item) => {
              const label = CATEGORY_LABELS[item.category] || item.category;
              const pct = totalByCategory > 0 ? Math.round((item.count / totalByCategory) * 100) : 0;

              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[220px]">
                      {label}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Severity Distribution */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Hazard Severity Breakdown
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {totalBySeverity} Total
          </span>
        </div>

        {bySeverity.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No severity data available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bySeverity.map((item) => {
              const label = SEVERITY_LABELS[item.severity] || item.severity;
              const pct = totalBySeverity > 0 ? Math.round((item.count / totalBySeverity) * 100) : 0;
              const colorClass =
                item.severity === "CRITICAL"
                  ? "bg-rose-500"
                  : item.severity === "HIGH"
                  ? "bg-amber-500"
                  : item.severity === "MEDIUM"
                  ? "bg-sky-500"
                  : "bg-emerald-500";

              return (
                <div key={item.severity} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{label}</span>
                    <span className="text-slate-400 font-mono">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Lifecycle Status Distribution */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Grievance Lifecycle Status
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {totalByStatus} Total
          </span>
        </div>

        {byStatus.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No lifecycle status data recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {byStatus.map((item) => (
              <div
                key={item.status}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between"
              >
                <span className="text-[11px] text-slate-400 truncate">
                  {STATUS_LABELS[item.status] || item.status}
                </span>
                <span className="text-base font-bold text-slate-200 mt-1 font-mono">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Intake Volume Over Time */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Intake Velocity (Daily Trend)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {volumeOverTime.length} Days Recorded
          </span>
        </div>

        {volumeOverTime.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No temporal intake records available yet.
          </div>
        ) : (
          <div className="h-40 flex items-end gap-2 pt-6">
            {volumeOverTime.map((item) => {
              const heightPct = Math.max(10, Math.round((item.count / maxVolume) * 100));

              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                >
                  <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count}
                  </span>
                  <div
                    className="w-full bg-blue-600 hover:bg-blue-500 rounded-t-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/20"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-full">
                    {item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
