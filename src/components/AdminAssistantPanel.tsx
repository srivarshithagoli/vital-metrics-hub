import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, SendHorizonal, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFirebase } from "@/contexts/FirebaseContext";
import { askAdminAssistant, getAdminAssistantHealth } from "@/lib/adminAssistantApi";
import { generateOperationalAlerts } from "@/lib/hospitalInsights";
import { toast } from "sonner";

const severityStyles = {
  warning: "border-warning/30 bg-warning/10 text-warning",
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-primary/30 bg-primary/10 text-primary",
};

type AdminAssistantPanelProps = {
  compact?: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AdminAssistantPanel({ compact = false }: AdminAssistantPanelProps) {
  const { patients, resources, staff, alerts, loading } = useFirebase();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<Array<{ id: string; title: string; score: number }>>([]);
  const [predictionAlerts, setPredictionAlerts] = useState<Array<{ severity: "warning" | "critical" | "info"; title: string; message: string }>>([]);
  const [metrics, setMetrics] = useState<null | {
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
  }>(null);
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [missingServerKeys, setMissingServerKeys] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const exampleQuestions = useMemo(
    () => [
      "Summarize current hospital resource risks and predictions for the next 7 days.",
      "Will bed demand increase next week?",
      "Why is oxygen usage rising?",
      "How should we optimize room and ICU allocation now?",
    ],
    [],
  );

  const operationalAlerts = useMemo(
    () => generateOperationalAlerts(patients, resources, staff, alerts),
    [alerts, patients, resources, staff],
  );

  const checkServerHealth = useCallback(async () => {
    try {
      const status = await getAdminAssistantHealth();
      setServerReady(status.ready);
      setMissingServerKeys(status.missing || []);
      return status.ready;
    } catch (error) {
      console.error("Failed to check RAG server health:", error);
      setServerReady(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const runCheck = async () => {
      try {
        const status = await getAdminAssistantHealth();
        if (!active) return;
        setServerReady(status.ready);
        setMissingServerKeys(status.missing || []);
      } catch (error) {
        if (!active) return;
        console.error("Failed to check RAG server health:", error);
        setServerReady(false);
      }
    };

    runCheck();
    const intervalId = window.setInterval(runCheck, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const sendMessage = useCallback(
    async (nextQuestion?: string, silent = false) => {
      const finalQuestion = (nextQuestion ?? question).trim();
      const ready = await checkServerHealth();

      if (!ready) {
        if (!silent) {
          toast.error("The backend AI service is still unavailable. Make sure `npm run server:dev` is running.");
        }
        return;
      }

      if (!finalQuestion) {
        if (!silent) toast.error("Enter an admin question first.");
        return;
      }

      const nextUserMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: finalQuestion,
      };

      setIsGenerating(true);
      setQuestion("");
      setMessages((current) => [...current, nextUserMessage]);

      try {
        const history = messages
          .concat(nextUserMessage)
          .map((message) => ({ role: message.role, content: message.content }));

        const result = await askAdminAssistant(
          finalQuestion,
          {
            patients,
            resources,
            staff,
            alerts,
          },
          history,
        );

        setSources(result.sources.map((source) => ({ id: source.id, title: source.title, score: source.score })));
        setPredictionAlerts(result.predictions.generatedAlerts);
        setMetrics(result.predictions.metrics);
        setServerReady(true);
        setMissingServerKeys([]);
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.answer,
          },
        ]);
      } catch (error) {
        console.error("Failed to generate admin assistant response:", error);
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Failed to generate the admin recommendation.");
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [alerts, checkServerHealth, messages, patients, question, resources, staff],
  );

  const metricCards = metrics
    ? [
        { label: "Projected Admissions (7d)", value: metrics.projectedAdmissionsNext7 },
        { label: "Projected Bed Demand", value: metrics.projectedBedDemand },
        { label: "Projected ICU Demand", value: metrics.projectedIcuDemand },
        { label: "Projected Oxygen Demand", value: metrics.projectedOxygenDemand },
      ]
    : [];

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">AI Recommendations & Alerts</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pinecone-backed RAG over live operational data with short-term resource predictions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => sendMessage(exampleQuestions[0])} disabled={isGenerating} className="gap-2">
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Refresh AI
        </Button>
      </div>

      {serverReady === false && (
        <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
          The backend AI service is not ready yet.
          {missingServerKeys.length ? ` Missing server keys: ${missingServerKeys.join(", ")}.` : " Start the backend with `npm run server:dev`."}
        </div>
      )}

      {metrics ? (
        <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
          {metricCards.map((card) => (
            <div key={card.label} className="rounded-md bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {operationalAlerts.length > 0 ? (
        <div className="space-y-2">
          {operationalAlerts.map((alert) => (
            <div key={`${alert.id}-${alert.title}`} className={`rounded-md border p-3 ${severityStyles[alert.type]}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs mt-1 text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-background/50">
        <div className={`${compact ? "max-h-[280px]" : "max-h-[360px]"} overflow-y-auto p-4 space-y-3`}>
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Ask about bed demand, oxygen usage, ICU pressure, room allocation, or admissions whenever you want.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-card-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {isGenerating ? (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 text-sm bg-secondary text-card-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating response...
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask an admin question like: Will bed demand increase next week?"
            className={compact ? "min-h-[80px]" : "min-h-[100px]"}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                sendMessage();
              }
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            {exampleQuestions.map((example) => (
              <Button key={example} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(example)} disabled={isGenerating}>
                {example}
              </Button>
            ))}
            <Button onClick={() => sendMessage()} disabled={isGenerating} className="gap-2 ml-auto">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              Send
            </Button>
          </div>

          {sources.length > 0 ? (
            <div className="rounded-md bg-secondary/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Retrieved Sources</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source) => (
                  <div key={source.id} className="rounded bg-background px-3 py-2 text-xs">
                    {source.title} ({(source.score * 100).toFixed(1)}%)
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
