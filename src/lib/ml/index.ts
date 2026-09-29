// Selects the ML adapter. ML_MODE = mock | http | disabled
// (default: 'http' if ML_SERVICE_URL is set, otherwise 'mock').
//   mock     -> MockMlClient (rule-based stub, clearly flagged as mock everywhere)
//   http     -> HttpMlClient (real FastAPI ML service)
//   disabled -> every call raises MlUnavailableError (exercises the fail-safe path)
import { config } from "@/lib/config";
import { HttpMlClient } from "@/lib/ml/http-client";
import { MockMlClient } from "@/lib/ml/mock-client";
import { type MlClient, MlUnavailableError } from "@/lib/ml/types";

class DisabledMlClient implements MlClient {
  readonly provider = "MOCK" as const;
  private fail(): never {
    throw new MlUnavailableError("ML analysis is disabled (ML_MODE=disabled)");
  }
  classifyText = async () => this.fail();
  classifyImage = async () => this.fail();
  findDuplicates = async () => this.fail();
  predictSeverity = async () => this.fail();
  computePriority = async () => this.fail();
}

let override: MlClient | null = null;

/** Test hook: inject a custom client (e.g. one that always fails). Pass null to reset. */
export function setMlClientForTests(client: MlClient | null) {
  override = client;
}

export function getMlClient(): MlClient {
  if (override) return override;
  switch (config.mlMode()) {
    case "http":
      return new HttpMlClient();
    case "disabled":
      return new DisabledMlClient();
    default:
      return new MockMlClient();
  }
}

export * from "@/lib/ml/types";
