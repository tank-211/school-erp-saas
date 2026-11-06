import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, TrendingUp, MessageSquare, UserCheck, FileText, ClipboardCheck, Award, CreditCard, GraduationCap, BarChart3, Shield, Settings as SettingsIcon, ChevronDown, ChevronRight, Building2, Upload } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchool, initialsOf } from "../hooks/useSchool.js";
import "../style.css";

const navItems = [
  { path: "/dashboard",     label: "Dashboard",           icon: LayoutDashboard },
  { path: "/leads",         label: "Leads",               icon: Users },
  { path: "/pipeline",      label: "Pipeline",            icon: TrendingUp },
  { path: "/communication", label: "Communication",       icon: MessageSquare },
  { path: "/counseling",    label: "Counseling",          icon: UserCheck },
  { path: "/applications",  label: "Applications",        icon: FileText },
  { path: "/offers-seats",  label: "Offers & Seats",      icon: Award },
  { path: "/fees-payments", label: "Fees & Payments",     icon: CreditCard },
  { path: "/enrollment",    label: "Enrollment",          icon: GraduationCap },
  { path: "/reports",       label: "Reports",             icon: BarChart3 },
  { path: "/security",      label: "Security & Compliance", icon: Shield, adminOnly: true },
  { path: "/admin",         label: "Admin Dashboard",     icon: Shield },
  { path: "/admin/setup",   label: "School Setup",        icon: Building2 },
  { path: "/admin/import-students", label: "Import Students", icon: Upload },
  { path: "/settings",      label: "Settings",            icon: SettingsIcon },
];

export function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const school = useSchool();

  const matches = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  // Highlight only the most specific link (e.g. /admin/setup, not also /admin)
  const isActive = (path) =>
    matches(path) && !navItems.some((item) => item.path.startsWith(`${path}/`) && matches(item.path));
  // Admin pages are listed for school admins only
  const visibleNavItems = navItems.filter(
    (item) => !(item.adminOnly || item.path.startsWith("/admin")) || user?.role === "admin"
  );

  const toggleCollapse = () => {
    setCollapsed((current) => !current);
  };

  return (
    <div className="app-wrapper">
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-controls="admission-sidebar"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside id="admission-sidebar" className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`} aria-label="Main navigation">
        {/* The signed-in user's own school (name and city from the school record) */}
        <div className="sidebar-logo">
          <div
            className="school-badge"
            role="button"
            tabIndex={0}
            onClick={toggleCollapse}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleCollapse(); } }}
            title={school?.name || "School"}
            aria-label="Toggle navigation width"
          >
            {initialsOf(school?.name)}
          </div>
          {!collapsed && (
            <div className="logo-text-wrap">
              <div className="school-name">{school?.name || "Loading..."}</div>
              <div className="school-sub">
                {[school?.city, "Admissions"].filter(Boolean).join(" · ")}
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="School ERP sections">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-item ${isActive(item.path) ? "active" : ""}`} 
                title={collapsed ? item.label : undefined}
                aria-current={isActive(item.path) ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="nav-icon" size={20} />
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <LogoutButton collapsed={collapsed} />
          <button className="collapse-btn" type="button" onClick={toggleCollapse} aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
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
