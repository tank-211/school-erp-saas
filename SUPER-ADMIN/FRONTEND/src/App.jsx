import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import SPLayout from "./components/sp/SPLayout";
import SPDashboard from "./pages/sp/SPDashboard";
import SPLogin from "./pages/sp/SPLogin";
import RenewalManager from "./pages/sp/RenewalManager";
import SchoolManagement from "./pages/sp/SchoolManagement";
import StaffManager from "./pages/sp/StaffManager";
import "./styles/sp-theme.css";

function ProtectedRoute() {
  const token = localStorage.getItem("spToken");
  if (!token) {
    return <Navigate to="/sp-control-portal" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sp-control-portal" element={<SPLogin />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/sp-control-portal" element={<SPLayout />}>
            <Route path="dashboard" element={<SPDashboard />} />
            <Route path="schools" element={<SchoolManagement />} />
            <Route path="schools/:id/renewals" element={<RenewalManager />} />
            <Route path="staff" element={<StaffManager />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to="/sp-control-portal" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
