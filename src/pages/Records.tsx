import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FileText, Search, Plus, Upload, Download, FileSpreadsheet, Trash2, Edit, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebase } from "@/contexts/FirebaseContext";
import { MedicalRecord } from "@/types";
import {
  exportRecordsToExcel,
  parseRecordsFromExcel,
  downloadRecordTemplate,
} from "@/lib/excelUtils";
import { toast } from "sonner";

const recordTypes = [
  "Lab Report",
  "X-Ray",
  "ECG Report",
  "Blood Work",
  "Prescription",
  "Discharge Summary",
  "MRI Scan",
  "CT Scan",
  "Ultrasound",
  "Other",
];

type RecordFormData = {
  patientId: string;
  patient: string;
  type: string;
  date: string;
  doctor: string;
  description: string;
};

type RecordFormProps = {
  formData: RecordFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecordFormData>>;
  patients: Array<{ id: string; name: string }>;
  onPatientSelect: (patientId: string) => void;
};

function RecordForm({ formData, setFormData, patients, onPatientSelect }: RecordFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="patient" className="text-right">Patient *</Label>
        <div className="col-span-3">
          <Select
            value={formData.patientId}
            onValueChange={onPatientSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.patient && (
            <p className="text-xs text-muted-foreground mt-1">
              Selected: {formData.patient}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="type" className="text-right">Type *</Label>
        <div className="col-span-3">
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select record type" />
            </SelectTrigger>
            <SelectContent>
              {recordTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="date" className="text-right">Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="doctor" className="text-right">Doctor *</Label>
        <Input
          id="doctor"
          value={formData.doctor}
          onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
          className="col-span-3"
          placeholder="Attending doctor"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="col-span-3"
          placeholder="Additional notes"
        />
      </div>
    </div>
  );
}

export default function Records() {
  const { records, patients, loading, addRecord, updateRecord, deleteRecord, bulkAddRecords } = useFirebase();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<RecordFormData>({
    patientId: "",
    patient: "",
    type: "",
    date: new Date().toISOString().split("T")[0],
    doctor: "",
    description: "",
  });

  // Filter records based on search query
  const filteredRecords = records.filter((r) =>
    r.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.doctor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      patientId: "",
      patient: "",
      type: "",
      date: new Date().toISOString().split("T")[0],
      doctor: "",
      description: "",
    });
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setFormData((prev) => ({
        ...prev,
        patientId: patient.id,
        patient: patient.name,
      }));
    }
  };

  const handleAddRecord = async () => {
    if (!formData.patient || !formData.type || !formData.doctor) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newRecord = {
      patientId: formData.patientId,
      patient: formData.patient,
      type: formData.type,
      date: formData.date,
      doctor: formData.doctor,
      description: formData.description,
    };

    // Close immediately after validation so dialog behavior is consistent.
    setIsAddDialogOpen(false);

    try {
      await addRecord(newRecord);
      toast.success("Record added successfully");
      resetForm();
    } catch (error) {
      toast.error("Failed to add record");
      console.error(error);
    }
  };

  const handleEditRecord = async () => {
    if (!editingRecord || !formData.patient || !formData.type || !formData.doctor) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateRecord(editingRecord.id, {
        patientId: formData.patientId,
        patient: formData.patient,
        type: formData.type,
        date: formData.date,
        doctor: formData.doctor,
        description: formData.description,
      });
      toast.success("Record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update record");
      console.error(error);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteRecord(id);
        toast.success("Record deleted successfully");
      } catch (error) {
        toast.error("Failed to delete record");
        console.error(error);
      }
    }
  };

  const openEditDialog = (record: MedicalRecord) => {
    setEditingRecord(record);
    setFormData({
      patientId: record.patientId,
      patient: record.patient,
      type: record.type,
      date: record.date,
      doctor: record.doctor,
      description: record.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedRecords = await parseRecordsFromExcel(file);
      if (parsedRecords.length === 0) {
        toast.error("No valid record data found in the file");
        return;
      }

      await bulkAddRecords(parsedRecords);
      toast.success(`Successfully imported ${parsedRecords.length} records`);
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
    if (records.length === 0) {
      toast.error("No records to export");
      return;
    }
    exportRecordsToExcel(records);
    toast.success("Records exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Records</h1>
            <p className="text-sm text-muted-foreground">Medical records and documents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-3.5 w-3.5" /> Export Excel
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              className="pl-9 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-3.5 w-3.5" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Records from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file with record data. The file should have columns: Patient ID, Patient Name, Type, Date, Doctor, Description.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex flex-col items-center gap-4">
                  <Button variant="outline" onClick={downloadRecordTemplate} className="gap-2">
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
                <Plus className="h-3.5 w-3.5" /> Add Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Record</DialogTitle>
                <DialogDescription>
                  Enter the medical record details below.
                </DialogDescription>
              </DialogHeader>
              <RecordForm
                formData={formData}
                setFormData={setFormData}
                patients={patients}
                onPatientSelect={handlePatientSelect}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddRecord}>Add Record</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading.records ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredRecords.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
                No records found. Add a new record or import from Excel.
              </div>
            ) : (
              filteredRecords.map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
                  <div className="p-2 bg-secondary rounded-md">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{r.type}</p>
                      <span className="text-xs text-muted-foreground font-mono">{r.id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.patient} · {r.doctor} · {r.date}</p>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(r)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRecord(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Record</DialogTitle>
              <DialogDescription>
                Update the record details below.
              </DialogDescription>
            </DialogHeader>
            <RecordForm
              formData={formData}
              setFormData={setFormData}
              patients={patients}
              onPatientSelect={handlePatientSelect}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditRecord}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
