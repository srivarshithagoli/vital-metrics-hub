import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, Upload, Download, FileSpreadsheet, Trash2, Edit, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebase } from "@/contexts/FirebaseContext";
import { Patient } from "@/types";
import {
  exportPatientsToExcel,
  parsePatientsFromExcel,
  downloadPatientTemplate,
} from "@/lib/excelUtils";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  Admitted: "bg-primary/10 text-primary border-primary/20",
  "Under Treatment": "bg-warning/10 text-warning border-warning/20",
  ICU: "bg-destructive/10 text-destructive border-destructive/20",
  "Pre-Surgery": "bg-kpi-beds/10 text-kpi-beds border-kpi-beds/20",
  Discharged: "bg-success/10 text-success border-success/20",
  Outpatient: "bg-muted text-muted-foreground border-border",
};

const statusOptions: Patient["status"][] = [
  "Admitted",
  "Under Treatment",
  "ICU",
  "Pre-Surgery",
  "Discharged",
  "Outpatient",
];

type PatientFormData = {
  name: string;
  age: string;
  diagnosis: string;
  date: string;
  status: Patient["status"];
};

type PatientFormProps = {
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
};

function PatientForm({ formData, setFormData }: PatientFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="col-span-3"
          placeholder="Patient name"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="age" className="text-right">Age *</Label>
        <Input
          id="age"
          type="number"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          className="col-span-3"
          placeholder="Patient age"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="diagnosis" className="text-right">Diagnosis *</Label>
        <Input
          id="diagnosis"
          value={formData.diagnosis}
          onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
          className="col-span-3"
          placeholder="Medical diagnosis"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="date" className="text-right">Admission Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="status" className="text-right">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as Patient["status"] })}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function Patients() {
  const { patients, loading, addPatient, updatePatient, deletePatient, bulkAddPatients } = useFirebase();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<PatientFormData>({
    name: "",
    age: "",
    diagnosis: "",
    date: new Date().toISOString().split("T")[0],
    status: "Admitted",
  });

  // Filter patients based on search query
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      age: "",
      diagnosis: "",
      date: new Date().toISOString().split("T")[0],
      status: "Admitted",
    });
  };

  const handleAddPatient = async () => {
    if (!formData.name || !formData.age || !formData.diagnosis) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await addPatient({
        name: formData.name,
        age: parseInt(formData.age),
        diagnosis: formData.diagnosis,
        date: formData.date,
        status: formData.status,
      });
      toast.success("Patient added successfully");
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add patient");
      console.error(error);
    }
  };

  const handleEditPatient = async () => {
    if (!editingPatient || !formData.name || !formData.age || !formData.diagnosis) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updatePatient(editingPatient.id, {
        name: formData.name,
        age: parseInt(formData.age),
        diagnosis: formData.diagnosis,
        date: formData.date,
        status: formData.status,
      });
      toast.success("Patient updated successfully");
      setIsEditDialogOpen(false);
      setEditingPatient(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update patient");
      console.error(error);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (confirm("Are you sure you want to delete this patient?")) {
      try {
        await deletePatient(id);
        toast.success("Patient deleted successfully");
      } catch (error) {
        toast.error("Failed to delete patient");
        console.error(error);
      }
    }
  };

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age.toString(),
      diagnosis: patient.diagnosis,
      date: patient.date,
      status: patient.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedPatients = await parsePatientsFromExcel(file);
      if (parsedPatients.length === 0) {
        toast.error("No valid patient data found in the file");
        return;
      }

      await bulkAddPatients(parsedPatients);
      toast.success(`Successfully imported ${parsedPatients.length} patients`);
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

  const handleExport = () => {
    if (patients.length === 0) {
      toast.error("No patients to export");
      return;
    }
    exportPatientsToExcel(patients);
    toast.success("Patients exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Patients</h1>
            <p className="text-sm text-muted-foreground">Manage patient records</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-3.5 w-3.5" /> Export Excel
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, diagnosis..."
              className="pl-9 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-3.5 w-3.5" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Patients from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file with patient data. The file should have columns: Name, Age, Diagnosis, Admission Date, Status.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex flex-col items-center gap-4">
                  <Button variant="outline" onClick={downloadPatientTemplate} className="gap-2">
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
                <Plus className="h-3.5 w-3.5" /> Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Patient</DialogTitle>
                <DialogDescription>
                  Enter the patient details below.
                </DialogDescription>
              </DialogHeader>
              <PatientForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddPatient}>Add Patient</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {loading.patients ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Patient ID</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Age</TableHead>
                  <TableHead className="text-xs">Diagnosis</TableHead>
                  <TableHead className="text-xs">Admission Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No patients found. Add a new patient or import from Excel.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer">
                      <TableCell className="text-sm font-mono text-muted-foreground">{p.id}</TableCell>
                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm">{p.age}</TableCell>
                      <TableCell className="text-sm">{p.diagnosis}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusStyles[p.status] || ""}`}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(p)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePatient(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
              <DialogDescription>
                Update the patient details below.
              </DialogDescription>
            </DialogHeader>
            <PatientForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditPatient}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
