import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './i18n/provider'
import { ToastProvider } from './components/ToastContext'
import Layout from './components/Layout'
import ApiKeys from './pages/ApiKeys'
import HelpArticle from './pages/HelpArticle'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'

const Dashboard = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Dashboard Content View</div>
const Attestations = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Attestation Registry View</div>

export default function App() {
  return (
    <LocaleProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth routes (no shell layout) */}
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            {/* ForgotPassword handles ?state=expired and ?state=reset&token= internally */}
            <Route path="forgot-password" element={<ForgotPassword />} />

            {/* App routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="attestations" element={<Attestations />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="help" element={<HelpArticle />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </LocaleProvider>
  )
}