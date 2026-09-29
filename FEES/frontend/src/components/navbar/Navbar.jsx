import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { logoutUser } from "../../services/apiService";

const Navbar = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      console.log("Searching for:", searchTerm);
    }
  };

  // Clears the stored tokens and user, then returns to the login page
  const handleLogout = async () => {
    await logoutUser();
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
              placeholder="Search students, parents, staff..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>

        <select className="form-select campus-select">
          <option value="bangalore">Bangalore Campus</option>
          <option value="pune">Pune Campus</option>
          <option value="mumbai">Mumbai Campus</option>
        </select>
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

        {/* Notifications */}
        <div className="notification-icon">
          <Bell size={18} />
        </div>

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
              <Link to="/profile" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>
                <User size={14} />
                My Profile
              </Link>
              <Link to="/settings" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>
                <Settings size={14} />
                Settings
              </Link>
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