import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Attestations from './pages/Attestations'
import AttestationDetail from './pages/AttestationDetail'
import RevenueSources from './pages/RevenueSources'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import OnboardingWizard from './pages/OnboardingWizard'
import NotFound from './pages/NotFound'
import {
  ConnectSourceWizard,
  SelectSourceProviderStep,
  AuthorizeSourceStep,
  ConfigureSourceScopeStep,
  ConfirmSourceStep,
} from './pages/connect-source/ConnectSourceWizard'
import { CookieConsentProvider } from './components/CookieConsentContext'
import CookieBanner from './components/CookieBanner'

export default function App() {
  return (
    <CookieConsentProvider>
      <Routes>
      {/* ── Auth (no shell) ─────────────────────────── */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* ── Standalone onboarding wizard ─────────────── */}
      <Route path="/onboarding" element={<OnboardingWizard />} />

      {/* ── App shell ─────────────────────────────────── */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="attestations" element={<Attestations />} />
        <Route path="attestations/:id" element={<AttestationDetail />} />
        <Route path="sources" element={<RevenueSources />} />
        <Route path="connect-source" element={<ConnectSourceWizard />}>
          <Route path="provider" element={<SelectSourceProviderStep />} />
          <Route path="authorize" element={<AuthorizeSourceStep />} />
          <Route path="scope" element={<ConfigureSourceScopeStep />} />
          <Route path="confirm" element={<ConfirmSourceStep />} />
        </Route>
      </Route>

      {/* ── 404 ──────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieBanner />
    </CookieConsentProvider>
  )
}