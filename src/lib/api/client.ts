import {
  Complaint,
  CreateComplaintInput,
  CreateComplaintResponse,
  AIAnalysisPreviewResponse,
  DashboardOverviewResponse,
  DuplicateCluster,
  User,
  Department,
  Category,
  Severity,
  ComplaintStatus,
  PriorityLevel,
} from "../types";

export class ApiClientError extends Error {
  code: string;
  retryable: boolean;

  constructor(message: string, code = "UNKNOWN_ERROR", retryable = false) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.retryable = retryable;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorObj = data?.error;
    const message =
      errorObj?.message || `Request failed with status ${res.status}`;
    const code = errorObj?.code || "HTTP_ERROR";
    const retryable = Boolean(errorObj?.retryable || res.status >= 500);
    throw new ApiClientError(message, code, retryable);
  }

  return data as T;
}

export const api = {
  auth: {
    async me(): Promise<{ user: User | null }> {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      return handleResponse<{ user: User | null }>(res);
    },

    async login(body: {
      email: string;
      password?: string;
    }): Promise<{ user: User }> {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return handleResponse<{ user: User }>(res);
    },

    async register(body: {
      name?: string;
      email: string;
      password?: string;
      phone?: string;
      role?: string;
      departmentCode?: string;
    }): Promise<{ user: User }> {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return handleResponse<{ user: User }>(res);
    },

    async logout(): Promise<{ ok: boolean }> {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      return handleResponse<{ ok: boolean }>(res);
    },
  },

  complaints: {
    async list(params?: {
      mine?: boolean;
      status?: ComplaintStatus;
      category?: Category;
      severity?: Severity;
      department?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }): Promise<{
      items: Complaint[];
      page: number;
      pageSize: number;
      total: number;
    }> {
      const query = new URLSearchParams();
      if (params?.mine) query.set("mine", "true");
      if (params?.status) query.set("status", params.status);
      if (params?.category) query.set("category", params.category);
      if (params?.severity) query.set("severity", params.severity);
      if (params?.department) query.set("department", params.department);
      if (params?.search) query.set("search", params.search);
      if (params?.page) query.set("page", params.page.toString());
      if (params?.pageSize) query.set("pageSize", params.pageSize.toString());

      const url = `/api/complaints${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      return handleResponse<{
        items: Complaint[];
        page: number;
        pageSize: number;
        total: number;
      }>(res);
    },

    async get(id: string): Promise<Complaint> {
      const res = await fetch(`/api/complaints/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      return handleResponse<Complaint>(res);
    },

    async create(
      input: CreateComplaintInput
    ): Promise<CreateComplaintResponse> {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return handleResponse<CreateComplaintResponse>(res);
    },

    async analyze(
      input: CreateComplaintInput
    ): Promise<AIAnalysisPreviewResponse> {
      const res = await fetch("/api/complaints/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return handleResponse<AIAnalysisPreviewResponse>(res);
    },

    async uploadImage(file: File): Promise<{
      upload_id: string;
      cv_preview: { category: Category; confidence: number };
    }> {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/complaints/image", {
        method: "POST",
        body: formData,
      });
      return handleResponse<{
        upload_id: string;
        cv_preview: { category: Category; confidence: number };
      }>(res);
    },

    async uploadVoice(
      file?: File | Blob,
      clientTranscript?: string
    ): Promise<{
      upload_id: string;
      transcript: string;
      language: string;
    }> {
      const formData = new FormData();
      if (file) {
        formData.append("file", file, "voice.webm");
      }
      if (clientTranscript) {
        formData.append("client_transcript", clientTranscript);
      }
      const res = await fetch("/api/complaints/voice", {
        method: "POST",
        body: formData,
      });
      return handleResponse<{
        upload_id: string;
        transcript: string;
        language: string;
      }>(res);
    },

    async getPriority(params?: {
      department?: string;
      level?: PriorityLevel;
      page?: number;
      pageSize?: number;
    }): Promise<{
      items: Array<{
        id: string;
        text: string;
        category: Category;
        severity: Severity;
        status: ComplaintStatus;
        createdAt: string;
        department?: { code: string; name: string } | null;
        location?: { address?: string | null } | null;
        priority: {
          score: number;
          level: PriorityLevel;
          reasons: string[];
          signals?: Record<string, number>;
        };
        analysis?: {
          categoryConfidence: number;
          severityConfidence: number;
          explanation: string[];
        } | null;
      }>;
      total: number;
    }> {
      const query = new URLSearchParams();
      if (params?.department) query.set("department", params.department);
      if (params?.level) query.set("level", params.level);
      if (params?.page) query.set("page", params.page.toString());
      if (params?.pageSize) query.set("pageSize", params.pageSize.toString());

      const res = await fetch(
        `/api/complaints/priority${query.toString() ? `?${query.toString()}` : ""}`,
        { cache: "no-store" }
      );
      return handleResponse<{
        items: Array<{
          id: string;
          text: string;
          category: Category;
          severity: Severity;
          status: ComplaintStatus;
          createdAt: string;
          department?: { code: string; name: string } | null;
          location?: { address?: string | null } | null;
          priority: {
            score: number;
            level: PriorityLevel;
            reasons: string[];
            signals?: Record<string, number>;
          };
          analysis?: {
            categoryConfidence: number;
            severityConfidence: number;
            explanation: string[];
          } | null;
        }>;
        total: number;
      }>(res);
    },

    async getDuplicates(): Promise<{
      clusters: Array<{
        cluster_id: string;
        category: Category;
        size: number;
        created_at: string;
        representative: {
          id: string;
          text: string;
          status: ComplaintStatus;
          severity: Severity;
          created_at: string;
          location: string;
          department: string;
        } | null;
        member_ids: string[];
        members: Array<{
          id: string;
          text: string;
          status: ComplaintStatus;
          severity: Severity;
          created_at: string;
          location: string;
          department: string;
        }>;
      }>;
    }> {
      const res = await fetch("/api/complaints/duplicates", {
        cache: "no-store",
      });
      return handleResponse<{
        clusters: Array<{
          cluster_id: string;
          category: Category;
          size: number;
          created_at: string;
          representative: {
            id: string;
            text: string;
            status: ComplaintStatus;
            severity: Severity;
            created_at: string;
            location: string;
            department: string;
          } | null;
          member_ids: string[];
          members: Array<{
            id: string;
            text: string;
            status: ComplaintStatus;
            severity: Severity;
            created_at: string;
            location: string;
            department: string;
          }>;
        }>;
      }>(res);
    },

    async updateStatus(
      id: string,
      body: { status: ComplaintStatus; note?: string }
    ): Promise<{
      id: string;
      status: ComplaintStatus;
      updated_at: string;
      status_history_entry: {
        id: string;
        fromStatus: ComplaintStatus | null;
        toStatus: ComplaintStatus;
        note: string | null;
        changedByName: string | null;
        createdAt: string;
      };
    }> {
      const res = await fetch(
        `/api/complaints/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      return handleResponse<{
        id: string;
        status: ComplaintStatus;
        updated_at: string;
        status_history_entry: {
          id: string;
          fromStatus: ComplaintStatus | null;
          toStatus: ComplaintStatus;
          note: string | null;
          changedByName: string | null;
          createdAt: string;
        };
      }>(res);
    },
  },

  dashboard: {
    async getOverview(): Promise<DashboardOverviewResponse> {
      const res = await fetch("/api/dashboard/overview", {
        cache: "no-store",
      });
      return handleResponse<DashboardOverviewResponse>(res);
    },
  },

  departments: {
    async list(): Promise<{ departments: Department[] }> {
      const res = await fetch("/api/departments", { cache: "no-store" });
      return handleResponse<{ departments: Department[] }>(res);
    },
  },
};
