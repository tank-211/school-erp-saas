import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  GraduationCap,
  UserCheck,
  ClipboardList,
  DollarSign,
  Upload,
  RefreshCw,
  PenTool,
  Clock,
  Users,
  Library,
  Truck,
  Settings,
  ChevronDown,
  BarChart3,
  FileText,
  LogOut,
  BookOpen,
} from 'lucide-react'

const mainMenuItems = [
  { label: 'Dashboard', icon: Home, path: '/dashboard' },
  { label: 'Students', icon: GraduationCap, path: '/students' },
  {
    label: 'Fees Management',
    icon: DollarSign,
    path: '#',
    subItems: [
      { label: 'Bulk Upload', icon: Upload, path: '/bulk-upload' },
      { label: 'Refund Management', icon: RefreshCw, path: '/refund-management' },
    ],
  },
  { label: 'Exams', icon: PenTool, path: '/exams' },
  { label: 'Timetable', icon: Clock, path: '/timetable' },
  { label: 'Staff', icon: Users, path: '/staff' },
  { label: 'Library', icon: Library, path: '/library' },
  { label: 'Transport', icon: Truck, path: '/transport' },
  { label: 'Stationery', icon: FileText, path: '/stationery' },
]

const reportsMenuItems = [
  { label: 'Performance', icon: BarChart3, path: '/performance' },
  { label: 'Fee Reports', icon: FileText, path: '/fees' },
  { label: 'Custom Reports', icon: BarChart3, path: '/custom-reports' },
]

const settingsMenuItem = [
  { label: 'Settings', icon: Settings, path: '/settings' },
]

const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  
  // Load expanded state from localStorage or default to null
  const [expandedItem, setExpandedItem] = useState(() => {
    return localStorage.getItem('expandedMenuItem') || null
  })

  // Save expanded state to localStorage whenever it changes
  useEffect(() => {
    if (expandedItem) {
      localStorage.setItem('expandedMenuItem', expandedItem)
    } else {
      localStorage.removeItem('expandedMenuItem')
    }
  }, [expandedItem])

  const isItemActive = (item) => {
    if (item.path === '/') {
      return location.pathname === '/'
    }
    return item.path === location.pathname
  }

  const isSubItemActive = (subItems) => {
    return subItems && subItems.some((subItem) => subItem.path === location.pathname)
  }

  // Check if any subitem of Fees Management is active
  const isFeesManagementActive = () => {
    const feesItem = mainMenuItems.find(item => item.label === 'Fees Management')
    return feesItem && isSubItemActive(feesItem.subItems)
  }

  // Auto-expand if subitem is active
  useEffect(() => {
    if (isFeesManagementActive() && !expandedItem) {
      setExpandedItem('Fees Management')
    }
  }, [location.pathname])

  const handleParentClick = (item) => {
    // Toggle dropdown
    setExpandedItem(expandedItem === item.label ? null : item.label)
    // Navigate to parent path
    if (item.path && item.path !== '#') {
      navigate(item.path)
    }
  }

  const userName = "Admin"
  const userRole = "Administrator"
  const userInitials = "A"

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <BookOpen size={22} color="#14b8a6" strokeWidth={2} />
        </div>
        <div className="logo-text-wrap">
          <div className="school-name">Sacred Tree</div>
          <div className="school-sub">International School</div>
        </div>
      </div>

      <div className="sidebar-nav">
        {mainMenuItems.map((item) => {
          const IconComponent = item.icon
          const isActive = isItemActive(item)
          const isExpanded = expandedItem === item.label
          const hasActiveSubItem = isSubItemActive(item.subItems)

          return (
            <div key={item.label}>
              {item.subItems ? (
                <>
                  <button
                    type="button"
                    className={`nav-item ${hasActiveSubItem || isActive ? 'active' : ''}`}
                    onClick={() => handleParentClick(item)}
                  >
                    <IconComponent size={18} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                    <ChevronDown size={14} className={`nav-chevron ${isExpanded ? 'rotate' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="submenu-items">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.label}
                          to={subItem.path}
                          className={`nav-item sub-item ${isItemActive(subItem) ? 'active' : ''}`}
                        >
                          <subItem.icon size={14} className="nav-icon" />
                          <span className="nav-label">{subItem.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <IconComponent size={18} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              )}
            </div>
          )
        })}

        <div className="divider" />

        {reportsMenuItems.map((item) => {
          const IconComponent = item.icon
          const isActive = isItemActive(item)
          return (
            <Link key={item.label} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <IconComponent size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          )
        })}

        <div className="divider" />

        {settingsMenuItem.map((item) => {
          const IconComponent = item.icon
          const isActive = isItemActive(item)
          return (
            <Link key={item.label} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <IconComponent size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info">
            <p className="user-name">{userName}</p>
            <p className="user-role">{userRole}</p>
          </div>
          <button
            type="button"
            className="logout-btn"
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar