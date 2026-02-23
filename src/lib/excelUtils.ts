import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Patient, MedicalRecord, Staff, Resource } from "@/types";

// Helper to convert date to string
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "";
  if (typeof date === "string") return date;
  return date.toISOString().split("T")[0];
};

// Export patients to Excel
export function exportPatientsToExcel(patients: Patient[], filename = "patients.xlsx") {
  const data = patients.map((p) => ({
    "Patient ID": p.id,
    "Name": p.name,
    "Age": p.age,
    "Diagnosis": p.diagnosis,
    "Admission Date": formatDate(p.date),
    "Status": p.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Patients");

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String((row as Record<string, unknown>)[key]).length)),
  }));
  ws["!cols"] = colWidths;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}

// Export medical records to Excel
export function exportRecordsToExcel(records: MedicalRecord[], filename = "medical_records.xlsx") {
  const data = records.map((r) => ({
    "Record ID": r.id,
    "Patient ID": r.patientId,
    "Patient Name": r.patient,
    "Type": r.type,
    "Date": formatDate(r.date),
    "Doctor": r.doctor,
    "Description": r.description || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Medical Records");

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String((row as Record<string, unknown>)[key]).length)),
  }));
  ws["!cols"] = colWidths;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}

// Export staff to Excel
export function exportStaffToExcel(staff: Staff[], filename = "staff.xlsx") {
  const data = staff.map((s) => ({
    "Staff ID": s.id,
    "Name": s.name,
    "Role": s.role,
    "Department": s.department,
    "Shift": s.shift,
    "Phone": s.phone || "",
    "Email": s.email || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Staff");

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String((row as Record<string, unknown>)[key]).length)),
  }));
  ws["!cols"] = colWidths;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}

// Export resources to Excel
export function exportResourcesToExcel(resources: Resource[], filename = "resources.xlsx") {
  const data = resources.map((r) => ({
    "Resource": r.name,
    "Used": r.used,
    "Total": r.total,
    "Available": r.total - r.used,
    "Utilization %": Math.round((r.used / r.total) * 100) + "%",
    "Unit": r.unit || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resources");

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String((row as Record<string, unknown>)[key]).length)),
  }));
  ws["!cols"] = colWidths;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}

// Export all data to a single Excel file with multiple sheets
export function exportAllToExcel(
  patients: Patient[],
  records: MedicalRecord[],
  staff: Staff[],
  resources: Resource[],
  filename = "hospital_data.xlsx"
) {
  const wb = XLSX.utils.book_new();

  // Patients sheet
  if (patients.length > 0) {
    const patientsData = patients.map((p) => ({
      "Patient ID": p.id,
      "Name": p.name,
      "Age": p.age,
      "Diagnosis": p.diagnosis,
      "Admission Date": formatDate(p.date),
      "Status": p.status,
    }));
    const wsPatients = XLSX.utils.json_to_sheet(patientsData);
    XLSX.utils.book_append_sheet(wb, wsPatients, "Patients");
  }

  // Records sheet
  if (records.length > 0) {
    const recordsData = records.map((r) => ({
      "Record ID": r.id,
      "Patient ID": r.patientId,
      "Patient Name": r.patient,
      "Type": r.type,
      "Date": formatDate(r.date),
      "Doctor": r.doctor,
      "Description": r.description || "",
    }));
    const wsRecords = XLSX.utils.json_to_sheet(recordsData);
    XLSX.utils.book_append_sheet(wb, wsRecords, "Medical Records");
  }

  // Staff sheet
  if (staff.length > 0) {
    const staffData = staff.map((s) => ({
      "Staff ID": s.id,
      "Name": s.name,
      "Role": s.role,
      "Department": s.department,
      "Shift": s.shift,
      "Phone": s.phone || "",
      "Email": s.email || "",
    }));
    const wsStaff = XLSX.utils.json_to_sheet(staffData);
    XLSX.utils.book_append_sheet(wb, wsStaff, "Staff");
  }

  // Resources sheet
  if (resources.length > 0) {
    const resourcesData = resources.map((r) => ({
      "Resource": r.name,
      "Used": r.used,
      "Total": r.total,
      "Available": r.total - r.used,
      "Utilization %": Math.round((r.used / r.total) * 100) + "%",
    }));
    const wsResources = XLSX.utils.json_to_sheet(resourcesData);
    XLSX.utils.book_append_sheet(wb, wsResources, "Resources");
  }

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}

// Parse patients from Excel file
export function parsePatientsFromExcel(file: File): Promise<Omit<Patient, "id" | "createdAt" | "updatedAt">[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const patients = jsonData.map((row: unknown) => {
          const r = row as Record<string, unknown>;
          return {
            name: String(r["Name"] || r["name"] || ""),
            age: Number(r["Age"] || r["age"] || 0),
            diagnosis: String(r["Diagnosis"] || r["diagnosis"] || ""),
            date: String(r["Admission Date"] || r["Date"] || r["date"] || new Date().toISOString().split("T")[0]),
            status: (r["Status"] || r["status"] || "Admitted") as Patient["status"],
          };
        }).filter((p) => p.name && p.age);

        resolve(patients);
      } catch (error) {
        reject(new Error("Failed to parse Excel file. Please check the format."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// Parse medical records from Excel file
export function parseRecordsFromExcel(file: File): Promise<Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const records = jsonData.map((row: unknown) => {
          const r = row as Record<string, unknown>;
          return {
            patientId: String(r["Patient ID"] || r["patientId"] || ""),
            patient: String(r["Patient Name"] || r["Patient"] || r["patient"] || ""),
            type: String(r["Type"] || r["type"] || ""),
            date: String(r["Date"] || r["date"] || new Date().toISOString().split("T")[0]),
            doctor: String(r["Doctor"] || r["doctor"] || ""),
            description: String(r["Description"] || r["description"] || ""),
          };
        }).filter((r) => r.patient && r.type);

        resolve(records);
      } catch (error) {
        reject(new Error("Failed to parse Excel file. Please check the format."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// Parse staff from Excel file
export function parseStaffFromExcel(file: File): Promise<Omit<Staff, "id" | "createdAt" | "updatedAt">[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const staff = jsonData.map((row: unknown) => {
          const r = row as Record<string, unknown>;
          return {
            name: String(r["Name"] || r["name"] || ""),
            role: (r["Role"] || r["role"] || "Nurse") as Staff["role"],
            department: String(r["Department"] || r["department"] || ""),
            shift: (r["Shift"] || r["shift"] || "Morning") as Staff["shift"],
            phone: String(r["Phone"] || r["phone"] || ""),
            email: String(r["Email"] || r["email"] || ""),
          };
        }).filter((s) => s.name && s.department);

        resolve(staff);
      } catch (error) {
        reject(new Error("Failed to parse Excel file. Please check the format."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// Generate Excel template for patients
export function downloadPatientTemplate() {
  const template = [
    {
      "Name": "John Doe",
      "Age": 45,
      "Diagnosis": "Example Diagnosis",
      "Admission Date": new Date().toISOString().split("T")[0],
      "Status": "Admitted",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Patients");

  // Add instructions as a second sheet
  const instructions = [
    { "Field": "Name", "Description": "Patient's full name", "Required": "Yes", "Example": "John Doe" },
    { "Field": "Age", "Description": "Patient's age in years", "Required": "Yes", "Example": "45" },
    { "Field": "Diagnosis", "Description": "Medical diagnosis", "Required": "Yes", "Example": "Pneumonia" },
    { "Field": "Admission Date", "Description": "Date in YYYY-MM-DD format", "Required": "Yes", "Example": "2026-02-21" },
    { "Field": "Status", "Description": "One of: Admitted, Under Treatment, ICU, Pre-Surgery, Discharged, Outpatient", "Required": "Yes", "Example": "Admitted" },
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, "patient_template.xlsx");
}

// Generate Excel template for staff
export function downloadStaffTemplate() {
  const template = [
    {
      "Name": "Dr. Jane Smith",
      "Role": "Doctor",
      "Department": "ER",
      "Shift": "Morning",
      "Phone": "+91-9876543210",
      "Email": "jane.smith@hospital.com",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Staff");

  const instructions = [
    { "Field": "Name", "Description": "Staff member's full name", "Required": "Yes", "Example": "Dr. Jane Smith" },
    { "Field": "Role", "Description": "One of: Doctor, Nurse, Technician, Admin", "Required": "Yes", "Example": "Doctor" },
    { "Field": "Department", "Description": "Department code (ER, ICU, General, Surgery, etc.)", "Required": "Yes", "Example": "ER" },
    { "Field": "Shift", "Description": "One of: Morning, Afternoon, Night", "Required": "Yes", "Example": "Morning" },
    { "Field": "Phone", "Description": "Contact phone number", "Required": "No", "Example": "+91-9876543210" },
    { "Field": "Email", "Description": "Email address", "Required": "No", "Example": "jane@hospital.com" },
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, "staff_template.xlsx");
}

// Generate Excel template for medical records
export function downloadRecordTemplate() {
  const template = [
    {
      "Patient ID": "P-1001",
      "Patient Name": "John Doe",
      "Type": "Lab Report",
      "Date": new Date().toISOString().split("T")[0],
      "Doctor": "Dr. Smith",
      "Description": "Blood test results",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Records");

  const instructions = [
    { "Field": "Patient ID", "Description": "Unique patient identifier", "Required": "Yes", "Example": "P-1001" },
    { "Field": "Patient Name", "Description": "Patient's full name", "Required": "Yes", "Example": "John Doe" },
    { "Field": "Type", "Description": "Type of record (Lab Report, X-Ray, ECG, etc.)", "Required": "Yes", "Example": "Lab Report" },
    { "Field": "Date", "Description": "Date in YYYY-MM-DD format", "Required": "Yes", "Example": "2026-02-21" },
    { "Field": "Doctor", "Description": "Attending doctor's name", "Required": "Yes", "Example": "Dr. Smith" },
    { "Field": "Description", "Description": "Additional notes or description", "Required": "No", "Example": "Blood test results" },
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, "record_template.xlsx");
}
