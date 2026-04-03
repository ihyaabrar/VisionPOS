import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Navbar from './components/shared/Navbar'
import ToastContainer from './components/shared/Toast'
import LoginPage from './pages/LoginPage'
import CashierPage from './pages/CashierPage'
import InventoryPage from './pages/InventoryPage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import DatasetPage from './pages/DatasetPage'
import ModelManagementPage from './pages/ModelManagementPage'
import SettingsPage from './pages/SettingsPage'

// ProtectedRoute: cek autentikasi dan role
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'kasir' | 'admin'>
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Kasir yang mencoba akses halaman admin → redirect ke /cashier
    return <Navigate to="/cashier" replace />
  }

  return <>{children}</>
}

// Layout dengan Navbar untuk halaman yang sudah login
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main style={{ padding: 20 }}>{children}</main>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected: kasir + admin */}
        <Route
          path="/cashier"
          element={
            <ProtectedRoute allowedRoles={['kasir', 'admin']}>
              <AppLayout>
                <CashierPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected: admin only */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <InventoryPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <TransactionHistoryPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dataset"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <DatasetPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/model"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <ModelManagementPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>,
)
