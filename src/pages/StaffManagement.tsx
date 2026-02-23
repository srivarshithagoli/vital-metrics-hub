import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { UserCog, Users, Clock, Plus, Upload, Download, FileSpreadsheet, Trash2, Edit, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
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
import { Staff } from "@/types";
import {
  exportStaffToExcel,
  parseStaffFromExcel,
  downloadStaffTemplate,
} from "@/lib/excelUtils";
import { toast } from "sonner";

const roles: Staff["role"][] = ["Doctor", "Nurse", "Technician", "Admin"];
const shifts: Staff["shift"][] = ["Morning", "Afternoon", "Night"];
const departments = ["ER", "ICU", "General", "Surgery", "Lab", "Pharmacy", "Radiology", "Admin"];

type StaffFormData = {
  name: string;
  role: Staff["role"];
  department: string;
  shift: Staff["shift"];
  phone: string;
  email: string;
};

type StaffFormProps = {
  formData: StaffFormData;
  setFormData: React.Dispatch<React.SetStateAction<StaffFormData>>;
};

function StaffForm({ formData, setFormData }: StaffFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="col-span-3"
          placeholder="Staff member name"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="role" className="text-right">Role *</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value as Staff["role"] })}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="department" className="text-right">Department *</Label>
        <Select
          value={formData.department}
          onValueChange={(value) => setFormData({ ...formData, department: value })}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="shift" className="text-right">Shift</Label>
        <Select
          value={formData.shift}
          onValueChange={(value) => setFormData({ ...formData, shift: value as Staff["shift"] })}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map((shift) => (
              <SelectItem key={shift} value={shift}>
                {shift}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="phone" className="text-right">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="col-span-3"
          placeholder="Contact number"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="col-span-3"
          placeholder="Email address"
        />
      </div>
    </div>
  );
}

export default function StaffManagement() {
  const { staff, loading, addStaff, updateStaff, deleteStaff, bulkAddStaff } = useFirebase();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<StaffFormData>({
    name: "",
    role: "Nurse",
    department: "",
    shift: "Morning",
    phone: "",
    email: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      role: "Nurse",
      department: "",
      shift: "Morning",
      phone: "",
      email: "",
    });
  };

  // Calculate stats
  const totalStaff = staff.length;
  const doctorsCount = staff.filter(s => s.role === "Doctor").length;
  const nursesCount = staff.filter(s => s.role === "Nurse").length;
  const onDutyNow = staff.filter(s => s.shift === "Morning").length; // Assuming morning shift is current

  const stats = [
    { icon: UserCog, label: "Total Staff", value: totalStaff.toString() },
    { icon: Users, label: "On Duty Now", value: onDutyNow.toString() },
    { icon: Clock, label: "Avg Shift Hours", value: "8.5h" },
  ];

  // Group staff by department
  const departmentData = departments.map(dept => {
    const deptStaff = staff.filter(s => s.department === dept);
    const doctors = deptStaff.filter(s => s.role === "Doctor").length;
    const nurses = deptStaff.filter(s => s.role === "Nurse").length;
    return {
      dept,
      doctors,
      nurses,
      required_doctors: dept === "ER" ? 10 : dept === "ICU" ? 6 : dept === "General" ? 6 : dept === "Surgery" ? 5 : 3,
      required_nurses: dept === "ER" ? 20 : dept === "ICU" ? 14 : dept === "General" ? 16 : dept === "Surgery" ? 8 : 4,
    };
  }).filter(d => d.doctors > 0 || d.nurses > 0);

  // Shift chart data
  const shiftChart = shifts.map(shift => ({
    shift,
    doctors: staff.filter(s => s.shift === shift && s.role === "Doctor").length,
    nurses: staff.filter(s => s.shift === shift && s.role === "Nurse").length,
  }));

  const handleAddStaff = async () => {
    if (!formData.name || !formData.department) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await addStaff({
        name: formData.name,
        role: formData.role,
        department: formData.department,
        shift: formData.shift,
        phone: formData.phone,
        email: formData.email,
      });
      toast.success("Staff member added successfully");
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add staff member");
      console.error(error);
    }
  };

  const handleEditStaff = async () => {
    if (!editingStaff || !formData.name || !formData.department) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateStaff(editingStaff.id, {
        name: formData.name,
        role: formData.role,
        department: formData.department,
        shift: formData.shift,
        phone: formData.phone,
        email: formData.email,
      });
      toast.success("Staff member updated successfully");
      setIsEditDialogOpen(false);
      setEditingStaff(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update staff member");
      console.error(error);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      try {
        await deleteStaff(id);
        toast.success("Staff member deleted successfully");
      } catch (error) {
        toast.error("Failed to delete staff member");
        console.error(error);
      }
    }
  };

  const openEditDialog = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      role: staffMember.role,
      department: staffMember.department,
      shift: staffMember.shift,
      phone: staffMember.phone || "",
      email: staffMember.email || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedStaff = await parseStaffFromExcel(file);
      if (parsedStaff.length === 0) {
        toast.error("No valid staff data found in the file");
        return;
      }

      await bulkAddStaff(parsedStaff);
      toast.success(`Successfully imported ${parsedStaff.length} staff members`);
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
    if (staff.length === 0) {
      toast.error("No staff to export");
      return;
    }
    exportStaffToExcel(staff);
    toast.success("Staff exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Staff Management</h1>
            <p className="text-sm text-muted-foreground">Staff allocation and shift planning</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-3.5 w-3.5" /> Export Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-3.5 w-3.5" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Staff from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file with staff data. The file should have columns: Name, Role, Department, Shift, Phone, Email.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex flex-col items-center gap-4">
                  <Button variant="outline" onClick={downloadStaffTemplate} className="gap-2">
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
                <Plus className="h-3.5 w-3.5" /> Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Enter the staff details below.
                </DialogDescription>
              </DialogHeader>
              <StaffForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddStaff}>Add Staff</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Department Staffing</h3>
          </div>
          {loading.staff ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : departmentData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff data available. Add staff members or import from Excel.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs">Doctors</TableHead>
                  <TableHead className="text-xs">Nurses</TableHead>
                  <TableHead className="text-xs">Doctor Gap</TableHead>
                  <TableHead className="text-xs">Nurse Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentData.map((s) => {
                  const docGap = s.required_doctors - s.doctors;
                  const nurseGap = s.required_nurses - s.nurses;
                  return (
                    <TableRow key={s.dept}>
                      <TableCell className="text-sm font-medium">{s.dept}</TableCell>
                      <TableCell className="text-sm">{s.doctors} / {s.required_doctors}</TableCell>
                      <TableCell className="text-sm">{s.nurses} / {s.required_nurses}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={docGap > 0 ? "text-destructive border-destructive/20" : "text-success border-success/20"}>
                          {docGap > 0 ? `-${docGap}` : "OK"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={nurseGap > 0 ? "text-destructive border-destructive/20" : "text-success border-success/20"}>
                          {nurseGap > 0 ? `-${nurseGap}` : "OK"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Staff List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">All Staff Members</h3>
          </div>
          {loading.staff ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff members found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs">Shift</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline" className={s.role === "Doctor" ? "text-primary border-primary/20" : ""}>
                        {s.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{s.department}</TableCell>
                    <TableCell className="text-sm">{s.shift}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.phone || s.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(s)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteStaff(s.id)}
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

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Staff by Shift</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={shiftChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="shift" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="doctors" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Doctors" />
              <Bar dataKey="nurses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Nurses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update the staff details below.
              </DialogDescription>
            </DialogHeader>
            <StaffForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditStaff}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
