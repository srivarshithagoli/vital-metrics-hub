// Patient types
export interface Patient {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  date: string;
  status: "Admitted" | "Under Treatment" | "ICU" | "Pre-Surgery" | "Discharged" | "Outpatient";
  createdAt?: Date;
  updatedAt?: Date;
}

// Staff types
export interface Staff {
  id: string;
  name: string;
  role: "Doctor" | "Nurse" | "Technician" | "Admin";
  department: string;
  shift: "Morning" | "Afternoon" | "Night";
  phone?: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Department staffing
export interface DepartmentStaffing {
  id: string;
  dept: string;
  doctors: number;
  nurses: number;
  required_doctors: number;
  required_nurses: number;
}

// Medical Record types
export interface MedicalRecord {
  id: string;
  patientId: string;
  patient: string;
  type: string;
  date: string;
  doctor: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Resource types
export interface Resource {
  id: string;
  name: string;
  used: number;
  total: number;
  unit?: string;
  updatedAt?: Date;
}

// Daily admission data
export interface DailyAdmission {
  id: string;
  day: string;
  admissions: number;
  discharges?: number;
  date: string;
}

// Monthly stats
export interface MonthlyStats {
  id: string;
  month: string;
  admissions: number;
  discharges: number;
  year: number;
}

// Alert types
export interface Alert {
  id: string;
  type: "warning" | "critical" | "info";
  message: string;
  department?: string;
  timestamp: Date;
  acknowledged: boolean;
}

// Excel upload result
export interface ExcelUploadResult {
  success: boolean;
  message: string;
  data?: unknown[];
  errors?: string[];
}

// Dashboard KPI data
export interface DashboardKPI {
  totalPatients: number;
  bedOccupancy: number;
  totalBeds: number;
  icuUsage: number;
  icuBeds: number;
  oxygenConsumption: number;
  oxygenCylinders: number;
  availableDoctors: number;
}
