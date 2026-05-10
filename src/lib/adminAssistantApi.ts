import { Alert, Patient, Resource, Staff } from "@/types";
import { askAdminQuestion } from "@/lib/adminRag";
import { calculateForecastMetrics, generateOperationalAlerts } from "@/lib/hospitalInsights";
import { isGeminiConfigured, missingGeminiEnvKeys } from "@/lib/gemini";

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
  return {
    ok: true,
    ready: isGeminiConfigured,
    missing: missingGeminiEnvKeys,
  };
}

export async function askAdminAssistant(
  question: string,
  hospitalData: HospitalDataPayload,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
) {
  const metrics = calculateForecastMetrics(hospitalData.patients, hospitalData.resources, hospitalData.staff);
  const generatedAlerts = generateOperationalAlerts(
    hospitalData.patients,
    hospitalData.resources,
    hospitalData.staff,
    hospitalData.alerts,
  )
    .filter((alert) => alert.source === "generated")
    .map((alert) => ({
      severity: alert.type,
      title: alert.title,
      message: alert.message,
    }));

  const result = await askAdminQuestion(question, hospitalData, history);

  return {
    answer: result.answer,
    predictions: {
      metrics: {
        currentBedUtilization: metrics.bedUtilization,
        currentIcuUtilization: metrics.icuUtilization,
        currentOxygenUtilization: metrics.oxygenUtilization,
        projectedAdmissionsNext7: metrics.projectedAdmissionsNext7,
        projectedRespiratoryNext7: metrics.projectedRespiratoryNext7,
        projectedBedDemand: metrics.projectedBedDemand,
        projectedIcuDemand: metrics.projectedIcuDemand,
        projectedOxygenDemand: metrics.projectedOxygenDemand,
        admissionsGrowthPct: metrics.admissionsGrowthPct,
        respiratoryGrowthPct: metrics.respiratoryGrowthPct,
        openAlerts: hospitalData.alerts.filter((alert) => !alert.acknowledged).length,
        activePatients: metrics.activePatients,
      },
      generatedAlerts,
    },
    sources: result.sources,
  } satisfies AdminAssistantResult;
}
