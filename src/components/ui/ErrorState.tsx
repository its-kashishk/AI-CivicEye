import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We could not complete your request. Please try again.",
  code,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-xl bg-rose-950/20 border border-rose-800/40 p-6 md:p-8 flex flex-col items-center text-center my-4 ${className}`}
    >
      <div className="w-11 h-11 rounded-lg bg-rose-900/30 border border-rose-700/40 flex items-center justify-center text-rose-400 mb-3.5">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-rose-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-300 max-w-md mb-4 leading-relaxed">
        {message}
      </p>

      {code && (
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/50 text-rose-300 border border-rose-800/50 mb-4">
          Error Code: {code}
        </span>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Request
        </button>
      )}
    </div>
  );
}
