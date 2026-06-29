import { Navigate } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import type { ReactNode } from 'react'

export default function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
