import { NavLink, useNavigate } from "react-router-dom";

const linkClass = ({ isActive }) =>
  isActive ? "sp-nav-link active" : "sp-nav-link";

function SPSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("spToken");
    localStorage.removeItem("spUser");
    navigate("/sp-control-portal");
  };

  return (
    <aside className="sp-sidebar">
      <p className="sp-brand-kicker">Super Admin</p>
      <h2 className="sp-title">Control Portal</h2>

      <nav className="sp-sidebar-nav">
        <NavLink className={linkClass} to="/sp-control-portal/dashboard">
          Dashboard
        </NavLink>
        <NavLink className={linkClass} to="/sp-control-portal/schools">
          School Management
        </NavLink>
        <NavLink className={linkClass} to="/sp-control-portal/staff">
          Staff Manager
        </NavLink>
      </nav>

      <button
        className="sp-btn sp-btn-ghost"
        type="button"
        onClick={handleLogout}
      >
        Logout
      </button>
    </aside>
  );
}

export default SPSidebar;
