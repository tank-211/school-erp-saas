import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AddLeadModal from './components/AddLeadModal'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'
import { publicRoutes, protectedRoutes } from './routes'
import './App.css'
import LeadDetails from './pages/LeadDetails';
import ApplicationDetails from "./pages/ApplicationDetails";

/**
 * App Component
 * Main routing structure for the application
 * 
 * Route Types:
 * 1. Public Routes: /login, /register (no auth required, no sidebar/header)
 * 2. Protected Routes: All other routes (auth required, with sidebar/header)
 */
export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* PUBLIC ROUTES - Rendered without sidebar/header */}
        {publicRoutes.map((route) => (
          <Route
            key={`public-${route.path}`}
            path={route.path}
            element={
              <AuthLayout>
                {route.element}
              </AuthLayout>
            }
          />
        ))}

        {/* PROTECTED ROUTES - Rendered with sidebar/header */}
        {protectedRoutes.map((route) => (
          <Route
            key={`protected-${route.path}`}
            path={route.path}
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                  onAddLead={() => setModalOpen(true)}
                >
                  {route.element}
                </MainLayout>
              </ProtectedRoute>
            }
          />
        ))}

        {/* SUBROUTES - Reports and other nested routes */}
        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute>
              <MainLayout
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                onAddLead={() => setModalOpen(true)}
              >
                {protectedRoutes.find(r => r.path === '/reports')?.children?.[0]?.element}
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/performance"
          element={
            <ProtectedRoute>
              <MainLayout
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                onAddLead={() => setModalOpen(true)}
              >
                {protectedRoutes.find(r => r.path === '/reports')?.children?.[1]?.element}
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/custom"
          element={
            <ProtectedRoute>
              <MainLayout
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                onAddLead={() => setModalOpen(true)}
              >
                {protectedRoutes.find(r => r.path === '/reports')?.children?.[2]?.element}
              </MainLayout>
            </ProtectedRoute>
          }
        />
          <Route
            path="/leads/:id"
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                  onAddLead={() => setModalOpen(true)}
                >
                  <LeadDetails />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute>
                <MainLayout
                  sidebarCollapsed={sidebarCollapsed}
                  onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                  onAddLead={() => setModalOpen(true)}
                >
                  <ApplicationDetails />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        {/* 404 - Not Found Route */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <MainLayout
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(v => !v)}
                onAddLead={() => setModalOpen(true)}
              >
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h1>404 - Page Not Found</h1>
                  <p>The page you're looking for doesn't exist.</p>
                  <a href="/dashboard">Go to Dashboard</a>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Global Add Lead Modal - Only shown in protected routes */}
      <AddLeadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </BrowserRouter>
  )
}
