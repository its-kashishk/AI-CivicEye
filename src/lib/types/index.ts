export type Category =
  | "POTHOLE_ROAD_DAMAGE"
  | "GARBAGE"
  | "DRAINAGE_WATERLOGGING"
  | "STREETLIGHT_FAILURE"
  | "FALLEN_TREE"
  | "WATER_LEAKAGE"
  | "OTHER";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ComplaintStatus =
  | "SUBMITTED"
  | "ANALYZED"
  | "ROUTED"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "REJECTED"
  | "DUPLICATE_MERGED";

export type MediaType = "IMAGE" | "AUDIO";

export type UserRole = "CITIZEN" | "OPERATOR" | "DEPT_OFFICER" | "ADMIN";

export type AnalysisStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  departmentCode?: string | null;
  createdAt?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  defaultCategories?: string[];
  createdAt?: string;
}

export interface LocationData {
  id?: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  ward?: string | null;
  geohash?: string | null;
}

export interface ComplaintMediaItem {
  id: string;
  complaintId?: string;
  type: MediaType;
  storageKey: string;
  mime?: string | null;
  filename?: string | null;
  createdAt?: string;
}

export interface AIAnalysis {
  id?: string;
  complaintId?: string;
  status: AnalysisStatus;
  category: Category | null;
  categoryConfidence: number | null;
  severity: Severity | null;
  severityConfidence: number | null;
  cvResult?: Record<string, unknown> | null;
  nlpResult?: Record<string, unknown> | null;
  explanation: string[] | null;
  modelVersions?: Record<string, string> | null;
  createdAt?: string;
}

export interface PriorityAssessment {
  id?: string;
  complaintId?: string;
  score: number;
  level: PriorityLevel;
  signals?: Record<string, number> | null;
  reasons: string[] | null;
  weightsVersion?: string;
  createdAt?: string;
}

export interface ComplaintStatusHistoryItem {
  id: string;
  complaintId: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  note: string | null;
  changedBy: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface DuplicateCluster {
  id: string;
  category: Category;
  representativeComplaintId?: string | null;
  centroid?: { lat?: number; lng?: number } | null;
  size: number;
  createdAt?: string;
  representativeComplaint?: Complaint | null;
  memberComplaints?: Complaint[];
}

export interface Complaint {
  id: string;
  citizenId?: string | null;
  locationId?: string | null;
  text: string;
  categoryHint?: Category | null;
  category?: Category | null;
  severity?: Severity | null;
  urgency?: Severity | null;
  status: ComplaintStatus;
  departmentId?: string | null;
  clusterId?: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined relations
  citizen?: User | null;
  location?: LocationData | null;
  department?: Department | null;
  cluster?: DuplicateCluster | null;
  media?: ComplaintMediaItem[];
  analysis?: AIAnalysis | null;
  priority?: PriorityAssessment | null;
  statusHistory?: ComplaintStatusHistoryItem[];
}

export interface AIAnalysisPreviewResponse {
  category: Category;
  category_confidence: number;
  severity: Severity;
  severity_confidence?: number;
  priority: {
    score: number;
    level: PriorityLevel;
    reasons: string[];
    signals?: Record<string, number>;
  };
  duplicate_preview: {
    is_duplicate: boolean;
    cluster_id?: string | null;
    similar_count: number;
    similar_ids?: string[];
  };
  explanation: string[];
  suggested_department?: string;
}

export interface CreateComplaintInput {
  text: string;
  category_hint?: Category;
  urgency?: Severity;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
    ward?: string;
  };
  media?: Array<{
    type: MediaType;
    upload_id: string;
  }>;
}

export interface CreateComplaintResponse {
  id: string;
  status: ComplaintStatus;
  category: Category;
  severity: Severity;
  priority: {
    score: number;
    level: PriorityLevel;
    reasons: string[];
  };
  department: string;
  duplicate: {
    is_duplicate: boolean;
    cluster_id: string | null;
  };
}

export interface DashboardOverviewResponse {
  totals: {
    open: number;
    resolved: number;
    clusters: number;
    critical: number;
    total: number;
  };
  by_category: Array<{
    category: Category;
    count: number;
  }>;
  by_severity: Array<{
    severity: Severity;
    count: number;
  }>;
  by_status: Array<{
    status: ComplaintStatus;
    count: number;
  }>;
  volume_over_time: Array<{
    date: string;
    count: number;
  }>;
  top_hotspots: Array<{
    address: string;
    lat: number;
    lng: number;
    count: number;
    dominant_category: Category;
    severity: Severity;
  }>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}
