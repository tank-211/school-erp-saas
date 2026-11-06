import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './MainLayout.css';

/**
 * MainLayout Component
 * Renders the main app layout with sidebar and header
 * Used for all protected routes
 */
const MainLayout = ({ 
  children, 
  sidebarCollapsed, 
  onToggleSidebar, 
  onAddLead
}) => {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      <button type="button" className="mobile-nav-toggle" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? "×" : "☰"}</button>
      {mobileNavOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
      />
      <div className="app-content">
        <Header onAddLead={onAddLead} />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;