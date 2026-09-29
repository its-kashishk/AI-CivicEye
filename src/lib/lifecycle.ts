// Complaint lifecycle — implements the state diagram in docs/04 §3.
//
//   SUBMITTED -> ANALYZED -> ROUTED -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED
//   RESOLVED -> REOPENED -> IN_PROGRESS ; SUBMITTED -> DUPLICATE_MERGED ; ANALYZED -> REJECTED
//
// SUBMITTED->ANALYZED and ANALYZED->ROUTED are SYSTEM transitions (AI pipeline / assignment).
// Everything else is a MANUAL transition performed by an authority user via PATCH .../status.
//
// Documented extension: because analysis + routing run inside the create request, REJECTED and
// DUPLICATE_MERGED are also allowed manually from ANALYZED/ROUTED (and REJECTED from SUBMITTED),
// otherwise an operator could never reject spam or confirm a duplicate once it is routed.
import type { ComplaintStatus } from "@/lib/enums";

export const SYSTEM_TRANSITIONS: Partial<Record<ComplaintStatus, ComplaintStatus[]>> = {
  SUBMITTED: ["ANALYZED"],
  ANALYZED: ["ROUTED"],
};

export const MANUAL_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ["REJECTED", "DUPLICATE_MERGED"],
  ANALYZED: ["REJECTED", "DUPLICATE_MERGED"],
  ROUTED: ["ACKNOWLEDGED", "REJECTED", "DUPLICATE_MERGED"],
  ACKNOWLEDGED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  CLOSED: [],
  REJECTED: [],
  DUPLICATE_MERGED: [],
};

export function canManualTransition(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return MANUAL_TRANSITIONS[from].includes(to);
}

/** Statuses that no longer belong in the open priority queue. */
export const INACTIVE_STATUSES: ComplaintStatus[] = [
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "DUPLICATE_MERGED",
];

/** Statuses in which the citizen/owner may still edit the complaint (before acknowledgement). */
export const EDITABLE_STATUSES: ComplaintStatus[] = ["SUBMITTED", "ANALYZED", "ROUTED"];
