import { DashboardLayout } from "@/components/DashboardLayout";
import { Building2, TrendingUp, BedDouble, Wrench, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useFirebase } from "@/contexts/FirebaseContext";
import { exportResourcesToExcel } from "@/lib/excelUtils";
import { calculateForecastMetrics, getResourceByName, getUtilization } from "@/lib/hospitalInsights";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  Planning: "bg-warning/10 text-warning",
  "In Progress": "bg-primary/10 text-primary",
  Proposed: "bg-muted text-muted-foreground",
  Active: "bg-success/10 text-success",
};

type PlanStatus = keyof typeof statusStyle;

export default function InfrastructurePlanning() {
  const { patients, resources, staff, loading } = useFirebase();
  const metrics = calculateForecastMetrics(patients, resources, staff);

  const beds = getResourceByName(resources, ["beds"]);
  const icu = getResourceByName(resources, ["icu"]);
  const oxygen = getResourceByName(resources, ["oâ‚‚ cylinders", "oÃ¢â€šâ€š cylinders", "oxygen cylinders"]);
  const ventilators = getResourceByName(resources, ["ventilators"]);

  const expansionData = resources.map((resource) => {
    const normalizedName = String(resource.name || "").toLowerCase();
    let needed = resource.used;

    if (normalizedName === "beds") {
      needed = Math.max(resource.used, metrics.projectedBedDemand);
    } else if (normalizedName === "icu") {
      needed = Math.max(resource.used, metrics.projectedIcuDemand);
    } else if (["oâ‚‚ cylinders", "oÃ¢â€šâ€š cylinders", "oxygen cylinders"].includes(normalizedName)) {
      needed = Math.max(resource.used, metrics.projectedOxygenDemand);
    } else {
      needed = resource.used;
    }

    return {
      resource: resource.name,
      current: resource.total,
      needed: Math.min(Math.max(needed, resource.used), resource.total),
      inUse: resource.used,
    };
  });

  const getGap = (resourceName: string, projected: number) => {
    const resource = resources.find((item) => item.name.toLowerCase() === resourceName.toLowerCase());
    if (!resource) return null;
    return Math.max(projected - resource.total, 0);
  };

  const bedGap = beds ? Math.max(metrics.projectedBedDemand - beds.total, 0) : null;
  const icuGap = icu ? Math.max(metrics.projectedIcuDemand - icu.total, 0) : null;
  const oxygenGap = oxygen ? Math.max(metrics.projectedOxygenDemand - oxygen.total, 0) : null;
  const ventilatorUtilization = getUtilization(ventilators);
  const clinicalStaff = metrics.doctors + metrics.nurses;
  const staffingRatio = clinicalStaff > 0 ? Math.round((metrics.activePatients / clinicalStaff) * 10) / 10 : null;

  const plans: Array<{
    icon: typeof BedDouble;
    title: string;
    status: PlanStatus;
    detail: string;
  }> = [
    {
      icon: BedDouble,
      title: "Ward Capacity",
      status: beds ? (bedGap && bedGap > 0 ? "Planning" : getUtilization(beds) >= 85 ? "In Progress" : "Active") : "Proposed",
      detail: beds
        ? bedGap && bedGap > 0
          ? `Projected bed demand exceeds current capacity by ${bedGap} beds. Increase ward capacity or reduce occupancy pressure.`
          : `Beds are currently ${getUtilization(beds)}% utilized with ${beds.used} of ${beds.total} in use.`
        : "Add bed inventory data to start live ward-capacity planning.",
    },
    {
      icon: Building2,
      title: "ICU Capacity",
      status: icu ? (icuGap && icuGap > 0 ? "Planning" : getUtilization(icu) >= 85 ? "In Progress" : "Active") : "Proposed",
      detail: icu
        ? icuGap && icuGap > 0
          ? `Projected ICU demand exceeds current capacity by ${icuGap} beds. Prepare overflow or expansion planning.`
          : `ICU is currently ${getUtilization(icu)}% utilized with ${icu.used} of ${icu.total} beds in use.`
        : "Add ICU resource data to generate real infrastructure recommendations.",
    },
    {
      icon: Wrench,
      title: "Critical Equipment",
      status: ventilators
        ? ventilatorUtilization >= 80
          ? "In Progress"
          : "Active"
        : oxygen
          ? oxygenGap && oxygenGap > 0
            ? "Planning"
            : getUtilization(oxygen) >= 80
              ? "In Progress"
              : "Active"
          : "Proposed",
      detail: ventilators
        ? `Ventilators are ${ventilatorUtilization}% utilized with ${ventilators.used} of ${ventilators.total} currently in use.`
        : oxygen
          ? oxygenGap && oxygenGap > 0
            ? `Projected oxygen demand exceeds current supply by ${oxygenGap} cylinders. Procurement should be planned.`
            : `Oxygen cylinders are ${getUtilization(oxygen)}% utilized with ${oxygen.used} of ${oxygen.total} in use.`
          : "Add oxygen or ventilator inventory to monitor equipment strain.",
    },
    {
      icon: TrendingUp,
      title: "Operational Readiness",
      status: staffingRatio === null ? "Proposed" : staffingRatio > 3.5 ? "Planning" : "Active",
      detail:
        staffingRatio === null
          ? "Add doctor and nurse staffing data to generate live readiness planning."
          : `Current patient-to-clinical-staff ratio is ${staffingRatio}. Active patients: ${metrics.activePatients}, clinical staff: ${clinicalStaff}.`,
    },
  ];

  const handleExport = () => {
    if (resources.length === 0) {
      toast.error("No resource data to export");
      return;
    }
    exportResourcesToExcel(resources);
    toast.success("Infrastructure data exported successfully");
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
            <h1 className="text-xl font-semibold">Infrastructure Planning</h1>
            <p className="text-sm text-muted-foreground">Capacity planning from live hospital resource data</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {resources.length === 0 ? (
            <div className="col-span-full rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No resource inventory found. Add resources manually or import them from Excel in the Resource Insights page.
            </div>
          ) : (
            resources.slice(0, 4).map((resource) => {
              const utilization = getUtilization(resource);
              return (
                <div key={resource.id} className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">{resource.name}</p>
                  <p className="text-lg font-semibold">{utilization}%</p>
                  <p className="text-xs text-muted-foreground">
                    {resource.used} / {resource.total} {resource.unit || "units"}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Resource Capacity: Current vs Needed</h3>
          {expansionData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground">
              No resource data available for the infrastructure chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={expansionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="resource" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="current" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Current Capacity" />
                <Bar dataKey="needed" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Needed Capacity" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.title} className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
              <div className="p-2 rounded-md bg-secondary">
                <plan.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold">{plan.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusStyle[plan.status]}`}>{plan.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
