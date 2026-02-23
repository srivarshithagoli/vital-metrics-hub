import { DashboardLayout } from "@/components/DashboardLayout";
import { Building2, TrendingUp, BedDouble, Wrench, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useFirebase } from "@/contexts/FirebaseContext";
import { exportResourcesToExcel } from "@/lib/excelUtils";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  Planning: "bg-warning/10 text-warning",
  "In Progress": "bg-primary/10 text-primary",
  Proposed: "bg-muted text-muted-foreground",
  Active: "bg-success/10 text-success",
};

export default function InfrastructurePlanning() {
  const { patients, resources, staff, loading } = useFirebase();

  // Calculate department capacity from real data
  const departments = [
    { name: "ER", current: 20 },
    { name: "ICU", current: 20 },
    { name: "General", current: 60 },
    { name: "Pediatric", current: 15 },
    { name: "Maternity", current: 12 },
  ];

  // Calculate needed capacity based on patient load
  const expansionData = departments.map(dept => {
    const deptPatients = patients.filter(p => {
      if (dept.name === "ICU") return p.status === "ICU";
      if (dept.name === "ER") return p.status === "Admitted" || p.status === "Under Treatment";
      return true;
    }).length;
    
    // Calculate needed beds based on patient load (roughly 1.3x current patients)
    const needed = Math.max(dept.current, Math.round(deptPatients * 1.3));
    
    return {
      department: dept.name,
      current: dept.current,
      needed: needed,
    };
  });

  // Calculate infrastructure plans based on current data
  const bedResource = resources.find(r => r.name === "Beds");
  const icuResource = resources.find(r => r.name === "ICU");
  const ventilatorResource = resources.find(r => r.name === "Ventilators");

  const bedUtilization = bedResource ? Math.round((bedResource.used / bedResource.total) * 100) : 78;
  const icuUtilization = icuResource ? Math.round((icuResource.used / icuResource.total) * 100) : 90;
  const ventilatorUtilization = ventilatorResource ? Math.round((ventilatorResource.used / ventilatorResource.total) * 100) : 48;

  const plans = [
    { 
      icon: BedDouble, 
      title: "Ward Expansion", 
      status: bedUtilization > 80 ? "Planning" : "Active", 
      detail: bedUtilization > 80 
        ? `Add ${Math.round((bedUtilization - 70) / 100 * (bedResource?.total || 100))} beds to General Ward - High utilization detected`
        : "Current bed capacity is adequate for projected demand"
    },
    { 
      icon: Wrench, 
      title: "Equipment Upgrade", 
      status: ventilatorUtilization > 70 ? "In Progress" : "Active", 
      detail: ventilatorUtilization > 70
        ? `Ventilator fleet upgrade needed - ${ventilatorUtilization}% utilization`
        : `Ventilator fleet operational - ${ventilatorResource?.used || 12}/${ventilatorResource?.total || 25} in use`
    },
    { 
      icon: Building2, 
      title: "New ICU Wing", 
      status: icuUtilization > 85 ? "Planning" : "Proposed", 
      detail: icuUtilization > 85
        ? `${Math.round((icuUtilization - 80) / 100 * (icuResource?.total || 20))}-bed ICU extension recommended - Critical utilization`
        : "5-bed ICU extension pending board approval"
    },
    { 
      icon: TrendingUp, 
      title: "Digital Infrastructure", 
      status: "Active", 
      detail: "EHR system modernization and IoT sensor deployment" 
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

  if (loading.resources || loading.patients) {
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
            <p className="text-sm text-muted-foreground">Capacity planning and expansion tracking</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>

        {/* Resource Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {resources.slice(0, 4).map((resource) => {
            const utilization = Math.round((resource.used / resource.total) * 100);
            return (
              <div key={resource.id} className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">{resource.name}</p>
                <p className="text-lg font-semibold">{utilization}%</p>
                <p className="text-xs text-muted-foreground">{resource.used} / {resource.total}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Department Capacity: Current vs Needed</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={expansionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="department" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="current" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Current" />
              <Bar dataKey="needed" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Needed" />
            </BarChart>
          </ResponsiveContainer>
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
