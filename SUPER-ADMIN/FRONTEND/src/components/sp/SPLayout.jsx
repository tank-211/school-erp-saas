import { Outlet } from 'react-router-dom'
import SPSidebar from './SPSidebar'
import { isSuperAdmin, currentStaffRole } from '../../utils/role'

function SPLayout() {
  return (
    <div className="sp-shell sp-layout">
      <SPSidebar />
      <main className="sp-content">
        {!isSuperAdmin() && (
          <div className="sp-readonly-note" role="status">
            View only: you are signed in as {currentStaffRole().replace(/_/g, ' ') || 'staff'}. Only a Super Admin can
            create or change schools, subscriptions, users, staff and payment settings.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

export default SPLayout
