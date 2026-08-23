import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";

export function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const hasRequiredRole = !role || user?.role === role;
  const isRoleDenied = isAuthenticated && !hasRequiredRole;

  useEffect(() => {
    if (isRoleDenied) {
      showToast("Permission Denied", "error");
    }
  }, [isRoleDenied, showToast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isRoleDenied) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
