import { BrowserRouter, Routes, Route, Navigate, useInRouterContext } from 'react-router-dom'
import { LocaleProvider } from './i18n/provider'
import Layout from './components/Layout'
import ApiKeys from './pages/ApiKeys'
import HelpArticle from './pages/HelpArticle'
import RevenueSources from './pages/RevenueSources'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'
import PageTransition from './components/PageTransition'

const Dashboard = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Dashboard Content View</div>
const Attestations = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Attestation Registry View</div>

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="attestations" element={<Attestations />} />
        <Route path="sources" element={<RevenueSources />} />
        <Route path="settings" element={<Settings />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="help" element={<HelpArticle />} />
      </Route>
      <Route
        path="/login"
        element={
          <PageTransition>
            <Login />
          </PageTransition>
        }
      />
      <Route
        path="/signup"
        element={
          <PageTransition>
            <Signup />
          </PageTransition>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PageTransition>
            <ForgotPassword />
          </PageTransition>
        }
      />
      <Route
        path="*"
        element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        }
      />
    </Routes>
  )
}

export default function App() {
  const inRouter = useInRouterContext()

  return (
    <LocaleProvider>
      {inRouter ? (
        <AppRoutes />
      ) : (
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      )}
    </LocaleProvider>
  )
}