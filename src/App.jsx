import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import StockTransactions from './pages/StockTransactions'
import AllJobs from './pages/Services/AllJobs'
import AddJob from './pages/Services/AddJob'
import CalendarView from './pages/Services/CalendarView'
import PendingApprovals from './pages/PendingApprovals'
import AccountManagement from './pages/AccountManagement'
import ActivityLogs from './pages/ActivityLogs'
import PlaceholderPage from './pages/PlaceholderPage'

function AppRoutes() {
  const { session } = useAuth()
  const { t } = useLanguage()

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayoutWithTitle />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/add-product"
          element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <StockTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/receive"
          element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <StockTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/issue"
          element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <StockTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/borrow"
          element={
            <ProtectedRoute allowedRoles={['admin', 'user']}>
              <StockTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/all"
          element={
            <ProtectedRoute>
              <AllJobs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/add"
          element={
            <ProtectedRoute>
              <AddJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/calendar/fire-alarm"
          element={
            <ProtectedRoute>
              <CalendarView jobType="fire_alarm" title="ปฏิทิน Fire Alarm" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/calendar/fire-pump"
          element={
            <ProtectedRoute>
              <CalendarView jobType="fire_pump" title="ปฏิทิน Fire Pump" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/calendar/lightning"
          element={
            <ProtectedRoute>
              <CalendarView jobType="lightning" title="ปฏิทิน Lightning" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/calendar/delivery"
          element={
            <ProtectedRoute>
              <CalendarView jobType="delivery" title="ปฏิทิน ส่งสินค้า" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PendingApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AccountManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

const routeTitleKey = {
  '/dashboard': 'dashboardTitle',
  '/products': 'menuProducts',
  '/stock/add-product': 'stockAddProduct',
  '/stock/receive': 'stockReceive',
  '/stock/issue': 'stockIssue',
  '/stock/borrow': 'stockBorrow',
  '/services/all': 'serviceAllJobs',
  '/services/add': 'serviceAddJob',
  '/services/calendar/fire-alarm': 'serviceCalendarFireAlarm',
  '/services/calendar/fire-pump': 'serviceCalendarFirePump',
  '/services/calendar/lightning': 'serviceCalendarLightning',
  '/services/calendar/delivery': 'serviceCalendarDelivery',
  '/approvals': 'approvalsTitle',
  '/accounts': 'menuAccountManagement',
  '/activity-logs': 'menuActivityLogs',
}

function AppLayoutWithTitle() {
  const { t } = useLanguage()
  const location = useLocation()
  const titleKey = routeTitleKey[location.pathname] || 'dashboardTitle'
  return <AppLayout title={t(titleKey)} />
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
