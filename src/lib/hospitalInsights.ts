import { Alert, Patient, PatientHistoryEntry, Resource, ResourceHistoryEntry, Staff } from "@/types";

type Severity = "warning" | "critical" | "info";

export type GeneratedAlert = {
  id: string;
  type: Severity;
  title: string;
  message: string;
  department?: string;
  source: "generated" | "firebase";
  acknowledged?: boolean;
};

type ForecastMetrics = {
  activePatients: number;
  icuPatients: number;
  respiratoryPatients: number;
  doctors: number;
  nurses: number;
  bedUtilization: number;
  icuUtilization: number;
  oxygenUtilization: number;
  projectedAdmissionsNext7: number;
  projectedBedDemand: number;
  projectedIcuDemand: number;
  projectedOxygenDemand: number;
  admissionsGrowthPct: number;
  respiratoryGrowthPct: number;
};

function parseDate(dateValue?: Date | string | null) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  return next;
}

function formatWeekLabel(date: Date) {
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${month} ${date.getDate()}`;
}

function getPatientDate(patient: Patient) {
  return parseDate(patient.createdAt) || parseDate(patient.date);
}

export function getResourceByName(resources: Resource[], names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  return resources.find((resource) => normalizedNames.includes(String(resource.name || "").toLowerCase()));
}

export function getUtilization(resource?: Resource) {
  if (!resource || resource.total <= 0) return 0;
  return Math.round((resource.used / resource.total) * 100);
}

export function categorizeDiagnosis(diagnosis: string) {
  const value = diagnosis.toLowerCase();

  if (
    value.includes("pneumonia") ||
    value.includes("copd") ||
    value.includes("respiratory") ||
    value.includes("asthma")
  ) {
    return "Respiratory";
  }

  if (value.includes("cardiac") || value.includes("heart") || value.includes("attack")) {
    return "Cardiac";
  }

  if (value.includes("fracture") || value.includes("bone") || value.includes("orthopedic")) {
    return "Orthopedic";
  }

  if (value.includes("neuro") || value.includes("brain") || value.includes("stroke") || value.includes("migraine")) {
    return "Neurological";
  }

  return "Other";
}

function buildDailySeries(patients: Patient[], totalDays = 21) {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));

  const series = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      date,
      admissions: 0,
      discharges: 0,
      respiratory: 0,
      icu: 0,
    };
  });

  const map = new Map(series.map((item) => [item.key, item]));

  patients.forEach((patient) => {
    const patientDate = getPatientDate(patient);
    if (!patientDate) return;

    const key = startOfDay(patientDate).toISOString().slice(0, 10);
    const entry = map.get(key);
    if (!entry) return;

    entry.admissions += 1;
    if (patient.status === "Discharged") entry.discharges += 1;
    if (categorizeDiagnosis(patient.diagnosis) === "Respiratory") entry.respiratory += 1;
    if (patient.status === "ICU") entry.icu += 1;
  });

  return series;
}

function linearRegressionForecast(values: number[], futureOffset: number) {
  if (!values.length) return 0;

  const xs = values.map((_, index) => index + 1);
  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = values.reduce((sum, value) => sum + value, 0) / values.length;

  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    numerator += (xs[index] - xMean) * (value - yMean);
    denominator += (xs[index] - xMean) ** 2;
  });

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  return Math.max(0, intercept + slope * (values.length + futureOffset));
}

export function buildWeeklyOxygenTrend(
  _patients: Patient[],
  _resources: Resource[],
  resourceHistory: ResourceHistoryEntry[] = [],
) {
  const oxygenNames = ["oâ‚‚ cylinders", "oÃ¢â€šâ€š cylinders", "oxygen cylinders"];
  const oxygenHistory = resourceHistory
    .filter((entry) => oxygenNames.includes(String(entry.name || "").toLowerCase()))
    .filter((entry) => entry.recordedAt instanceof Date && !Number.isNaN(entry.recordedAt.getTime()));
  const grouped = new Map<string, { week: string; usageTotal: number; samples: number }>();

  oxygenHistory.forEach((entry) => {
    const weekStart = startOfWeek(entry.recordedAt as Date);
    const key = weekStart.toISOString().slice(0, 10);
    if (!grouped.has(key)) {
      grouped.set(key, {
        week: formatWeekLabel(weekStart),
        usageTotal: 0,
        samples: 0,
      });
    }

    const current = grouped.get(key)!;
    current.usageTotal += entry.used;
    current.samples += 1;
  });

  return Array.from(grouped.values())
    .slice(-6)
    .map((item) => ({
    week: item.week,
    usage: Math.round(item.usageTotal / item.samples),
    samples: item.samples,
  }));
}

export function buildMonthlyAdmissions(patients: Patient[]) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: monthNames[date.getMonth()],
      admissions: 0,
      discharges: 0,
    };
  });

  const byKey = new Map(lastSixMonths.map((item) => [item.key, item]));

  patients.forEach((patient) => {
    const date = getPatientDate(patient);
    if (!date) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const entry = byKey.get(key);
    if (!entry) return;
    entry.admissions += 1;
    if (patient.status === "Discharged") {
      entry.discharges += 1;
    }
  });

  return lastSixMonths;
}

export function buildMonthlyPatientFlow(patientHistory: PatientHistoryEntry[], totalMonths = 6) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const series = Array.from({ length: totalMonths }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (totalMonths - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: monthNames[date.getMonth()],
      admissions: 0,
      discharges: 0,
    };
  });

  const byKey = new Map(series.map((entry) => [entry.key, entry]));

  patientHistory.forEach((entry) => {
    const eventType = entry.eventType || "admission";
    const dateValue = entry.eventDate || entry.admissionDate;
    const parsedDate = parseDate(dateValue);
    if (!parsedDate) return;

    const key = `${parsedDate.getFullYear()}-${parsedDate.getMonth()}`;
    const target = byKey.get(key);
    if (!target) return;

    if (eventType === "discharge") {
      target.discharges += 1;
    } else {
      target.admissions += 1;
    }
  });

  return series.map((entry) => ({
    month: entry.month,
    admissions: entry.admissions,
    discharges: entry.discharges,
  }));
}

export function buildMonthlyCapacityTrend(resourceHistory: ResourceHistoryEntry[], totalMonths = 6) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const series = Array.from({ length: totalMonths }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (totalMonths - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: monthNames[date.getMonth()],
      bedsAvailableTotal: 0,
      bedsSamples: 0,
      roomsAvailableTotal: 0,
      roomsSamples: 0,
    };
  });

  const byKey = new Map(series.map((entry) => [entry.key, entry]));

  resourceHistory.forEach((entry) => {
    const parsedDate = parseDate(entry.recordedAt);
    if (!parsedDate) return;

    const key = `${parsedDate.getFullYear()}-${parsedDate.getMonth()}`;
    const target = byKey.get(key);
    if (!target) return;

    const normalizedName = String(entry.name || "").toLowerCase();
    if (normalizedName === "beds") {
      target.bedsAvailableTotal += entry.available;
      target.bedsSamples += 1;
    }
    if (normalizedName === "rooms") {
      target.roomsAvailableTotal += entry.available;
      target.roomsSamples += 1;
    }
  });

  return series.map((entry) => ({
    month: entry.month,
    bedsAvailable: entry.bedsSamples ? Math.round(entry.bedsAvailableTotal / entry.bedsSamples) : 0,
    roomsAvailable: entry.roomsSamples ? Math.round(entry.roomsAvailableTotal / entry.roomsSamples) : 0,
  }));
}

export function buildWeeklyPatientFlow(patientHistory: PatientHistoryEntry[], patients: Patient[] = []) {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - 6);

  const series = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
      admissions: 0,
      discharges: 0,
    };
  });

  const byKey = new Map(series.map((entry) => [entry.key, entry]));
  let historyInRange = 0;

  patientHistory.forEach((entry) => {
    const eventType = entry.eventType || "admission";
    const dateValue = entry.eventDate || entry.admissionDate;
    const key = dateValue;
    const target = byKey.get(key);
    if (!target) return;

    historyInRange += 1;

    if (eventType === "discharge") {
      target.discharges += 1;
    } else {
      target.admissions += 1;
    }
  });

  if (historyInRange === 0) {
    const dailySeries = buildDailySeries(patients, 7);
    dailySeries.forEach((entry) => {
      const target = byKey.get(entry.key);
      if (!target) return;
      target.admissions = entry.admissions;
      target.discharges = entry.discharges;
    });
  }

  return series.map(({ day, admissions, discharges }) => ({
    day,
    admissions,
    discharges,
  }));
}

export function buildWeeklyCapacityTrend(resourceHistory: ResourceHistoryEntry[], _resources: Resource[]) {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - 6);

  const series = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
      bedsAvailableTotal: 0,
      bedsSamples: 0,
      roomsAvailableTotal: 0,
      roomsSamples: 0,
    };
  });

  const byKey = new Map(series.map((entry) => [entry.key, entry]));

  if (resourceHistory.length > 0) {
    resourceHistory.forEach((entry) => {
      const recordedAt = parseDate(entry.recordedAt);
      if (!recordedAt) return;

      const key = startOfDay(recordedAt).toISOString().slice(0, 10);
      const target = byKey.get(key);
      if (!target) return;

      const normalizedName = String(entry.name || "").toLowerCase();
      if (normalizedName === "beds") {
        target.bedsAvailableTotal += entry.available;
        target.bedsSamples += 1;
      }
      if (normalizedName === "rooms") {
        target.roomsAvailableTotal += entry.available;
        target.roomsSamples += 1;
      }
    });
  }

  return series.map((entry) => ({
    day: entry.day,
    bedsAvailable: entry.bedsSamples ? Math.round(entry.bedsAvailableTotal / entry.bedsSamples) : 0,
    roomsAvailable: entry.roomsSamples ? Math.round(entry.roomsAvailableTotal / entry.roomsSamples) : 0,
  }));
}

export function calculateForecastMetrics(patients: Patient[], resources: Resource[], staff: Staff[]): ForecastMetrics {
  const beds = getResourceByName(resources, ["beds"]);
  const icu = getResourceByName(resources, ["icu"]);
  const oxygen = getResourceByName(resources, ["oâ‚‚ cylinders", "oÃ¢â€šâ€š cylinders", "oxygen cylinders"]);

  const activePatients = patients.filter((patient) => patient.status !== "Discharged" && patient.status !== "Outpatient");
  const icuPatients = patients.filter((patient) => patient.status === "ICU");
  const respiratoryPatients = patients.filter((patient) => categorizeDiagnosis(patient.diagnosis) === "Respiratory");
  const doctors = staff.filter((member) => member.role === "Doctor").length;
  const nurses = staff.filter((member) => member.role === "Nurse").length;

  const dailySeries = buildDailySeries(patients, 21);
  const admissions = dailySeries.map((entry) => entry.admissions);
  const respiratory = dailySeries.map((entry) => entry.respiratory);

  const currentWeekAdmissions = admissions.slice(-7).reduce((sum, value) => sum + value, 0);
  const previousWeekAdmissions = admissions.slice(-14, -7).reduce((sum, value) => sum + value, 0);
  const currentWeekRespiratory = respiratory.slice(-7).reduce((sum, value) => sum + value, 0);
  const previousWeekRespiratory = respiratory.slice(-14, -7).reduce((sum, value) => sum + value, 0);

  const admissionsGrowthPct =
    previousWeekAdmissions > 0 ? Math.round(((currentWeekAdmissions - previousWeekAdmissions) / previousWeekAdmissions) * 100) : 0;
  const respiratoryGrowthPct =
    previousWeekRespiratory > 0 ? Math.round(((currentWeekRespiratory - previousWeekRespiratory) / previousWeekRespiratory) * 100) : 0;

  const projectedAdmissionsNext7 = Math.round(linearRegressionForecast(admissions, 7) * 7);
  const projectedRespiratoryNext7 = Math.round(linearRegressionForecast(respiratory, 7) * 7);

  const projectedBedDemand = beds
    ? Math.min(beds.total, Math.max(activePatients.length, Math.round(activePatients.length + projectedAdmissionsNext7 * 0.35)))
    : Math.max(activePatients.length, projectedAdmissionsNext7);
  const projectedIcuDemand = icu
    ? Math.min(icu.total, Math.max(icuPatients.length, Math.round(icuPatients.length + projectedAdmissionsNext7 * 0.08)))
    : Math.max(icuPatients.length, Math.round(projectedAdmissionsNext7 * 0.08));
  const projectedOxygenDemand = oxygen
    ? Math.min(
        oxygen.total,
        Math.max(
          oxygen.used,
          Math.round(oxygen.used * (1 + Math.max(0, admissionsGrowthPct) / 100 * 0.35 + Math.max(0, respiratoryGrowthPct) / 100 * 0.65)),
        ),
      )
    : Math.max(respiratoryPatients.length, projectedRespiratoryNext7);

  return {
    activePatients: activePatients.length,
    icuPatients: icuPatients.length,
    respiratoryPatients: respiratoryPatients.length,
    doctors,
    nurses,
    bedUtilization: getUtilization(beds),
    icuUtilization: getUtilization(icu),
    oxygenUtilization: getUtilization(oxygen),
    projectedAdmissionsNext7,
    projectedBedDemand,
    projectedIcuDemand,
    projectedOxygenDemand,
    admissionsGrowthPct,
    respiratoryGrowthPct,
  };
}

export function generateOperationalAlerts(patients: Patient[], resources: Resource[], staff: Staff[], alerts: Alert[]): GeneratedAlert[] {
  const metrics = calculateForecastMetrics(patients, resources, staff);
  const generated: GeneratedAlert[] = [];

  if (metrics.bedUtilization >= 85 || metrics.projectedBedDemand > metrics.activePatients + 5) {
    generated.push({
      id: "generated-bed-pressure",
      type: metrics.bedUtilization >= 90 ? "critical" : "warning",
      title: "Bed pressure rising",
      message: `Current bed occupancy is ${metrics.bedUtilization}% and projected bed demand is ${metrics.projectedBedDemand} within the next 7 days.`,
      department: "General",
      source: "generated",
      acknowledged: false,
    });
  }

  if (metrics.icuUtilization >= 85 || metrics.projectedIcuDemand >= metrics.icuPatients + 2) {
    generated.push({
      id: "generated-icu-pressure",
      type: metrics.icuUtilization >= 90 ? "critical" : "warning",
      title: "ICU capacity risk",
      message: `ICU utilization is ${metrics.icuUtilization}% with projected demand reaching ${metrics.projectedIcuDemand} beds.`,
      department: "ICU",
      source: "generated",
      acknowledged: false,
    });
  }

  if (metrics.oxygenUtilization >= 75 || metrics.respiratoryGrowthPct > 10) {
    generated.push({
      id: "generated-oxygen-demand",
      type: metrics.oxygenUtilization >= 85 ? "critical" : "warning",
      title: "Oxygen demand increasing",
      message: `Oxygen utilization is ${metrics.oxygenUtilization}% and respiratory patient growth is ${metrics.respiratoryGrowthPct}%.`,
      department: "Respiratory",
      source: "generated",
      acknowledged: false,
    });
  }

  const clinicalStaff = metrics.doctors + metrics.nurses;
  if (clinicalStaff > 0 && metrics.activePatients / clinicalStaff > 3.5) {
    generated.push({
      id: "generated-staffing",
      type: "warning",
      title: "Staffing stretch detected",
      message: `There are ${metrics.activePatients} active patients for ${clinicalStaff} doctors and nurses combined.`,
      department: "Operations",
      source: "generated",
      acknowledged: false,
    });
  }

  const firebaseAlerts: GeneratedAlert[] = alerts
    .filter((alert) => !alert.acknowledged)
    .map((alert) => ({
      id: alert.id,
      type: alert.type,
      title: alert.department ? `${alert.department} alert` : "Operational alert",
      message: alert.message,
      department: alert.department,
      source: "firebase",
      acknowledged: alert.acknowledged,
    }));

  return [...generated, ...firebaseAlerts];
}
