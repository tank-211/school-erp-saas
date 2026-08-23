import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import "../style.css";

export function LogoutButton({ collapsed }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;

    // State Cleanup: clear token, user_role, and school_id
    logout();
    
    // Axios Integration: clear Authorization header globally so no further API calls can be made
    delete axios.defaults.headers.common['Authorization'];

    // Navigation: redirect to /login immediately
    navigate("/login", { replace: true });
  };

  return (
    <button 
      onClick={handleLogout}
      className="nav-item"
      style={{ 
        width: "100%", 
        background: "transparent", 
        border: "none", 
        textAlign: "left",
        cursor: "pointer"
      }}
      title={collapsed ? "Logout" : undefined}
    >
      <LogOut className="nav-icon" size={20} />
      {!collapsed && <span className="nav-label">Logout</span>}
    </button>
  );
}
