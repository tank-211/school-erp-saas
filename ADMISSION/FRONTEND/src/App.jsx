import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { Dashboard } from "./pages/Dashboard";
import { Leads } from "./pages/Leads";
import { AddLead } from "./pages/AddLead";
import { EditLead } from "./pages/EditLead";
import { Pipeline } from "./pages/Pipeline";
import { Communication } from "./pages/Communication";
import { Counseling } from "./pages/Counseling";
import { ScheduleVisit } from "./pages/ScheduleVisit";
import { Applications } from "./pages/Applications";
import { CreateApplication } from "./pages/CreateApplication";
import { MultiStepApplication } from "./pages/MultiStepApplication";
import { OffersSeats } from "./pages/OffersSeats";
import { FeesPayments } from "./pages/FeesPayments";
import { InvoiceDetail } from "./pages/InvoiceDetail";
import { Enrollment } from "./pages/Enrollment";
import { Reports } from "./pages/Reports";
import { Security } from "./pages/Security";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { AdminPortal } from "./pages/AdminPortal";
import { SchoolSetup } from "./pages/SchoolSetup";
import LeadDetails from "./pages/LeadDetails";
import ApplicationDetails from "./pages/ApplicationDetails";
import { AdmissionResume } from "./pages/AdmissionResume";

const adminRouteElement = (
  <ProtectedRoute role="admin">
    <AdminPortal />
  </ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:id" element={<LeadDetails />} />
          <Route path="leads/add" element={<AddLead />} />
          <Route path="leads/:id/edit" element={<EditLead />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="communication" element={<Communication />} />
          <Route path="counseling" element={<Counseling />} />
          <Route path="counseling/schedule-visit" element={<ScheduleVisit />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id/details" element={<ApplicationDetails />} />
          <Route path="applications/create" element={<CreateApplication />} />
          <Route path="applications/form/:id"element={<MultiStepApplication />} />
           
          {/* Old duplicate of Create Application, with a hardcoded year and grades */}
          <Route path="applications/new" element={<Navigate to="/applications/create" replace />} />
          <Route path="offers-seats" element={<OffersSeats />} />
          <Route path="fees-payments" element={<FeesPayments />} />
          <Route path="fees/invoice/:id" element={<InvoiceDetail />} />
          <Route path="enrollment" element={<Enrollment />} />
          <Route path="admission/resume/:id"element={<AdmissionResume />}/>
          <Route path="reports" element={<Reports />} />
          <Route
            path="security"
            element={
              <ProtectedRoute role="admin">
                <Security />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={adminRouteElement} />
          <Route path="admin/users" element={adminRouteElement} />
          <Route path="admin/management" element={adminRouteElement} />
          <Route
            path="admin/setup"
            element={
              <ProtectedRoute role="admin">
                <SchoolSetup />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
