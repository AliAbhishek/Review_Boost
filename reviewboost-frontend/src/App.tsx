import { Routes, Route, Navigate } from 'react-router-dom'
import CustomerReviewPage from '@/pages/review/CustomerReviewPage'
import AdminLogin from '@/pages/admin/AdminLogin'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import OwnerLogin from '@/pages/owner/OwnerLogin'
import OwnerRegister from '@/pages/owner/OwnerRegister'
import OwnerDashboard from '@/pages/owner/OwnerDashboard'
import LandingPage from '@/pages/LandingPage'
import NotFound from '@/pages/NotFound'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import StaffPage from '@/pages/staff/StaffPage'

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/r/:slug" element={<CustomerReviewPage />} />

      {/* ── Admin territory ── */}
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />

      {/* ── Owner territory ── */}
      <Route path="/login" element={<OwnerLogin />} />
      <Route path="/register" element={<OwnerRegister />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── Staff billing ── */}
      <Route path="/staff" element={<StaffPage />} />

      {/* ── Fallbacks ── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
