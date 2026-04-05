import { Alert, Patient, Resource, Staff } from "@/types";
import { getGeminiClient, isGeminiConfigured } from "@/lib/gemini";

type AdminRagInput = {
  patients: Patient[];
  resources: Resource[];
  staff: Staff[];
  alerts: Alert[];
};

type RagDocument = {
  id: string;
  title: string;
  category: string;
  text: string;
};

type RetrievedDocument = RagDocument & {
  score: number;
};

export type AdminRagResponse = {
  answer: string;
  sources: RetrievedDocument[];
};

const embeddingCache = new Map<string, number[]>();

function getUtilization(resource?: Resource) {
  if (!resource || resource.total <= 0) {
    return 0;
  }

  return Math.round((resource.used / resource.total) * 100);
}

function categorizeDiagnosis(diagnosis: string) {
  const value = diagnosis.toLowerCase();

  if (
    value.includes("pneumonia") ||
    value.includes("copd") ||
    value.includes("respiratory") ||
    value.includes("asthma")
  ) {
    return "respiratory";
  }

  if (value.includes("cardiac") || value.includes("heart") || value.includes("attack")) {
    return "cardiac";
  }

  if (value.includes("fracture") || value.includes("bone") || value.includes("orthopedic")) {
    return "orthopedic";
  }

  return "other";
}

function buildAdminDocuments({ patients, resources, staff, alerts }: AdminRagInput): RagDocument[] {
  const activePatients = patients.filter((patient) => patient.status !== "Discharged" && patient.status !== "Outpatient");
  const icuPatients = patients.filter((patient) => patient.status === "ICU");
  const respiratoryPatients = patients.filter((patient) => categorizeDiagnosis(patient.diagnosis) === "respiratory");

  const statusCounts = patients.reduce<Record<string, number>>((counts, patient) => {
    counts[patient.status] = (counts[patient.status] || 0) + 1;
    return counts;
  }, {});

  const resourcesByName = new Map(resources.map((resource) => [resource.name.toLowerCase(), resource]));
  const staffByDepartment = staff.reduce<Record<string, { doctors: number; nurses: number; technicians: number; admin: number }>>(
    (departments, member) => {
      const department = member.department || "General";

      if (!departments[department]) {
        departments[department] = { doctors: 0, nurses: 0, technicians: 0, admin: 0 };
      }

      if (member.role === "Doctor") departments[department].doctors += 1;
      if (member.role === "Nurse") departments[department].nurses += 1;
      if (member.role === "Technician") departments[department].technicians += 1;
      if (member.role === "Admin") departments[department].admin += 1;

      return departments;
    },
    {},
  );

  const docs: RagDocument[] = [];

  docs.push({
    id: "hospital-overview",
    title: "Operational overview",
    category: "overview",
    text: [
      "Operational overview for hospital administration.",
      `Total patients in dataset: ${patients.length}.`,
      `Active inpatients: ${activePatients.length}.`,
      `ICU patients: ${icuPatients.length}.`,
      `Respiratory-related patients: ${respiratoryPatients.length}.`,
      `Patient status distribution: ${Object.entries(statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(", ")}.`,
      `Total staff members: ${staff.length}.`,
      `Open or unacknowledged alerts: ${alerts.filter((alert) => !alert.acknowledged).length}.`,
    ].join(" "),
  });

  resources.forEach((resource) => {
    const utilization = getUtilization(resource);
    docs.push({
      id: `resource-${resource.id}`,
      title: `${resource.name} resource snapshot`,
      category: "resource",
      text: [
        `Resource name: ${resource.name}.`,
        `Used: ${resource.used}.`,
        `Total capacity: ${resource.total}.`,
        `Available capacity: ${Math.max(resource.total - resource.used, 0)}.`,
        `Utilization: ${utilization} percent.`,
        `Unit: ${resource.unit || "units"}.`,
        resource.updatedAt ? `Last updated: ${resource.updatedAt.toISOString()}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  });

  const bedResource = resourcesByName.get("beds");
  const icuResource = resourcesByName.get("icu");
  const oxygenResource = resourcesByName.get("oâ‚‚ cylinders") || resourcesByName.get("o₂ cylinders") || resourcesByName.get("oxygen cylinders");
  const ventilatorResource = resourcesByName.get("ventilators");

  docs.push({
    id: "capacity-pressure",
    title: "Capacity pressure summary",
    category: "capacity",
    text: [
      "Capacity pressure summary for bed, ICU, oxygen, and ventilator planning.",
      `Beds utilization: ${getUtilization(bedResource)} percent.`,
      `ICU utilization: ${getUtilization(icuResource)} percent.`,
      `Oxygen utilization: ${getUtilization(oxygenResource)} percent.`,
      `Ventilator utilization: ${getUtilization(ventilatorResource)} percent.`,
      `Current active inpatients: ${activePatients.length}.`,
      `Current ICU patients: ${icuPatients.length}.`,
      `Respiratory-related patients: ${respiratoryPatients.length}.`,
    ].join(" "),
  });

  docs.push({
    id: "staff-summary",
    title: "Staff coverage summary",
    category: "staff",
    text: [
      "Staff coverage summary for operational planning.",
      `Doctors: ${staff.filter((member) => member.role === "Doctor").length}.`,
      `Nurses: ${staff.filter((member) => member.role === "Nurse").length}.`,
      `Technicians: ${staff.filter((member) => member.role === "Technician").length}.`,
      `Admins: ${staff.filter((member) => member.role === "Admin").length}.`,
      `Morning shift: ${staff.filter((member) => member.shift === "Morning").length}.`,
      `Afternoon shift: ${staff.filter((member) => member.shift === "Afternoon").length}.`,
      `Night shift: ${staff.filter((member) => member.shift === "Night").length}.`,
    ].join(" "),
  });

  Object.entries(staffByDepartment).forEach(([department, counts]) => {
    docs.push({
      id: `department-${department.toLowerCase().replace(/\s+/g, "-")}`,
      title: `${department} staffing summary`,
      category: "staff",
      text: [
        `Department: ${department}.`,
        `Doctors: ${counts.doctors}.`,
        `Nurses: ${counts.nurses}.`,
        `Technicians: ${counts.technicians}.`,
        `Admin staff: ${counts.admin}.`,
      ].join(" "),
    });
  });

  alerts.forEach((alert) => {
    docs.push({
      id: `alert-${alert.id}`,
      title: `${alert.type} alert`,
      category: "alert",
      text: [
        `Alert severity: ${alert.type}.`,
        alert.department ? `Department: ${alert.department}.` : "",
        `Message: ${alert.message}.`,
        `Acknowledged: ${alert.acknowledged ? "yes" : "no"}.`,
        alert.timestamp ? `Timestamp: ${alert.timestamp.toISOString()}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  });

  return docs;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text: string) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }

  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to create an embedding for the retrieved content.");
  }

  embeddingCache.set(text, embedding);
  return embedding;
}

async function retrieveRelevantDocuments(question: string, input: AdminRagInput, topK = 5) {
  const documents = buildAdminDocuments(input);
  const questionEmbedding = await getEmbedding(question);

  const ranked = await Promise.all(
    documents.map(async (document) => {
      const embedding = await getEmbedding(document.text);
      return {
        ...document,
        score: cosineSimilarity(questionEmbedding, embedding),
      };
    }),
  );

  return ranked.sort((left, right) => right.score - left.score).slice(0, topK);
}

export async function askAdminQuestion(question: string, input: AdminRagInput): Promise<AdminRagResponse> {
  if (!isGeminiConfigured) {
    throw new Error("Gemini is not configured. Add VITE_GEMINI_API_KEY to your root .env file.");
  }

  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error("Please enter an admin resource question.");
  }

  const sources = await retrieveRelevantDocuments(trimmedQuestion, input);

  const contextBlock = sources
    .map((document, index) => `Source ${index + 1}: ${document.title}\n${document.text}`)
    .join("\n\n");

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      [
        "You are an operations-only hospital resource planning assistant.",
        "Use only the retrieved context below.",
        "Do not give clinical diagnosis or treatment advice.",
        "If the context is insufficient, say that clearly and stay conservative.",
        "Answer in three short sections exactly titled Summary, Why, and Recommendations.",
        "Keep the answer concise and practical for an admin user.",
        `Question: ${trimmedQuestion}`,
        `Retrieved context:\n${contextBlock}`,
      ].join("\n\n"),
    ],
  });

  return {
    answer: response.text || "No recommendation was generated.",
    sources,
  };
}
