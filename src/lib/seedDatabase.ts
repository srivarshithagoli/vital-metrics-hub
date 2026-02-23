import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { Timestamp } from "firebase/firestore";

// Sample patients data
const samplePatients = [
  { name: "Rajesh Kumar", age: 45, diagnosis: "Pneumonia", date: "2026-02-19", status: "Admitted" },
  { name: "Anita Sharma", age: 32, diagnosis: "Fracture - Left Arm", date: "2026-02-20", status: "Under Treatment" },
  { name: "Mohammed Ali", age: 67, diagnosis: "Cardiac Arrest", date: "2026-02-18", status: "ICU" },
  { name: "Priya Patel", age: 28, diagnosis: "Appendicitis", date: "2026-02-21", status: "Pre-Surgery" },
  { name: "Suresh Reddy", age: 55, diagnosis: "Diabetes - Type 2", date: "2026-02-15", status: "Discharged" },
  { name: "Fatima Begum", age: 41, diagnosis: "Dengue Fever", date: "2026-02-20", status: "Admitted" },
  { name: "Vikram Singh", age: 73, diagnosis: "COPD Exacerbation", date: "2026-02-17", status: "ICU" },
  { name: "Lakshmi Nair", age: 36, diagnosis: "Migraine", date: "2026-02-21", status: "Outpatient" },
];

// Sample medical records
const sampleRecords = [
  { patientId: "P-1001", patient: "Rajesh Kumar", type: "Lab Report", date: "2026-02-19", doctor: "Dr. Mehta", description: "Blood test results" },
  { patientId: "P-1002", patient: "Anita Sharma", type: "X-Ray", date: "2026-02-20", doctor: "Dr. Gupta", description: "Fracture confirmed" },
  { patientId: "P-1003", patient: "Mohammed Ali", type: "ECG Report", date: "2026-02-18", doctor: "Dr. Khan", description: "Cardiac monitoring" },
  { patientId: "P-1004", patient: "Priya Patel", type: "Blood Work", date: "2026-02-21", doctor: "Dr. Shah", description: "Pre-surgery tests" },
  { patientId: "P-1005", patient: "Suresh Reddy", type: "Prescription", date: "2026-02-15", doctor: "Dr. Rao", description: "Diabetes medication" },
  { patientId: "P-1006", patient: "Fatima Begum", type: "Discharge Summary", date: "2026-02-20", doctor: "Dr. Ahmed", description: "Treatment complete" },
];

// Sample staff data
const sampleStaff = [
  { name: "Dr. Rajesh Mehta", role: "Doctor", department: "ER", shift: "Morning", phone: "+91-9876543210", email: "mehta@hospital.com" },
  { name: "Dr. Priya Gupta", role: "Doctor", department: "ICU", shift: "Morning", phone: "+91-9876543211", email: "gupta@hospital.com" },
  { name: "Dr. Ahmed Khan", role: "Doctor", department: "ICU", shift: "Afternoon", phone: "+91-9876543212", email: "khan@hospital.com" },
  { name: "Nurse Sunita Sharma", role: "Nurse", department: "ER", shift: "Morning", phone: "+91-9876543213", email: "sunita@hospital.com" },
  { name: "Nurse Mary Thomas", role: "Nurse", department: "ICU", shift: "Night", phone: "+91-9876543214", email: "mary@hospital.com" },
  { name: "Dr. Vikram Shah", role: "Doctor", department: "Surgery", shift: "Morning", phone: "+91-9876543215", email: "shah@hospital.com" },
  { name: "Nurse John D'Souza", role: "Nurse", department: "General", shift: "Afternoon", phone: "+91-9876543216", email: "john@hospital.com" },
  { name: "Technician Ravi Kumar", role: "Technician", department: "Lab", shift: "Morning", phone: "+91-9876543217", email: "ravi@hospital.com" },
];

// Sample resources data
const sampleResources = [
  { name: "Beds", used: 78, total: 100, unit: "beds" },
  { name: "ICU", used: 18, total: 20, unit: "beds" },
  { name: "Ventilators", used: 12, total: 25, unit: "units" },
  { name: "O₂ Cylinders", used: 45, total: 60, unit: "cylinders" },
  { name: "OR Rooms", used: 6, total: 8, unit: "rooms" },
];

// Sample alerts
const sampleAlerts = [
  { type: "critical", message: "ICU bed capacity at 90%", department: "ICU", timestamp: new Date(), acknowledged: false },
  { type: "warning", message: "Oxygen supply running low", department: "General", timestamp: new Date(), acknowledged: false },
  { type: "info", message: "Scheduled maintenance: Ventilator check", department: "Maintenance", timestamp: new Date(), acknowledged: false },
  { type: "warning", message: "Staff shortage in Night shift", department: "HR", timestamp: new Date(), acknowledged: false },
];

// Check if collection is empty
async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.empty;
}

// Seed the database with sample data
export async function seedDatabase(): Promise<void> {
  try {
    // Seed patients
    if (await isCollectionEmpty("patients")) {
      console.log("Seeding patients...");
      for (const patient of samplePatients) {
        await addDoc(collection(db, "patients"), {
          ...patient,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      console.log("Patients seeded successfully");
    }

    // Seed records
    if (await isCollectionEmpty("records")) {
      console.log("Seeding records...");
      for (const record of sampleRecords) {
        await addDoc(collection(db, "records"), {
          ...record,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      console.log("Records seeded successfully");
    }

    // Seed staff
    if (await isCollectionEmpty("staff")) {
      console.log("Seeding staff...");
      for (const staffMember of sampleStaff) {
        await addDoc(collection(db, "staff"), {
          ...staffMember,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      console.log("Staff seeded successfully");
    }

    // Seed resources
    if (await isCollectionEmpty("resources")) {
      console.log("Seeding resources...");
      for (const resource of sampleResources) {
        await addDoc(collection(db, "resources"), {
          ...resource,
          updatedAt: Timestamp.now(),
        });
      }
      console.log("Resources seeded successfully");
    }

    // Seed alerts
    if (await isCollectionEmpty("alerts")) {
      console.log("Seeding alerts...");
      for (const alert of sampleAlerts) {
        await addDoc(collection(db, "alerts"), {
          ...alert,
          timestamp: Timestamp.now(),
        });
      }
      console.log("Alerts seeded successfully");
    }

    console.log("Database seeding completed!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Clear all data from a collection (use with caution!)
export async function clearCollection(collectionName: string): Promise<void> {
  const snapshot = await getDocs(collection(db, collectionName));
  const deletePromises = snapshot.docs.map((doc) => 
    import("firebase/firestore").then(({ deleteDoc }) => deleteDoc(doc.ref))
  );
  await Promise.all(deletePromises);
  console.log(`Cleared ${collectionName} collection`);
}
