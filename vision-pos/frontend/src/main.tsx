import React from 'react'
import './index.css'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Sidebar from './components/shared/Sidebar'
import ToastContainer from './components/shared/Toast'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CashierPage from './pages/CashierPage'
import InventoryPage from './pages/InventoryPage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import DatasetPage from './pages/DatasetPage'
import ModelManagementPage from './pages/ModelManagementPage'
import SettingsPage from './pages/SettingsPage'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'kasir' | 'admin'>
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/cashier" replace />
  }
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><DashboardPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/cashier" element={
          <ProtectedRoute allowedRoles={['kasir', 'admin']}>
            <AppLayout><CashierPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><InventoryPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><TransactionHistoryPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/dataset" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><DatasetPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/model" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><ModelManagementPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout><SettingsPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>,
)
