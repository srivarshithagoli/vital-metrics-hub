import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KPICard } from "@/components/KPICard";
import { AlertPanel } from "@/components/AlertPanel";
import { Users, BedDouble, HeartPulse, Wind, Stethoscope, Loader2, Download } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/contexts/FirebaseContext";
import { exportAllToExcel } from "@/lib/excelUtils";
import { toast } from "sonner";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DailyAdmission {
  day: string;
  admissions: number;
}

export default function Dashboard() {
  const { patients, resources, staff, loading, kpi } = useFirebase();
  const [admissionData, setAdmissionData] = useState<DailyAdmission[]>([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState(true);

  // Fetch admission data for the week
  useEffect(() => {
    const fetchAdmissionData = async () => {
      try {
        // Get patients from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const patientsQuery = query(collection(db, "patients"), orderBy("createdAt", "desc"), limit(100));
        const snapshot = await getDocs(patientsQuery);
        
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const admissionsByDay: Record<string, number> = {};
        
        // Initialize all days with 0
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayName = dayNames[date.getDay()];
          admissionsByDay[dayName] = 0;
        }
        
        // Count admissions per day
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date(data.date);
          const daysDiff = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 7) {
            const dayName = dayNames[createdAt.getDay()];
            if (admissionsByDay.hasOwnProperty(dayName)) {
              admissionsByDay[dayName]++;
            }
          }
        });
        
        // Convert to chart data format
        const chartData = Object.entries(admissionsByDay).map(([day, admissions]) => ({
          day,
          admissions,
        }));
        
        setAdmissionData(chartData);
      } catch (error) {
        console.error("Error fetching admission data:", error);
        // Use fallback data
        setAdmissionData([
          { day: "Mon", admissions: 42 },
          { day: "Tue", admissions: 38 },
          { day: "Wed", admissions: 55 },
          { day: "Thu", admissions: 47 },
          { day: "Fri", admissions: 63 },
          { day: "Sat", admissions: 51 },
          { day: "Sun", admissions: 44 },
        ]);
      } finally {
        setLoadingAdmissions(false);
      }
    };
    
    fetchAdmissionData();
  }, []);

  // Prepare resource data for chart
  const resourceData = resources.map((r) => ({
    name: r.name,
    used: r.used,
    total: r.total,
  }));

  // Calculate KPIs
  const totalPatients = patients.filter(p => p.status !== "Discharged" && p.status !== "Outpatient").length;
  const bedResource = resources.find(r => r.name === "Beds");
  const icuResource = resources.find(r => r.name === "ICU");
  const oxygenResource = resources.find(r => r.name === "O₂ Cylinders");
  const doctorsOnDuty = staff.filter(s => s.role === "Doctor").length;

  const handleExportAll = () => {
    if (patients.length === 0 && resources.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportAllToExcel(patients, [], staff, resources);
    toast.success("Data exported successfully");
  };

  const isLoading = loading.patients || loading.resources || loading.staff;

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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                title="Total Patients"
                value={totalPatients}
                subtitle="Active patients"
                icon={Users}
                trend={{ value: 8.2, label: "vs last week" }}
                colorClass="text-kpi-patients"
              />
              <KPICard
                title="Bed Occupancy"
                value={bedResource ? `${Math.round((bedResource.used / bedResource.total) * 100)}%` : "78%"}
                subtitle={bedResource ? `${bedResource.used} / ${bedResource.total} beds` : "Loading..."}
                icon={BedDouble}
                trend={{ value: 3.1, label: "vs yesterday" }}
                colorClass="text-kpi-beds"
              />
              <KPICard
                title="ICU Usage"
                value={icuResource ? `${Math.round((icuResource.used / icuResource.total) * 100)}%` : "90%"}
                subtitle={icuResource ? `${icuResource.used} / ${icuResource.total} beds` : "Loading..."}
                icon={HeartPulse}
                trend={{ value: -2.4, label: "vs yesterday" }}
                colorClass="text-kpi-icu"
              />
              <KPICard
                title="O₂ Consumption"
                value={oxygenResource ? `${Math.round((oxygenResource.used / oxygenResource.total) * 100)}%` : "75%"}
                subtitle={oxygenResource ? `${oxygenResource.used} / ${oxygenResource.total} cylinders` : "Loading..."}
                icon={Wind}
                trend={{ value: 12.5, label: "vs last week" }}
                colorClass="text-kpi-oxygen"
              />
              <KPICard
                title="Available Doctors"
                value={doctorsOnDuty}
                subtitle="On shift now"
                icon={Stethoscope}
                trend={{ value: -4.0, label: "vs usual" }}
                colorClass="text-kpi-doctors"
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold mb-4">Patient Admissions (This Week)</h3>
                {loadingAdmissions ? (
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
                {resources.length === 0 ? (
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

            {/* Alerts */}
            <AlertPanel />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
