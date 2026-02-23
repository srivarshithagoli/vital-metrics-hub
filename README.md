# MedCore EHR - Hospital Administration Platform

An intelligent health records and operational analytics platform for hospital management.

## Features

- **Patient Management**: Comprehensive patient records with real-time tracking and search
- **Data Analytics**: AI-powered insights for resource planning and demand forecasting
- **Infrastructure Planning**: Predict bed utilization, oxygen demand, and staffing requirements
- **Excel Integration**: Import and export data via Excel files
- **Firebase Backend**: Real-time data synchronization with Firebase Firestore

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn-ui, Tailwind CSS
- **Backend**: Firebase Firestore
- **Charts**: Recharts
- **Excel Processing**: xlsx, file-saver

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase account (free tier works)

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd vital-metrics-hub
```

2. Install dependencies:
```sh
npm install
```

3. Set up Firebase:
   - Create a new project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database
   - Go to Project Settings → General → Your apps → Add Web App
   - Copy the configuration values

4. Create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. Set Firestore Rules (for development):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
⚠️ **Warning**: These rules allow public access. Update them for production!

6. Start the development server:
```sh
npm run dev
```

7. Open your browser and navigate to `http://localhost:5173`

## Firebase Setup Guide

### Step-by-Step Firebase Configuration

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add project" and follow the setup wizard

2. **Enable Firestore**
   - In your project, go to Build → Firestore Database
   - Click "Create database"
   - Start in test mode (you'll update rules later)

3. **Add Web App**
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps"
   - Click the web icon (`</>`)
   - Register your app and copy the config

4. **Configure Authentication (Optional)**
   - Go to Build → Authentication
   - Enable sign-in methods as needed

### Seeding Sample Data

After setting up Firebase, you can populate the database with sample data:

1. Run the development server
2. Navigate to Settings → Data Management
3. Click "Seed Database"

This will add:
- 8 sample patients
- 6 medical records
- 8 staff members
- 5 resource types
- 4 alert notifications

## Excel Import/Export

### Exporting Data

Each page has an "Export Excel" button that downloads data in Excel format:
- **Patients**: Export all patient records
- **Records**: Export medical records
- **Staff**: Export staff information
- **Dashboard**: Export all data combined

### Importing Data

1. Navigate to the respective page (Patients, Records, Staff)
2. Click "Import Excel"
3. Download the template to see the required format
4. Fill in your data following the template
5. Upload the Excel file

### Excel Format Requirements

**Patients Sheet:**
| Name | Age | Diagnosis | Admission Date | Status |
|------|-----|-----------|----------------|--------|
| John Doe | 45 | Pneumonia | 2026-02-21 | Admitted |

**Staff Sheet:**
| Name | Role | Department | Shift | Phone | Email |
|------|------|------------|-------|-------|-------|
| Dr. Smith | Doctor | ER | Morning | +91-1234567890 | smith@hospital.com |

**Records Sheet:**
| Patient ID | Patient Name | Type | Date | Doctor | Description |
|------------|--------------|------|------|--------|-------------|
| P-1001 | John Doe | Lab Report | 2026-02-21 | Dr. Smith | Blood test |

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn-ui components
│   ├── AlertPanel.tsx  # Alert display component
│   ├── AppSidebar.tsx  # Navigation sidebar
│   └── ...
├── contexts/           # React contexts
│   └── FirebaseContext.tsx  # Firebase data management
├── lib/               # Utilities
│   ├── firebase.ts    # Firebase configuration
│   ├── excelUtils.ts  # Excel import/export functions
│   └── seedDatabase.ts # Sample data seeder
├── pages/             # Page components
│   ├── Dashboard.tsx
│   ├── Patients.tsx
│   ├── Records.tsx
│   ├── StaffManagement.tsx
│   └── ...
└── types/             # TypeScript type definitions
    └── index.ts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```sh
npm install -g firebase-tools
```

2. Login and initialize:
```sh
firebase login
firebase init hosting
```

3. Build and deploy:
```sh
npm run build
firebase deploy
```

### Deploy to Vercel/Netlify

1. Build the project:
```sh
npm run build
```

2. Deploy the `dist` folder to your hosting provider

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## License

This project is private and proprietary.
