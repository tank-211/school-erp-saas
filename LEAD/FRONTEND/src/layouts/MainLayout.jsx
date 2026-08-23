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
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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