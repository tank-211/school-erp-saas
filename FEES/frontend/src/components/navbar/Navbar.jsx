import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, User, LogOut, Settings, ChevronDown } from "lucide-react";

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

  const handleLogout = () => {
    localStorage.removeItem('fees_auth');
    sessionStorage.removeItem('fees_auth');
    navigate("/", { replace: true });
  };

  const userName = "Admin User";
  const userInitials = userName.split(' ').map(n => n[0]).join('');

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
          <span className="notification-badge">3</span>
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
                  <div className="dropdown-user-role">School Administrator</div>
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