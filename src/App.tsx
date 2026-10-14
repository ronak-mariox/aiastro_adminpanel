import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ConfirmProvider, ToastProvider } from '@/components/ui'
import AppLayout from '@/layout/AppLayout'
import { AuthProvider, useAuth } from '@/lib/auth'
import { modules } from '@/modules/registry'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

function RequireAuth() {
  const { admin, status } = useAuth()
  const location = useLocation()
  if (status === 'loading')
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-muted">
        <Loader2 className="size-6 animate-spin text-gold-600" />
      </div>
    )
  return admin ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [...modules.flatMap(m => m.routes), { path: '*', element: <NotFound /> }],
      },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
