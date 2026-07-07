import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, TrendingUp, MessageSquare, UserCheck, FileText, ClipboardCheck, Award, CreditCard, GraduationCap, BarChart3, Shield, Settings as SettingsIcon, ChevronDown, ChevronRight } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "../context/AuthContext.jsx";
import schoolLogo from "../assets/school-logo.png";
import sLogo from "../assets/sc-logo.png";
import Full from "../assets/full.png";
import "../style.css";

const navItems = [
  { path: "/dashboard",     label: "Dashboard",           icon: LayoutDashboard },
  { path: "/leads",         label: "Leads",               icon: Users },
  { path: "/pipeline",      label: "Pipeline",            icon: TrendingUp },
  { path: "/communication", label: "Communication",       icon: MessageSquare },
  { path: "/counseling",    label: "Counseling",          icon: UserCheck },
  { path: "/applications",  label: "Applications",        icon: FileText },
  { path: "/screening",     label: "Screening",           icon: ClipboardCheck },
  { path: "/offers-seats",  label: "Offers & Seats",      icon: Award },
  { path: "/fees-payments", label: "Fees & Payments",     icon: CreditCard },
  { path: "/enrollment",    label: "Enrollment",          icon: GraduationCap },
  { path: "/reports",       label: "Reports",             icon: BarChart3 },
  { path: "/security",      label: "Security & Compliance", icon: Shield },
  { path: "/admin",         label: "Admin Dashboard",     icon: Shield },
  { path: "/settings",      label: "Settings",            icon: SettingsIcon },
];

export function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const visibleNavItems = navItems.filter((item) => item.path !== "/admin" || user?.role === "admin");

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="app-wrapper">
      {/* Sidebar - Always visible */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon" onClick={toggleCollapse} style={{ cursor: "pointer" }}>
            {collapsed ? (
              <img 
                src={sLogo}
                alt="Sacred Tree" 
                className="scl-logo"
                style={{ width: "32px", height: "32px", objectFit: "contain" }}
              />
            ) : (
              <img 
                src={schoolLogo} 
                alt="Sacred Tree International School" 
                className="logo-image"
                style={{ width: "40px", height: "40px", objectFit: "contain" }}
              />
            )}
          </div>
          
          {!collapsed && (
            <div className="logo-text-wrap">
              <img 
                src={Full} 
                alt="Sacred Tree International School" 
                className="logo-image"
                style={{ width: "40px", height: "40px", objectFit: "contain" }}
              />
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-item ${isActive(item.path) ? "active" : ""}`} 
                title={collapsed ? item.label : undefined}
              >
                <Icon className="nav-icon" size={20} />
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <LogoutButton collapsed={collapsed} />
          <button className="collapse-btn" onClick={toggleCollapse}>
            {collapsed ? <ChevronRight size={18} /> : <><ChevronDown size={18} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${collapsed ? "collapsed" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
}
