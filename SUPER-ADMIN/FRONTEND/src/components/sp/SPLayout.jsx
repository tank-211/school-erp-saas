import { Outlet } from 'react-router-dom'
import SPSidebar from './SPSidebar'

function SPLayout() {
  return (
    <div className="sp-shell sp-layout">
      <SPSidebar />
      <main className="sp-content">
        <Outlet />
      </main>
    </div>
  )
}

export default SPLayout
