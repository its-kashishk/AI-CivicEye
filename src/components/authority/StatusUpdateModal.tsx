"use client";

import React, { useState } from "react";
import { ComplaintStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";
import { api } from "@/lib/api/client";
import { X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface StatusUpdateModalProps {
  complaintId: string;
  currentStatus: ComplaintStatus;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedStatus: ComplaintStatus, historyEntry: unknown) => void;
}

const ALLOWED_STATUSES: ComplaintStatus[] = [
  "SUBMITTED",
  "ANALYZED",
  "ROUTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "REJECTED",
  "DUPLICATE_MERGED",
];

export function StatusUpdateModal({
  complaintId,
  currentStatus,
  isOpen,
  onClose,
  onSuccess,
}: StatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    currentStatus === "SUBMITTED"
      ? "ACKNOWLEDGED"
      : currentStatus === "ACKNOWLEDGED"
      ? "IN_PROGRESS"
      : currentStatus === "IN_PROGRESS"
      ? "RESOLVED"
      : currentStatus
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.complaints.updateStatus(complaintId, {
        status: selectedStatus,
        note: note.trim() || undefined,
      });

      onSuccess(res.status, res.status_history_entry);
      onClose();
    } catch (err: unknown) {
      console.error("Status update error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to update complaint status.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">
              Update Lifecycle Status
            </h3>
            <p className="text-xs text-slate-400">
              Complaint ID: <span className="font-mono text-blue-400">{complaintId.slice(0, 8)}...</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Status Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Select New Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as ComplaintStatus)
              }
              className="w-full text-xs bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {ALLOWED_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]} {st === currentStatus ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution / Update Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Operational Note / Resolution Summary
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Field inspection completed. Pothole filled and sealed with quick-curing bitumen asphalt."
              className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              <span>{loading ? "Updating..." : "Confirm Status Update"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
