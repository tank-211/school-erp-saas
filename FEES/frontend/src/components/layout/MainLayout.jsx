import React from 'react'
import Sidebar from '../sidebar/Sidebar'
import Navbar from '../navbar/Navbar'

const MainLayout = ({ children }) => (
  <div className="app-wrapper">
    <Sidebar />
    <div className="main-content">
      <Navbar />
      <main>{children}</main>
    </div>
  </div>
)

export default MainLayout
