import { Alert, Patient, Resource, Staff } from "@/types";

type HospitalDataPayload = {
  patients: Patient[];
  resources: Resource[];
  staff: Staff[];
  alerts: Alert[];
};

export type AdminAssistantResult = {
  answer: string;
  predictions: {
    metrics: {
      currentBedUtilization: number;
      currentIcuUtilization: number;
      currentOxygenUtilization: number;
      projectedAdmissionsNext7: number;
      projectedRespiratoryNext7: number;
      projectedBedDemand: number;
      projectedIcuDemand: number;
      projectedOxygenDemand: number;
      admissionsGrowthPct: number;
      respiratoryGrowthPct: number;
      openAlerts: number;
      activePatients: number;
    };
    generatedAlerts: Array<{
      severity: "warning" | "critical" | "info";
      title: string;
      message: string;
    }>;
  };
  sources: Array<{
    id: string;
    title: string;
    text: string;
    category: string;
    score: number;
  }>;
};

export async function getAdminAssistantHealth() {
  const response = await fetch("/api/health");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to reach the RAG server.");
  }

  return data as { ok: boolean; ready: boolean; missing: string[] };
}

export async function askAdminAssistant(
  question: string,
  hospitalData: HospitalDataPayload,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
) {
  const response = await fetch("/api/ask-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      hospitalData,
      history,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data.missing?.length ? ` Missing: ${data.missing.join(", ")}.` : "";
    throw new Error((data.error || "Failed to generate the admin recommendation.") + detail);
  }

  return data as AdminAssistantResult;
}
