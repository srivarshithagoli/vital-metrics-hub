import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useFirebase } from "@/contexts/FirebaseContext";
import { exportAllToExcel } from "@/lib/excelUtils";
import {
  buildWeeklyCapacityTrend,
  buildWeeklyPatientFlow,
  buildWeeklyOxygenTrend,
  calculateForecastMetrics,
  categorizeDiagnosis,
} from "@/lib/hospitalInsights";
import { toast } from "sonner";

const pieColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function Analytics() {
  const { patients, patientHistory, resources, resourceHistory, loading } = useFirebase();

  const diagnosisMap = new Map<string, number>();
  patients.forEach((patient) => {
    const category = categorizeDiagnosis(patient.diagnosis);
    diagnosisMap.set(category, (diagnosisMap.get(category) || 0) + 1);
  });

  const diagnosisDistribution = Array.from(diagnosisMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const patientFlowData = buildWeeklyPatientFlow(patientHistory, patients);
  const capacityTrend = buildWeeklyCapacityTrend(resourceHistory, resources);
  const oxygenTrend = buildWeeklyOxygenTrend(patients, resources, resourceHistory);
  const hasPatientHistory = patientFlowData.some((entry) => entry.admissions > 0 || entry.discharges > 0);
  const hasCapacityHistory = capacityTrend.some((entry) => entry.bedsAvailable > 0 || entry.roomsAvailable > 0);
  const hasOxygenHistory = oxygenTrend.some((entry) => entry.usage > 0);
  const metrics = calculateForecastMetrics(patients, resources, []);

  const predictions = [
    {
      label: "Projected Admissions",
      value: `${metrics.projectedAdmissionsNext7}`,
      description: `${metrics.admissionsGrowthPct >= 0 ? "+" : ""}${metrics.admissionsGrowthPct}% vs previous week`,
    },
    {
      label: "Projected Bed Demand",
      value: `${metrics.projectedBedDemand}`,
      description: `Current bed occupancy ${metrics.bedUtilization}%`,
    },
    {
      label: "Projected ICU Demand",
      value: `${metrics.projectedIcuDemand}`,
      description: `Current ICU usage ${metrics.icuUtilization}%`,
    },
    {
      label: "Projected Oxygen Demand",
      value: `${metrics.projectedOxygenDemand}`,
      description: `${metrics.respiratoryGrowthPct >= 0 ? "+" : ""}${metrics.respiratoryGrowthPct}% respiratory trend`,
    },
  ];

  const handleExport = () => {
    exportAllToExcel(patients, [], [], resources);
    toast.success("Analytics data exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Trend analysis & predictions</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {predictions.map((prediction) => (
            <div key={prediction.label} className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">{prediction.label}</p>
              <p className="text-xl font-semibold text-primary">{loading.patients || loading.resources ? "..." : prediction.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{prediction.description}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Admissions vs Discharges (This Week)</h3>
            {loading.patientHistory && loading.patients ? (
              <div className="flex items-center justify-center h-[250px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !hasPatientHistory ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No Firebase patient history yet. New admissions and discharges will appear here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={patientFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="admissions" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-1))", r: 3 }} name="Admissions" />
                  <Line type="monotone" dataKey="discharges" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))", r: 3 }} name="Discharges" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Diagnosis Distribution</h3>
            {loading.patients ? (
              <div className="flex items-center justify-center h-[250px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : diagnosisDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No diagnosis data available
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={diagnosisDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {diagnosisDistribution.map((_, index) => (
                        <Cell key={index} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {diagnosisDistribution.map((diagnosis, index) => (
                    <div key={diagnosis.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                      {diagnosis.name} ({diagnosis.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Available Beds & Rooms (This Week)</h3>
            {loading.resourceHistory && loading.resources ? (
              <div className="flex items-center justify-center h-[220px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !hasCapacityHistory ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                No Firebase resource history yet. Update Beds or Rooms to build this trend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={capacityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="bedsAvailable" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-3))", r: 3 }} name="Beds Available" />
                  <Line type="monotone" dataKey="roomsAvailable" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-4))", r: 3 }} name="Rooms Available" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Oxygen Usage Trend (Weekly)</h3>
            {loading.patients || loading.resources || loading.resourceHistory ? (
              <div className="flex items-center justify-center h-[220px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !hasOxygenHistory ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                No Firebase oxygen history yet. Update Oxygen Cylinders to build this trend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={oxygenTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="usage" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
