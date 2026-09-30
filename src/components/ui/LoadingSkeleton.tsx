import React from "react";

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-800/60 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <LoadingSkeleton className="h-5 w-32" />
        <LoadingSkeleton className="h-5 w-20 rounded-full" />
      </div>
      <LoadingSkeleton className="h-4 w-3/4" />
      <LoadingSkeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <LoadingSkeleton className="h-4 w-24" />
        <LoadingSkeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <LoadingSkeleton className="h-5 w-40" />
        <LoadingSkeleton className="h-8 w-48 rounded-lg" />
      </div>
      <div className="divide-y divide-slate-800/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <LoadingSkeleton className="h-4 w-48" />
              <LoadingSkeleton className="h-3.5 w-72" />
            </div>
            <LoadingSkeleton className="h-6 w-20 rounded-full" />
            <LoadingSkeleton className="h-6 w-24 rounded-md" />
            <LoadingSkeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
