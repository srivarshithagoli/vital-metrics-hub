import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Patient, MedicalRecord, Staff, Resource, Alert, DashboardKPI } from "@/types";

interface FirebaseContextType {
  // Data
  patients: Patient[];
  records: MedicalRecord[];
  staff: Staff[];
  resources: Resource[];
  alerts: Alert[];
  kpi: DashboardKPI | null;
  
  // Loading states
  loading: {
    patients: boolean;
    records: boolean;
    staff: boolean;
    resources: boolean;
    alerts: boolean;
  };
  
  // Patient operations
  addPatient: (patient: Omit<Patient, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  
  // Record operations
  addRecord: (record: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateRecord: (id: string, record: Partial<MedicalRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  
  // Staff operations
  addStaff: (staff: Omit<Staff, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateStaff: (id: string, staff: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  
  // Resource operations
  updateResource: (id: string, resource: Partial<Resource>) => Promise<void>;
  
  // Alert operations
  acknowledgeAlert: (id: string) => Promise<void>;
  
  // Bulk operations
  bulkAddPatients: (patients: Omit<Patient, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  bulkAddRecords: (records: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  bulkAddStaff: (staff: Omit<Staff, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  
  const [loading, setLoading] = useState({
    patients: true,
    records: true,
    staff: true,
    resources: true,
    alerts: true,
  });

  // Real-time listeners
  useEffect(() => {
    // Patients listener
    const patientsQuery = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    const unsubPatients = onSnapshot(patientsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Patient[];
      setPatients(data);
      setLoading((prev) => ({ ...prev, patients: false }));
    });

    // Records listener
    const recordsQuery = query(collection(db, "records"), orderBy("createdAt", "desc"));
    const unsubRecords = onSnapshot(recordsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as MedicalRecord[];
      setRecords(data);
      setLoading((prev) => ({ ...prev, records: false }));
    });

    // Staff listener
    const staffQuery = query(collection(db, "staff"), orderBy("createdAt", "desc"));
    const unsubStaff = onSnapshot(staffQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Staff[];
      setStaff(data);
      setLoading((prev) => ({ ...prev, staff: false }));
    });

    // Resources listener
    const unsubResources = onSnapshot(collection(db, "resources"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Resource[];
      setResources(data);
      setLoading((prev) => ({ ...prev, resources: false }));
    });

    // Alerts listener
    const alertsQuery = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as Alert[];
      setAlerts(data);
      setLoading((prev) => ({ ...prev, alerts: false }));
    });

    return () => {
      unsubPatients();
      unsubRecords();
      unsubStaff();
      unsubResources();
      unsubAlerts();
    };
  }, []);

  // Calculate KPIs from real data
  useEffect(() => {
    if (patients.length > 0 || resources.length > 0) {
      const totalPatients = patients.filter(p => p.status !== "Discharged" && p.status !== "Outpatient").length;
      const bedResource = resources.find(r => r.name === "Beds");
      const icuResource = resources.find(r => r.name === "ICU");
      const oxygenResource = resources.find(r => r.name === "O₂ Cylinders");
      const doctorsOnDuty = staff.filter(s => s.role === "Doctor").length;

      setKpi({
        totalPatients,
        bedOccupancy: bedResource?.used || 0,
        totalBeds: bedResource?.total || 100,
        icuUsage: icuResource?.used || 0,
        icuBeds: icuResource?.total || 20,
        oxygenConsumption: oxygenResource?.used || 0,
        oxygenCylinders: oxygenResource?.total || 60,
        availableDoctors: doctorsOnDuty,
      });
    }
  }, [patients, resources, staff]);

  // Patient operations
  const addPatient = useCallback(async (patient: Omit<Patient, "id" | "createdAt" | "updatedAt">) => {
    await addDoc(collection(db, "patients"), {
      ...patient,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }, []);

  const updatePatient = useCallback(async (id: string, patient: Partial<Patient>) => {
    await updateDoc(doc(db, "patients", id), {
      ...patient,
      updatedAt: Timestamp.now(),
    });
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "patients", id));
  }, []);

  // Record operations
  const addRecord = useCallback(async (record: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">) => {
    await addDoc(collection(db, "records"), {
      ...record,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }, []);

  const updateRecord = useCallback(async (id: string, record: Partial<MedicalRecord>) => {
    await updateDoc(doc(db, "records", id), {
      ...record,
      updatedAt: Timestamp.now(),
    });
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "records", id));
  }, []);

  // Staff operations
  const addStaff = useCallback(async (staffMember: Omit<Staff, "id" | "createdAt" | "updatedAt">) => {
    await addDoc(collection(db, "staff"), {
      ...staffMember,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }, []);

  const updateStaff = useCallback(async (id: string, staffMember: Partial<Staff>) => {
    await updateDoc(doc(db, "staff", id), {
      ...staffMember,
      updatedAt: Timestamp.now(),
    });
  }, []);

  const deleteStaff = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "staff", id));
  }, []);

  // Resource operations
  const updateResource = useCallback(async (id: string, resource: Partial<Resource>) => {
    await updateDoc(doc(db, "resources", id), {
      ...resource,
      updatedAt: Timestamp.now(),
    });
  }, []);

  // Alert operations
  const acknowledgeAlert = useCallback(async (id: string) => {
    await updateDoc(doc(db, "alerts", id), {
      acknowledged: true,
    });
  }, []);

  // Bulk operations
  const bulkAddPatients = useCallback(async (patientsData: Omit<Patient, "id" | "createdAt" | "updatedAt">[]) => {
    const batch = patientsData.map((patient) =>
      addDoc(collection(db, "patients"), {
        ...patient,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
    await Promise.all(batch);
  }, []);

  const bulkAddRecords = useCallback(async (recordsData: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">[]) => {
    const batch = recordsData.map((record) =>
      addDoc(collection(db, "records"), {
        ...record,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
    await Promise.all(batch);
  }, []);

  const bulkAddStaff = useCallback(async (staffData: Omit<Staff, "id" | "createdAt" | "updatedAt">[]) => {
    const batch = staffData.map((member) =>
      addDoc(collection(db, "staff"), {
        ...member,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
    await Promise.all(batch);
  }, []);

  const value: FirebaseContextType = {
    patients,
    records,
    staff,
    resources,
    alerts,
    kpi,
    loading,
    addPatient,
    updatePatient,
    deletePatient,
    addRecord,
    updateRecord,
    deleteRecord,
    addStaff,
    updateStaff,
    deleteStaff,
    updateResource,
    acknowledgeAlert,
    bulkAddPatients,
    bulkAddRecords,
    bulkAddStaff,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}
