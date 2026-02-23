import { AlertTriangle, TrendingUp, Info, Check, Loader2 } from "lucide-react";
import { useFirebase } from "@/contexts/FirebaseContext";
import { Button } from "@/components/ui/button";

const iconMap = {
  warning: AlertTriangle,
  critical: AlertTriangle,
  info: Info,
};

const styleMap = {
  warning: "border-l-warning text-warning",
  critical: "border-l-destructive text-destructive",
  info: "border-l-primary text-primary",
};

export function AlertPanel() {
  const { alerts, loading, acknowledgeAlert } = useFirebase();

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  // Filter out acknowledged alerts
  const activeAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Recommendations & Alerts</h3>
      </div>
      {loading.alerts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeAlerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Check className="h-8 w-8 mx-auto mb-2 text-success" />
          <p className="text-sm">All alerts acknowledged. System operating normally.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert) => {
            const Icon = iconMap[alert.type];
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-md bg-secondary/50 border-l-2 ${styleMap[alert.type]}`}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-card-foreground">{alert.message}</p>
                  {alert.department && (
                    <p className="text-xs text-muted-foreground mt-1">Department: {alert.department}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 px-2"
                  onClick={() => handleAcknowledge(alert.id)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Acknowledge
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
