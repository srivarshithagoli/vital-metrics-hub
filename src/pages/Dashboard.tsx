import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminAssistantPanel } from "@/components/AdminAssistantPanel";
import { KPICard } from "@/components/KPICard";
import { AlertPanel } from "@/components/AlertPanel";
import { Users, BedDouble, HeartPulse, Wind, Stethoscope, Loader2, Download } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/contexts/FirebaseContext";
import { exportAllToExcel } from "@/lib/excelUtils";
import { buildWeeklyAdmissions, calculateForecastMetrics, getResourceByName } from "@/lib/hospitalInsights";
import { toast } from "sonner";

export default function Dashboard() {
  const { patients, resources, staff, loading } = useFirebase();
  const admissionData = buildWeeklyAdmissions(patients);
  const metrics = calculateForecastMetrics(patients, resources, staff);

  const resourceData = resources.map((resource) => ({
    name: resource.name,
    used: resource.used,
    total: resource.total,
  }));

  const bedResource = getResourceByName(resources, ["beds"]);
  const icuResource = getResourceByName(resources, ["icu"]);
  const oxygenResource = getResourceByName(resources, ["o₂ cylinders", "oâ‚‚ cylinders", "oxygen cylinders"]);
  const doctorsOnDuty = staff.filter((member) => member.role === "Doctor").length;

  const handleExportAll = () => {
    if (patients.length === 0 && resources.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportAllToExcel(patients, [], staff, resources);
    toast.success("Data exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time hospital overview</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export All Data
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total Patients"
            value={loading.patients ? "..." : metrics.activePatients}
            subtitle="Active patients"
            icon={Users}
            trend={{ value: metrics.admissionsGrowthPct, label: "admissions vs last week" }}
            colorClass="text-kpi-patients"
          />
          <KPICard
            title="Bed Occupancy"
            value={loading.resources ? "..." : bedResource ? `${metrics.bedUtilization}%` : "0%"}
            subtitle={bedResource ? `${bedResource.used} / ${bedResource.total} beds` : loading.resources ? "Loading..." : "No bed data"}
            icon={BedDouble}
            trend={{ value: metrics.projectedBedDemand - metrics.activePatients, label: "projected demand gap" }}
            colorClass="text-kpi-beds"
          />
          <KPICard
            title="ICU Usage"
            value={loading.resources ? "..." : icuResource ? `${metrics.icuUtilization}%` : "0%"}
            subtitle={icuResource ? `${icuResource.used} / ${icuResource.total} beds` : loading.resources ? "Loading..." : "No ICU data"}
            icon={HeartPulse}
            trend={{ value: metrics.projectedIcuDemand - metrics.icuPatients, label: "projected ICU gap" }}
            colorClass="text-kpi-icu"
          />
          <KPICard
            title="O2 Consumption"
            value={loading.resources ? "..." : oxygenResource ? `${metrics.oxygenUtilization}%` : "0%"}
            subtitle={oxygenResource ? `${oxygenResource.used} / ${oxygenResource.total} cylinders` : loading.resources ? "Loading..." : "No oxygen data"}
            icon={Wind}
            trend={{ value: metrics.respiratoryGrowthPct, label: "respiratory trend" }}
            colorClass="text-kpi-oxygen"
          />
          <KPICard
            title="Available Doctors"
            value={loading.staff ? "..." : doctorsOnDuty}
            subtitle="On shift now"
            icon={Stethoscope}
            trend={{ value: metrics.projectedAdmissionsNext7, label: "projected admissions" }}
            colorClass="text-kpi-doctors"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Patient Admissions (This Week)</h3>
            {loading.patients ? (
              <div className="flex items-center justify-center h-[240px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={admissionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="admissions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Resource Utilization</h3>
            {loading.resources ? (
              <div className="flex items-center justify-center h-[240px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : resources.length === 0 ? (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground">
                No resource data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={resourceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="used" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Used" />
                  <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <AdminAssistantPanel compact />
        <AlertPanel />
      </div>
    </DashboardLayout>
  );
}
