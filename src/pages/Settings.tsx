import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Settings as SettingsIcon, User, Bell, Shield, Database, Download, Upload, RefreshCw, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase } from "@/contexts/FirebaseContext";
import { exportAllToExcel } from "@/lib/excelUtils";
import { seedDatabase } from "@/lib/seedDatabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { patients, records, staff, resources } = useFirebase();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);

  // Firebase config from environment
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "Not configured",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "Not configured",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "Not configured",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "Not configured",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "Not configured",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "Not configured",
  };

  const isFirebaseConfigured = import.meta.env.VITE_FIREBASE_PROJECT_ID !== undefined;

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      toast.success("Database seeded successfully with sample data!");
    } catch (error) {
      console.error("Error seeding database:", error);
      toast.error("Failed to seed database. Check your Firebase configuration.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      exportAllToExcel(patients, records, staff, resources);
      toast.success("All data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const sections = [
    { icon: User, title: "Profile Settings", description: "Manage your account details and preferences", action: null },
    { icon: Bell, title: "Notifications", description: "Configure alert and notification preferences", action: null },
    { icon: Shield, title: "Security", description: "Password, two-factor authentication, sessions", action: null },
    { 
      icon: Database, 
      title: "Data Management", 
      description: "Export data, manage backups, storage settings",
      action: "data"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">System configuration</p>
        </div>

        {/* Firebase Status */}
        <div className={`bg-card border rounded-lg p-4 ${isFirebaseConfigured ? 'border-success/30' : 'border-warning/30'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-md ${isFirebaseConfigured ? 'bg-success/10' : 'bg-warning/10'}`}>
              {isFirebaseConfigured ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Firebase {isFirebaseConfigured ? 'Connected' : 'Configuration Required'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isFirebaseConfigured 
                  ? `Project: ${firebaseConfig.projectId}`
                  : "Set up your Firebase environment variables to enable real-time data sync."
                }
              </p>
              {!isFirebaseConfigured && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowFirebaseConfig(true)}
                >
                  View Setup Instructions
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-secondary rounded-md">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Data Management</p>
              <p className="text-xs text-muted-foreground">Export, import, and manage your hospital data</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Export All Data</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Download all patients, records, staff, and resources as an Excel file.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportAll}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export to Excel
              </Button>
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Seed Sample Data</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Populate the database with sample patients, staff, and resources.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Seed Database
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Seed Sample Data</DialogTitle>
                    <DialogDescription>
                      This will add sample patients, staff, records, and resources to your Firebase database. 
                      Existing data will not be modified.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {}}>Cancel</Button>
                    <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                      {isSeeding ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isSeeding ? "Seeding..." : "Seed Data"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Data Stats */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Current Data Summary:</p>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold">{patients.length}</p>
                <p className="text-xs text-muted-foreground">Patients</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{records.length}</p>
                <p className="text-xs text-muted-foreground">Records</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{staff.length}</p>
                <p className="text-xs text-muted-foreground">Staff</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{resources.length}</p>
                <p className="text-xs text-muted-foreground">Resources</p>
              </div>
            </div>
          </div>
        </div>

        {/* Other Settings Sections */}
        <div className="grid gap-3 max-w-2xl">
          {sections.filter(s => s.action !== "data").map((s) => (
            <div key={s.title} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="p-2 bg-secondary rounded-md">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Firebase Setup Instructions Dialog */}
        <Dialog open={showFirebaseConfig} onOpenChange={setShowFirebaseConfig}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Firebase Setup Instructions</DialogTitle>
              <DialogDescription>
                Follow these steps to configure Firebase for your application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 1: Create a Firebase Project</p>
                <p className="text-xs text-muted-foreground">
                  Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Console</a> and create a new project.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 2: Enable Firestore Database</p>
                <p className="text-xs text-muted-foreground">
                  In your Firebase project, go to Build → Firestore Database and create a database.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 3: Get Your Config</p>
                <p className="text-xs text-muted-foreground">
                  Go to Project Settings → General → Your apps → Web app. Copy the configuration values.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 4: Create Environment File</p>
                <p className="text-xs text-muted-foreground">
                  Create a <code className="bg-secondary px-1 rounded">.env</code> file in your project root with these variables:
                </p>
                <div className="bg-secondary rounded-lg p-3 text-xs font-mono overflow-x-auto">
                  <pre>{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}</pre>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 5: Set Firestore Rules</p>
                <p className="text-xs text-muted-foreground">
                  In Firestore → Rules, set the following for development:
                </p>
                <div className="bg-secondary rounded-lg p-3 text-xs font-mono overflow-x-auto">
                  <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
                </div>
                <p className="text-xs text-warning mt-1">
                  ⚠️ These rules allow public access. Update them for production!
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowFirebaseConfig(false)}>Got it!</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
