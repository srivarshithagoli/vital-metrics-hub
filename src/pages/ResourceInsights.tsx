import { DashboardLayout } from "@/components/DashboardLayout";
import { BedDouble, Wind, UserCog, TrendingUp, AlertTriangle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/contexts/FirebaseContext";
import { exportResourcesToExcel } from "@/lib/excelUtils";
import { toast } from "sonner";

const severityBorder = {
  warning: "border-l-warning",
  critical: "border-l-destructive",
  info: "border-l-primary",
};

const severityIcon = {
  warning: "text-warning",
  critical: "text-destructive",
  info: "text-primary",
};

export default function ResourceInsights() {
  const { patients, resources, staff, loading } = useFirebase();

  // Calculate insights from real data
  const bedResource = resources.find(r => r.name === "Beds");
  const icuResource = resources.find(r => r.name === "ICU");
  const oxygenResource = resources.find(r => r.name === "O₂ Cylinders");
  const ventilatorResource = resources.find(r => r.name === "Ventilators");

  const totalPatients = patients.filter(p => p.status !== "Discharged" && p.status !== "Outpatient").length;
  const icuPatients = patients.filter(p => p.status === "ICU").length;
  const doctors = staff.filter(s => s.role === "Doctor").length;
  const nurses = staff.filter(s => s.role === "Nurse").length;

  // Calculate utilization percentages
  const bedUtilization = bedResource ? Math.round((bedResource.used / bedResource.total) * 100) : 78;
  const icuUtilization = icuResource ? Math.round((icuResource.used / icuResource.total) * 100) : 90;
  const oxygenUtilization = oxygenResource ? Math.round((oxygenResource.used / oxygenResource.total) * 100) : 75;

  // Generate dynamic insights
  const insights = [
    {
      icon: BedDouble,
      title: "Bed Forecast",
      value: `${Math.round(totalPatients * 1.15)} beds needed`,
      period: "Next 7 days",
      current: bedResource ? `${bedResource.used} / ${bedResource.total} occupied` : "Loading...",
      recommendation: bedUtilization > 85 
        ? `High occupancy at ${bedUtilization}%. Consider temporary ward expansion.` 
        : `Occupancy at ${bedUtilization}%. Current capacity is adequate.`,
      severity: bedUtilization > 85 ? "critical" as const : bedUtilization > 70 ? "warning" as const : "info" as const,
    },
    {
      icon: Wind,
      title: "Oxygen Cylinder Demand",
      value: oxygenResource ? `${Math.round(oxygenResource.used * 1.3)} cylinders` : "Calculating...",
      period: "Next 7 days",
      current: oxygenResource ? `${oxygenResource.used} / ${oxygenResource.total} in use` : "Loading...",
      recommendation: oxygenUtilization > 70
        ? `Order ${Math.round((oxygenUtilization - 50) / 100 * oxygenResource?.total || 15)} additional cylinders. Respiratory cases trending up.`
        : "Current supply is adequate for projected demand.",
      severity: oxygenUtilization > 80 ? "critical" as const : oxygenUtilization > 60 ? "warning" as const : "info" as const,
    },
    {
      icon: UserCog,
      title: "Staff Requirement",
      value: `${Math.max(0, Math.round(totalPatients / 10 - doctors - nurses))} additional staff`,
      period: "Next 7 days",
      current: `${doctors} doctors, ${nurses} nurses on roster`,
      recommendation: totalPatients > (doctors + nurses) * 3
        ? `High patient-to-staff ratio. Consider hiring temporary staff.`
        : "Staff levels are adequate for current patient load.",
      severity: totalPatients > (doctors + nurses) * 4 ? "critical" as const : totalPatients > (doctors + nurses) * 3 ? "warning" as const : "info" as const,
    },
    {
      icon: TrendingUp,
      title: "Patient Load Projection",
      value: icuPatients > 15 ? "+20% increase" : "+5% increase",
      period: "Next 14 days",
      current: `Avg ${totalPatients} patients/day`,
      recommendation: icuPatients > 15
        ? "High ICU load detected. Activate contingency protocols."
        : "Normal patient flow expected. Monitor flu season trends.",
      severity: icuPatients > 15 ? "warning" as const : "info" as const,
    },
  ];

  const handleExport = () => {
    if (resources.length === 0) {
      toast.error("No resource data to export");
      return;
    }
    exportResourcesToExcel(resources);
    toast.success("Resources exported successfully");
  };

  if (loading.resources || loading.patients || loading.staff) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Resource Insights</h1>
            <p className="text-sm text-muted-foreground">AI-generated operational recommendations</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>

        {/* Resource Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {resources.map((resource) => {
            const utilization = Math.round((resource.used / resource.total) * 100);
            return (
              <div key={resource.id} className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">{resource.name}</p>
                <p className="text-lg font-semibold">{utilization}%</p>
                <p className="text-xs text-muted-foreground">{resource.used} / {resource.total} {resource.unit || "units"}</p>
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      utilization > 90 ? 'bg-destructive' : utilization > 70 ? 'bg-warning' : 'bg-primary'
                    }`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Insights Grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className={`bg-card border border-border rounded-lg p-5 border-l-4 ${severityBorder[insight.severity]}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <insight.icon className={`h-5 w-5 ${severityIcon[insight.severity]}`} />
                  <h3 className="text-sm font-semibold">{insight.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  {insight.period}
                </span>
              </div>
              <p className="text-2xl font-semibold mb-1">{insight.value}</p>
              <p className="text-xs text-muted-foreground mb-3">{insight.current}</p>
              <div className="flex items-start gap-2 bg-secondary/50 rounded-md p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
