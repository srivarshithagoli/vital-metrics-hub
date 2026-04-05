import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Pinecone } from "@pinecone-database/pinecone";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5050);
const EMBEDDING_DIMENSION = Number(process.env.PINECONE_INDEX_DIMENSION || 1024);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

function getServerConfig() {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  const pineconeApiKey = process.env.PINECONE_API_KEY || "";
  const pineconeIndexHost = process.env.PINECONE_INDEX_HOST || "";
  const pineconeNamespace = process.env.PINECONE_NAMESPACE || "hospital-admin-rag";

  const missing = [];
  if (!geminiApiKey) missing.push("GEMINI_API_KEY");
  if (!pineconeApiKey) missing.push("PINECONE_API_KEY");
  if (!pineconeIndexHost) missing.push("PINECONE_INDEX_HOST");

  return {
    geminiApiKey,
    pineconeApiKey,
    pineconeIndexHost,
    pineconeNamespace,
    missing,
    ready: missing.length === 0,
  };
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function getResourceByName(resources, names) {
  return resources.find((resource) => names.includes(String(resource.name || "").toLowerCase()));
}

function getUtilization(resource) {
  if (!resource || !resource.total) return 0;
  return (resource.used / resource.total) * 100;
}

function categorizeDiagnosis(diagnosis = "") {
  const text = diagnosis.toLowerCase();

  if (text.includes("pneumonia") || text.includes("copd") || text.includes("respiratory") || text.includes("asthma")) {
    return "respiratory";
  }

  if (text.includes("cardiac") || text.includes("heart") || text.includes("attack")) {
    return "cardiac";
  }

  return "other";
}

function buildDailySeries(patients, totalDays = 21) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (totalDays - 1));

  const counts = Array.from({ length: totalDays }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    return {
      key: date.toISOString().slice(0, 10),
      admissions: 0,
      respiratory: 0,
      icu: 0,
    };
  });

  const byKey = new Map(counts.map((entry) => [entry.key, entry]));

  patients.forEach((patient) => {
    const sourceDate = parseDateValue(patient.createdAt) || parseDateValue(patient.date);
    if (!sourceDate) return;
    const key = sourceDate.toISOString().slice(0, 10);
    const entry = byKey.get(key);
    if (!entry) return;

    entry.admissions += 1;
    if (categorizeDiagnosis(patient.diagnosis) === "respiratory") {
      entry.respiratory += 1;
    }
    if (patient.status === "ICU") {
      entry.icu += 1;
    }
  });

  return counts;
}

function linearRegressionForecast(values, forecastDays) {
  if (!values.length) {
    return 0;
  }

  const xs = values.map((_, index) => index + 1);
  const ys = values;
  const n = values.length;
  const xMean = xs.reduce((sum, value) => sum + value, 0) / n;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < n; index += 1) {
    numerator += (xs[index] - xMean) * (ys[index] - yMean);
    denominator += (xs[index] - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  const nextX = n + forecastDays;
  const forecast = intercept + slope * nextX;

  return Math.max(0, forecast);
}

function createPredictions(data) {
  const { patients = [], resources = [], staff = [], alerts = [] } = data;
  const activePatients = patients.filter((patient) => patient.status !== "Discharged" && patient.status !== "Outpatient");
  const icuPatients = patients.filter((patient) => patient.status === "ICU");
  const respiratoryPatients = patients.filter((patient) => categorizeDiagnosis(patient.diagnosis) === "respiratory");
  const dailySeries = buildDailySeries(patients, 21);
  const admissionsSeries = dailySeries.map((entry) => entry.admissions);
  const respiratorySeries = dailySeries.map((entry) => entry.respiratory);

  const currentWeekAdmissions = admissionsSeries.slice(-7).reduce((sum, value) => sum + value, 0);
  const previousWeekAdmissions = admissionsSeries.slice(-14, -7).reduce((sum, value) => sum + value, 0);
  const admissionsGrowth = previousWeekAdmissions === 0 ? 0 : (currentWeekAdmissions - previousWeekAdmissions) / previousWeekAdmissions;

  const currentRespiratoryWeek = respiratorySeries.slice(-7).reduce((sum, value) => sum + value, 0);
  const previousRespiratoryWeek = respiratorySeries.slice(-14, -7).reduce((sum, value) => sum + value, 0);
  const respiratoryGrowth = previousRespiratoryWeek === 0 ? 0 : (currentRespiratoryWeek - previousRespiratoryWeek) / previousRespiratoryWeek;

  const beds = getResourceByName(resources, ["beds"]);
  const icu = getResourceByName(resources, ["icu"]);
  const oxygen =
    getResourceByName(resources, ["o₂ cylinders", "oâ‚‚ cylinders", "oxygen cylinders"]);
  const ventilators = getResourceByName(resources, ["ventilators"]);

  const projectedAdmissionsNext7 = round(linearRegressionForecast(admissionsSeries, 7) * 7);
  const projectedRespiratoryNext7 = round(linearRegressionForecast(respiratorySeries, 7) * 7);

  const currentBedUtilization = getUtilization(beds);
  const currentIcuUtilization = getUtilization(icu);
  const currentOxygenUtilization = getUtilization(oxygen);

  const projectedActivePatients = Math.max(
    activePatients.length,
    round(activePatients.length + projectedAdmissionsNext7 * 0.35),
  );
  const projectedBedDemand = beds
    ? Math.min(beds.total, Math.round(projectedActivePatients * 1.05))
    : projectedActivePatients;
  const projectedIcuDemand = icu
    ? Math.min(icu.total, Math.round(icuPatients.length + projectedAdmissionsNext7 * 0.08))
    : Math.round(icuPatients.length + projectedAdmissionsNext7 * 0.08);
  const projectedOxygenDemand = oxygen
    ? Math.min(
        oxygen.total,
        Math.round(
          oxygen.used *
            (1 + Math.max(admissionsGrowth, 0) * 0.45 + Math.max(respiratoryGrowth, 0) * 0.55 + projectedRespiratoryNext7 / 100),
        ),
      )
    : Math.round(respiratoryPatients.length * 1.3);

  const staffCoverage = {
    doctors: staff.filter((member) => member.role === "Doctor").length,
    nurses: staff.filter((member) => member.role === "Nurse").length,
  };

  const generatedAlerts = [];

  if (beds && projectedBedDemand / beds.total >= 0.85) {
    generatedAlerts.push({
      severity: "warning",
      title: "Bed pressure rising",
      message: `Projected bed demand is ${projectedBedDemand} of ${beds.total} beds within the next 7 days.`,
    });
  }

  if (icu && projectedIcuDemand / icu.total >= 0.85) {
    generatedAlerts.push({
      severity: "critical",
      title: "ICU capacity risk",
      message: `Projected ICU demand is ${projectedIcuDemand} of ${icu.total} beds. Overflow planning should be prepared.`,
    });
  }

  if (oxygen && projectedOxygenDemand / oxygen.total >= 0.8) {
    generatedAlerts.push({
      severity: "warning",
      title: "Oxygen demand risk",
      message: `Projected oxygen usage is ${projectedOxygenDemand} of ${oxygen.total} cylinders based on respiratory pressure.`,
    });
  }

  if (staffCoverage.doctors + staffCoverage.nurses > 0 && activePatients.length / (staffCoverage.doctors + staffCoverage.nurses) > 3.5) {
    generatedAlerts.push({
      severity: "warning",
      title: "Staffing stretch",
      message: `Current patient-to-clinical-staff ratio is ${round(activePatients.length / (staffCoverage.doctors + staffCoverage.nurses))}, which may affect room allocation efficiency.`,
    });
  }

  return {
    metrics: {
      currentBedUtilization: round(currentBedUtilization),
      currentIcuUtilization: round(currentIcuUtilization),
      currentOxygenUtilization: round(currentOxygenUtilization),
      projectedAdmissionsNext7,
      projectedRespiratoryNext7,
      projectedBedDemand,
      projectedIcuDemand,
      projectedOxygenDemand,
      admissionsGrowthPct: round(admissionsGrowth * 100),
      respiratoryGrowthPct: round(respiratoryGrowth * 100),
      openAlerts: alerts.filter((alert) => !alert.acknowledged).length,
      activePatients: activePatients.length,
    },
    generatedAlerts,
  };
}

function buildDocuments(data, predictions) {
  const { patients = [], resources = [], staff = [], alerts = [] } = data;
  const activePatients = patients.filter((patient) => patient.status !== "Discharged" && patient.status !== "Outpatient");
  const respiratoryPatients = patients.filter((patient) => categorizeDiagnosis(patient.diagnosis) === "respiratory");

  const documents = [];

  documents.push({
    id: "overview",
    text: [
      "Hospital operations overview.",
      `Active patients: ${activePatients.length}.`,
      `Respiratory patients: ${respiratoryPatients.length}.`,
      `Staff count: ${staff.length}.`,
      `Open alerts: ${alerts.filter((alert) => !alert.acknowledged).length}.`,
    ].join(" "),
    metadata: { category: "overview", title: "Hospital overview" },
  });

  resources.forEach((resource) => {
    documents.push({
      id: `resource-${resource.id}`,
      text: [
        `Resource ${resource.name}.`,
        `Used ${resource.used}.`,
        `Total ${resource.total}.`,
        `Utilization ${round(getUtilization(resource))} percent.`,
      ].join(" "),
      metadata: {
        category: "resource",
        title: `${resource.name} snapshot`,
        resourceName: resource.name,
      },
    });
  });

  documents.push({
    id: "forecast-summary",
    text: [
      "Forecast summary for the next 7 days.",
      `Projected admissions next 7 days: ${predictions.metrics.projectedAdmissionsNext7}.`,
      `Projected bed demand: ${predictions.metrics.projectedBedDemand}.`,
      `Projected ICU demand: ${predictions.metrics.projectedIcuDemand}.`,
      `Projected oxygen demand: ${predictions.metrics.projectedOxygenDemand}.`,
      `Admissions growth rate: ${predictions.metrics.admissionsGrowthPct} percent.`,
      `Respiratory growth rate: ${predictions.metrics.respiratoryGrowthPct} percent.`,
    ].join(" "),
    metadata: { category: "forecast", title: "Forecast summary" },
  });

  predictions.generatedAlerts.forEach((alert, index) => {
    documents.push({
      id: `generated-alert-${index + 1}`,
      text: `${alert.title}. ${alert.message}`,
      metadata: { category: "generated_alert", severity: alert.severity, title: alert.title },
    });
  });

  alerts.forEach((alert) => {
    documents.push({
      id: `alert-${alert.id}`,
      text: `Alert severity ${alert.type}. Department ${alert.department || "General"}. Message ${alert.message}. Acknowledged ${alert.acknowledged ? "yes" : "no"}.`,
      metadata: { category: "alert", severity: alert.type, title: `${alert.type} alert` },
    });
  });

  return documents;
}

async function getGeminiClient(config) {
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

function getPineconeIndex(config) {
  const pinecone = new Pinecone({ apiKey: config.pineconeApiKey });
  return pinecone.index({ host: config.pineconeIndexHost }).namespace(config.pineconeNamespace);
}

async function embedText(ai, text) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || !values.length) {
    throw new Error("Gemini did not return embeddings.");
  }

  return values;
}

async function syncDocumentsToPinecone(index, ai, documents) {
  const records = await Promise.all(
    documents.map(async (document) => ({
      id: document.id,
      values: await embedText(ai, document.text),
      metadata: {
        ...document.metadata,
        text: document.text,
      },
    })),
  );

  await index.upsert({ records });
}

async function queryRelevantDocs(index, ai, question) {
  const vector = await embedText(ai, question);
  const response = await index.query({
    vector,
    topK: 5,
    includeMetadata: true,
  });

  return (response.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    title: match.metadata?.title || match.id,
    text: match.metadata?.text || "",
    category: match.metadata?.category || "unknown",
  }));
}

async function generateAnswer(ai, question, predictions, retrievedDocs, history = []) {
  const context = retrievedDocs
    .map((doc, index) => `Source ${index + 1} (${doc.title}): ${doc.text}`)
    .join("\n\n");

  const historyBlock = history
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      [
        "You are a hospital operations assistant for infrastructure and resource management only.",
        "Do not provide diagnosis or treatment advice.",
        "Use the retrieved context and predictive metrics below only.",
        "Be practical and concise.",
        "Return a short conversational answer with operational reasoning and practical next steps.",
        `Question: ${question}`,
        historyBlock ? `Recent conversation:\n${historyBlock}` : "",
        `Predictive metrics: ${JSON.stringify(predictions.metrics)}`,
        `Retrieved context:\n${context}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    ],
  });

  return response.text || "No recommendation generated.";
}

app.get("/api/health", (_req, res) => {
  const config = getServerConfig();
  res.json({
    ok: true,
    service: "hospital-admin-rag",
    ready: config.ready,
    missing: config.missing,
  });
});

app.post("/api/ask-admin", async (req, res) => {
  const config = getServerConfig();
  if (!config.ready) {
    return res.status(400).json({
      error: "Server AI configuration is incomplete.",
      missing: config.missing,
    });
  }

  const { question, hospitalData, history = [] } = req.body || {};

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "A question is required." });
  }

  if (!hospitalData || typeof hospitalData !== "object") {
    return res.status(400).json({ error: "hospitalData payload is required." });
  }

  try {
    const ai = await getGeminiClient(config);
    const index = getPineconeIndex(config);
    const predictions = createPredictions(hospitalData);
    const documents = buildDocuments(hospitalData, predictions);

    await syncDocumentsToPinecone(index, ai, documents);
    const retrievedDocs = await queryRelevantDocs(index, ai, question);
    const answer = await generateAnswer(ai, question, predictions, retrievedDocs, history);

    res.json({
      answer,
      predictions,
      sources: retrievedDocs,
    });
  } catch (error) {
    console.error("Error handling /api/ask-admin:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

app.listen(port, () => {
  console.log(`RAG server listening on http://localhost:${port}`);
});
