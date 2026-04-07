import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BedDouble, Wind, UserCog, TrendingUp, AlertTriangle, Loader2, Download, Upload, Plus, FileSpreadsheet, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFirebase } from "@/contexts/FirebaseContext";
import { AdminAssistantPanel } from "@/components/AdminAssistantPanel";
import { downloadResourceTemplate, exportResourcesToExcel, parseResourcesFromExcel } from "@/lib/excelUtils";
import { calculateForecastMetrics, getResourceByName } from "@/lib/hospitalInsights";
import { toast } from "sonner";
import { Resource } from "@/types";

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

type ResourceFormData = {
  name: string;
  category: string;
  customName: string;
  used: string;
  total: string;
  unit: string;
};

type ResourceFormProps = {
  formData: ResourceFormData;
  setFormData: React.Dispatch<React.SetStateAction<ResourceFormData>>;
};

function ResourceForm({ formData, setFormData }: ResourceFormProps) {
  const showCustomName = formData.category === "Medicines" || formData.category === "Equipment" || formData.category === "Other";

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="resource-name" className="text-right">Name *</Label>
        <div className="col-span-3 space-y-3">
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                category: value,
                name: value === "Beds" ? "Beds" :
                  value === "Oxygen Cylinders" ? "Oxygen Cylinders" :
                  value === "Rooms" ? "Rooms" :
                  value === "ICU Units" ? "ICU" :
                  value === "Medicines" || value === "Equipment" || value === "Other" ? current.name : value,
                unit:
                  value === "Beds" ? "beds" :
                  value === "Oxygen Cylinders" ? "cylinders" :
                  value === "Rooms" ? "rooms" :
                  value === "ICU Units" ? "units" :
                  current.unit,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a resource type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Beds">Beds</SelectItem>
              <SelectItem value="Oxygen Cylinders">Oxygen Cylinders</SelectItem>
              <SelectItem value="Rooms">Rooms</SelectItem>
              <SelectItem value="ICU Units">ICU Units</SelectItem>
              <SelectItem value="Medicines">Medicines</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Other">Other Resource</SelectItem>
            </SelectContent>
          </Select>
          {showCustomName ? (
            <Input
              id="resource-name"
              value={formData.customName}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  customName: event.target.value,
                  name: current.category === "Other" ? event.target.value : `${current.category} - ${event.target.value}`,
                }))
              }
              placeholder={
                formData.category === "Medicines"
                  ? "Medicine name"
                  : formData.category === "Equipment"
                    ? "Equipment name"
                    : "Resource name"
              }
            />
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="resource-used" className="text-right">Used *</Label>
        <Input
          id="resource-used"
          type="number"
          min="0"
          value={formData.used}
          onChange={(event) => setFormData((current) => ({ ...current, used: event.target.value }))}
          className="col-span-3"
          placeholder="78"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="resource-total" className="text-right">Total *</Label>
        <Input
          id="resource-total"
          type="number"
          min="1"
          value={formData.total}
          onChange={(event) => setFormData((current) => ({ ...current, total: event.target.value }))}
          className="col-span-3"
          placeholder="100"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="resource-unit" className="text-right">Unit</Label>
        <Input
          id="resource-unit"
          value={formData.unit}
          onChange={(event) => setFormData((current) => ({ ...current, unit: event.target.value }))}
          className="col-span-3"
          placeholder="beds, cylinders, rooms..."
        />
      </div>
    </div>
  );
}

export default function ResourceInsights() {
  const { patients, resources, staff, loading, addResource, updateResource, deleteResource, bulkAddResources } = useFirebase();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ResourceFormData>({
    name: "",
    category: "",
    customName: "",
    used: "",
    total: "",
    unit: "",
  });
  const metrics = calculateForecastMetrics(patients, resources, staff);

  const bedResource = getResourceByName(resources, ["beds"]);
  const icuResource = getResourceByName(resources, ["icu"]);
  const oxygenResource = getResourceByName(resources, ["o₂ cylinders", "oâ‚‚ cylinders", "oxygen cylinders"]);

  const insights = [
    {
      icon: BedDouble,
      title: "Bed Forecast",
      value: `${metrics.projectedBedDemand} beds needed`,
      period: "Next 7 days",
      current: bedResource ? `${bedResource.used} / ${bedResource.total} occupied` : "Loading...",
      recommendation:
        metrics.bedUtilization > 85
          ? `High occupancy at ${metrics.bedUtilization}%. Consider temporary ward expansion.`
          : `Occupancy at ${metrics.bedUtilization}%. Current capacity is adequate.`,
      severity: metrics.bedUtilization > 85 ? ("critical" as const) : metrics.bedUtilization > 70 ? ("warning" as const) : ("info" as const),
    },
    {
      icon: Wind,
      title: "Oxygen Cylinder Demand",
      value: oxygenResource ? `${metrics.projectedOxygenDemand} cylinders` : "Calculating...",
      period: "Next 7 days",
      current: oxygenResource ? `${oxygenResource.used} / ${oxygenResource.total} in use` : "Loading...",
      recommendation:
        metrics.oxygenUtilization > 70
          ? `Projected oxygen demand is ${metrics.projectedOxygenDemand}. Consider ordering ${Math.max(
              metrics.projectedOxygenDemand - (oxygenResource?.used || 0),
              0,
            )} additional cylinders.`
          : "Current supply is adequate for projected demand.",
      severity: metrics.oxygenUtilization > 80 ? ("critical" as const) : metrics.oxygenUtilization > 60 ? ("warning" as const) : ("info" as const),
    },
    {
      icon: UserCog,
      title: "Staff Requirement",
      value: `${Math.max(0, Math.round(metrics.activePatients / 10 - metrics.doctors - metrics.nurses))} additional staff`,
      period: "Next 7 days",
      current: `${metrics.doctors} doctors, ${metrics.nurses} nurses on roster`,
      recommendation:
        metrics.activePatients > (metrics.doctors + metrics.nurses) * 3
          ? "High patient-to-staff ratio. Consider hiring temporary staff."
          : "Staff levels are adequate for current patient load.",
      severity:
        metrics.activePatients > (metrics.doctors + metrics.nurses) * 4
          ? ("critical" as const)
          : metrics.activePatients > (metrics.doctors + metrics.nurses) * 3
            ? ("warning" as const)
            : ("info" as const),
    },
    {
      icon: TrendingUp,
      title: "Patient Load Projection",
      value: `${metrics.projectedAdmissionsNext7} projected admissions`,
      period: "Next 7 days",
      current: `${metrics.activePatients} active patients right now`,
      recommendation:
        metrics.projectedIcuDemand > metrics.icuPatients + 1
          ? "High ICU load detected. Activate contingency protocols."
          : "Normal patient flow expected. Monitor admissions trend.",
      severity: metrics.projectedIcuDemand > metrics.icuPatients + 1 ? ("warning" as const) : ("info" as const),
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

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      customName: "",
      used: "",
      total: "",
      unit: "",
    });
  };

  const validateResourceForm = () => {
    const used = Number(formData.used);
    const total = Number(formData.total);

    const finalName = (formData.name || "").trim();
    if (!finalName) {
      toast.error("Resource name is required");
      return null;
    }

    if (!Number.isFinite(used) || used < 0) {
      toast.error("Used quantity must be 0 or more");
      return null;
    }

    if (!Number.isFinite(total) || total <= 0) {
      toast.error("Total quantity must be more than 0");
      return null;
    }

    if (used > total) {
      toast.error("Used quantity cannot be greater than total");
      return null;
    }

    return {
      name: finalName,
      used,
      total,
      unit: formData.unit.trim() || "units",
    };
  };

  const handleAddResource = async () => {
    const payload = validateResourceForm();
    if (!payload) return;

    try {
      await addResource(payload);
      toast.success("Resource added successfully");
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add resource");
      console.error(error);
    }
  };

  const handleEditResource = async () => {
    if (!editingResource) return;
    const payload = validateResourceForm();
    if (!payload) return;

    try {
      await updateResource(editingResource.id, payload);
      toast.success("Resource updated successfully");
      setIsEditDialogOpen(false);
      setEditingResource(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update resource");
      console.error(error);
    }
  };

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      category:
        resource.name === "Beds" ? "Beds" :
        resource.name === "Oxygen Cylinders" ? "Oxygen Cylinders" :
        resource.name === "Rooms" ? "Rooms" :
        resource.name === "ICU Units" || resource.name === "ICU" ? "ICU Units" :
        resource.name.startsWith("Medicines - ") ? "Medicines" :
        resource.name.startsWith("Equipment - ") ? "Equipment" : "Other",
      customName:
        resource.name.startsWith("Medicines - ")
          ? resource.name.replace("Medicines - ", "")
          : resource.name.startsWith("Equipment - ")
            ? resource.name.replace("Equipment - ", "")
            : ["Beds", "Oxygen Cylinders", "Rooms", "ICU Units", "ICU"].includes(resource.name)
              ? ""
              : resource.name,
      used: resource.used.toString(),
      total: resource.total.toString(),
      unit: resource.unit || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) {
      return;
    }

    try {
      await deleteResource(id);
      toast.success("Resource deleted successfully");
    } catch (error) {
      toast.error("Failed to delete resource");
      console.error(error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedResources = await parseResourcesFromExcel(file);
      if (parsedResources.length === 0) {
        toast.error("No valid resource data found in the file");
        return;
      }

      await bulkAddResources(parsedResources);
      toast.success(`Successfully imported ${parsedResources.length} resources`);
      setIsUploadDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse Excel file");
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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

        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-3.5 w-3.5" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Resources from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file with resource data. Use columns like Resource, Used, Total, and Unit.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex flex-col items-center gap-4">
                  <Button variant="outline" onClick={downloadResourceTemplate} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Template
                  </Button>
                  <p className="text-sm text-muted-foreground">or</p>
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span>{isUploading ? "Uploading..." : "Choose File"}</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={resetForm}>
                <Plus className="h-3.5 w-3.5" /> Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                <DialogDescription>
                  Enter current available hospital infrastructure values like beds, ICU units, or oxygen cylinders.
                </DialogDescription>
              </DialogHeader>
              <ResourceForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddResource}>Add Resource</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loading.resources ? (
            <div className="col-span-full flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : resources.map((resource) => {
            const utilization = Math.round((resource.used / resource.total) * 100);
            return (
              <div key={resource.id} className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">{resource.name}</p>
                <p className="text-lg font-semibold">{utilization}%</p>
                <p className="text-xs text-muted-foreground">
                  {resource.used} / {resource.total} {resource.unit || "units"}
                </p>
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      utilization > 90 ? "bg-destructive" : utilization > 70 ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {(loading.resources || loading.patients || loading.staff) ? (
            <div className="md:col-span-2 flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : insights.map((insight) => (
            <div
              key={insight.title}
              className={`bg-card border border-border rounded-lg p-5 border-l-4 ${severityBorder[insight.severity]}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <insight.icon className={`h-5 w-5 ${severityIcon[insight.severity]}`} />
                  <h3 className="text-sm font-semibold">{insight.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{insight.period}</span>
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

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Resource Inventory</h3>
          </div>
          {loading.resources ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No resources found. Add them manually or import them from Excel.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Resource</TableHead>
                  <TableHead className="text-xs">Used</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Available</TableHead>
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="text-sm font-medium">{resource.name}</TableCell>
                    <TableCell className="text-sm">{resource.used}</TableCell>
                    <TableCell className="text-sm">{resource.total}</TableCell>
                    <TableCell className="text-sm">{resource.total - resource.used}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{resource.unit || "units"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(resource)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteResource(resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <AdminAssistantPanel />

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Resource</DialogTitle>
              <DialogDescription>
                Update the current resource values below.
              </DialogDescription>
            </DialogHeader>
            <ResourceForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditResource}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
