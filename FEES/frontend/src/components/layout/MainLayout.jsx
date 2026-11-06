import React, { useState } from 'react'
import Sidebar from '../sidebar/Sidebar'
import Navbar from '../navbar/Navbar'

const MainLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
  <div className="app-wrapper">
    <button type="button" className="mobile-fees-menu" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? "×" : "☰"}</button>
    {mobileOpen && <button type="button" className="fees-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
    <div className="main-content">
      <Navbar />
      <main>{children}</main>
    </div>
  </div>
  )
}

export default MainLayout
