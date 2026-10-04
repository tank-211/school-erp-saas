import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { logoutUser, fetchSchoolProfile } from "../../services/apiService";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    fetchSchoolProfile().then((r) => { if (r.success) setSchoolName(r.data?.name || ""); });
  }, []);

  // Searches students on the Students page
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/students?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Clears the stored tokens and user, then returns to the login page
  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/", { replace: true });
  };

  // The signed-in user, as stored at login
  let storedUser = {};
  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    storedUser = {};
  }
  const userName =
    [storedUser.firstName, storedUser.lastName].filter(Boolean).join(" ") ||
    storedUser.name ||
    storedUser.email ||
    "";
  const userRole = storedUser.role
    ? String(storedUser.role).charAt(0).toUpperCase() + String(storedUser.role).slice(1).toLowerCase()
    : "";
  const userInitials =
    userName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <header className="navbar">
      {/* LEFT SIDE - Search Bar */}
      <div className="navbar-left">
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-wrap">
            <Search size={16} className="input-icon" />
            <input
              type="text"
              placeholder="Search students by name or admission no."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>

        {schoolName && <span className="campus-select" style={{ fontWeight: 600 }}>{schoolName}</span>}
      </div>

      {/* RIGHT SIDE - Actions & Profile */}
      <div className="navbar-right">
        <Link to="/students">
          <button className="btn btn-primary btn-sm">
            Fees Management
          </button>
        </Link>

        <Link to="/bulk-upload">
          <button className="btn btn-outline btn-sm">
            Bulk Upload
          </button>
        </Link>

        <Link to="/export-report">
          <button className="btn btn-outline btn-sm">
            Export Report
          </button>
        </Link>

        {/* User Profile Dropdown */}
        <div className="profile-dropdown">
          <button 
            className="profile-trigger"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="user-avatar-nav">
              {userInitials}
            </div>
            <ChevronDown size={14} className={`dropdown-arrow ${showProfileMenu ? 'rotate' : ''}`} />
          </button>

          {showProfileMenu && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <div className="user-avatar-dropdown">
                  {userInitials}
                </div>
                <div>
                  <div className="dropdown-user-name">{userName}</div>
                  <div className="dropdown-user-role">{userRole}</div>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;