import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
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
import { useLocation } from "react-router-dom";
import { db } from "@/lib/firebase";
import { Patient, MedicalRecord, Staff, Resource, Alert, DashboardKPI, ResourceHistoryEntry } from "@/types";

const routeCollectionMap: Record<string, Array<"patients" | "records" | "staff" | "resources" | "alerts" | "resourceHistory">> = {
  "/dashboard": ["patients", "resources", "staff", "alerts", "resourceHistory"],
  "/patients": ["patients"],
  "/records": ["records", "patients"],
  "/analytics": ["patients", "resources", "resourceHistory"],
  "/resources": ["patients", "resources", "staff", "alerts", "resourceHistory"],
  "/infrastructure": ["patients", "resources", "staff", "resourceHistory"],
  "/staff": ["staff"],
  "/settings": ["patients", "records", "staff", "resources", "alerts", "resourceHistory"],
};

interface FirebaseContextType {
  // Data
  patients: Patient[];
  records: MedicalRecord[];
  staff: Staff[];
  resources: Resource[];
  resourceHistory: ResourceHistoryEntry[];
  alerts: Alert[];
  kpi: DashboardKPI | null;
  
  // Loading states
  loading: {
    patients: boolean;
    records: boolean;
    staff: boolean;
    resources: boolean;
    resourceHistory: boolean;
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
  addResource: (resource: Omit<Resource, "id" | "updatedAt">) => Promise<void>;
  updateResource: (id: string, resource: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  
  // Alert operations
  acknowledgeAlert: (id: string) => Promise<void>;
  
  // Bulk operations
  bulkAddPatients: (patients: Omit<Patient, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  bulkAddRecords: (records: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  bulkAddStaff: (staff: Omit<Staff, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  bulkAddResources: (resources: Omit<Resource, "id" | "updatedAt">[]) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceHistory, setResourceHistory] = useState<ResourceHistoryEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  
  const [loading, setLoading] = useState({
    patients: true,
    records: true,
    staff: true,
    resources: true,
    resourceHistory: true,
    alerts: true,
  });
  const unsubscribersRef = React.useRef<Partial<Record<"patients" | "records" | "staff" | "resources" | "resourceHistory" | "alerts", () => void>>>({});
  const startedRef = React.useRef<Record<"patients" | "records" | "staff" | "resources" | "resourceHistory" | "alerts", boolean>>({
    patients: false,
    records: false,
    staff: false,
    resources: false,
    resourceHistory: false,
    alerts: false,
  });

  const enabledCollections = useMemo(
    () => new Set(routeCollectionMap[location.pathname] || ["patients", "resources", "staff", "alerts", "resourceHistory"]),
    [location.pathname],
  );

  const ensurePatientsSubscription = useCallback(() => {
    if (startedRef.current.patients) return;
    startedRef.current.patients = true;
    setLoading((prev) => ({ ...prev, patients: patients.length === 0 }));

    const patientsQuery = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    unsubscribersRef.current.patients = onSnapshot(patientsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Patient[];
      setPatients(data);
      setLoading((prev) => ({ ...prev, patients: false }));
    });
  }, [patients.length]);

  const ensureRecordsSubscription = useCallback(() => {
    if (startedRef.current.records) return;
    startedRef.current.records = true;
    setLoading((prev) => ({ ...prev, records: records.length === 0 }));

    const recordsQuery = query(collection(db, "records"), orderBy("createdAt", "desc"));
    unsubscribersRef.current.records = onSnapshot(recordsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as MedicalRecord[];
      setRecords(data);
      setLoading((prev) => ({ ...prev, records: false }));
    });
  }, [records.length]);

  const ensureStaffSubscription = useCallback(() => {
    if (startedRef.current.staff) return;
    startedRef.current.staff = true;
    setLoading((prev) => ({ ...prev, staff: staff.length === 0 }));

    const staffQuery = query(collection(db, "staff"), orderBy("createdAt", "desc"));
    unsubscribersRef.current.staff = onSnapshot(staffQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Staff[];
      setStaff(data);
      setLoading((prev) => ({ ...prev, staff: false }));
    });
  }, [staff.length]);

  const ensureResourcesSubscription = useCallback(() => {
    if (startedRef.current.resources) return;
    startedRef.current.resources = true;
    setLoading((prev) => ({ ...prev, resources: resources.length === 0 }));

    unsubscribersRef.current.resources = onSnapshot(collection(db, "resources"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Resource[];
      setResources(data);
      setLoading((prev) => ({ ...prev, resources: false }));
    });
  }, [resources.length]);

  const ensureAlertsSubscription = useCallback(() => {
    if (startedRef.current.alerts) return;
    startedRef.current.alerts = true;
    setLoading((prev) => ({ ...prev, alerts: alerts.length === 0 }));

    const alertsQuery = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    unsubscribersRef.current.alerts = onSnapshot(alertsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as Alert[];
      setAlerts(data);
      setLoading((prev) => ({ ...prev, alerts: false }));
    });
  }, [alerts.length]);

  const ensureResourceHistorySubscription = useCallback(() => {
    if (startedRef.current.resourceHistory) return;
    startedRef.current.resourceHistory = true;
    setLoading((prev) => ({ ...prev, resourceHistory: resourceHistory.length === 0 }));

    const resourceHistoryQuery = query(collection(db, "resource_history"), orderBy("recordedAt", "desc"));
    unsubscribersRef.current.resourceHistory = onSnapshot(resourceHistoryQuery, (snapshot) => {
      const data = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
        recordedAt: snapshotDoc.data().recordedAt?.toDate(),
      })) as ResourceHistoryEntry[];
      setResourceHistory(data);
      setLoading((prev) => ({ ...prev, resourceHistory: false }));
    });
  }, [resourceHistory.length]);

  const logResourceHistory = useCallback(
    async (resourceId: string, resource: Omit<Resource, "id" | "updatedAt">, changeType: ResourceHistoryEntry["changeType"]) => {
      await addDoc(collection(db, "resource_history"), {
        resourceId,
        name: resource.name,
        used: resource.used,
        total: resource.total,
        available: Math.max(resource.total - resource.used, 0),
        unit: resource.unit || "units",
        changeType,
        recordedAt: Timestamp.now(),
      });
    },
    [],
  );

  useEffect(() => {
    if (enabledCollections.has("patients")) ensurePatientsSubscription();
    if (enabledCollections.has("records")) ensureRecordsSubscription();
    if (enabledCollections.has("staff")) ensureStaffSubscription();
    if (enabledCollections.has("resources")) ensureResourcesSubscription();
    if (enabledCollections.has("resourceHistory")) ensureResourceHistorySubscription();
    if (enabledCollections.has("alerts")) ensureAlertsSubscription();
  }, [
    enabledCollections,
    ensureAlertsSubscription,
    ensurePatientsSubscription,
    ensureRecordsSubscription,
    ensureResourceHistorySubscription,
    ensureResourcesSubscription,
    ensureStaffSubscription,
  ]);

  useEffect(() => {
    const unsubscribers = unsubscribersRef.current;
    return () => {
      Object.values(unsubscribers).forEach((unsubscribe) => unsubscribe?.());
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
    const existingResource = resources.find((item) => item.id === id);
    const nextResource = {
      name: existingResource?.name || "",
      used: existingResource?.used || 0,
      total: existingResource?.total || 0,
      unit: existingResource?.unit || "units",
      ...resource,
    };

    await updateDoc(doc(db, "resources", id), {
      ...resource,
      updatedAt: Timestamp.now(),
    });
    await logResourceHistory(id, nextResource, "updated");
  }, [logResourceHistory, resources]);

  const addResource = useCallback(async (resource: Omit<Resource, "id" | "updatedAt">) => {
    const resourceRef = await addDoc(collection(db, "resources"), {
      ...resource,
      updatedAt: Timestamp.now(),
    });
    await logResourceHistory(resourceRef.id, resource, "created");
  }, [logResourceHistory]);

  const deleteResource = useCallback(async (id: string) => {
    const existingResource = resources.find((item) => item.id === id);
    if (existingResource) {
      await logResourceHistory(id, existingResource, "deleted");
    }
    await deleteDoc(doc(db, "resources", id));
  }, [logResourceHistory, resources]);

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

  const bulkAddResources = useCallback(async (resourcesData: Omit<Resource, "id" | "updatedAt">[]) => {
    const batch = resourcesData.map(async (resource) => {
      const resourceRef = await addDoc(collection(db, "resources"), {
        ...resource,
        updatedAt: Timestamp.now(),
      });
      await logResourceHistory(resourceRef.id, resource, "imported");
    });
    await Promise.all(batch);
  }, [logResourceHistory]);

  const value: FirebaseContextType = {
    patients,
    records,
    staff,
    resources,
    resourceHistory,
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
    addResource,
    updateResource,
    deleteResource,
    acknowledgeAlert,
    bulkAddPatients,
    bulkAddRecords,
    bulkAddStaff,
    bulkAddResources,
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
