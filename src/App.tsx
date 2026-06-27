import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Attestations from './pages/Attestations'
import AttestationDetail from './pages/AttestationDetail'
import RevenueSources from './pages/RevenueSources'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import NotFound from './pages/NotFound'
import OnboardingWizard from './pages/OnboardingWizard'
import {
  AuthorizeSourceStep,
  ConfirmSourceStep,
  ConfigureSourceScopeStep,
  ConnectSourceWizard,
  SelectSourceProviderStep,
} from './pages/connect-source/ConnectSourceWizard'

export default function App() {
  return (
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

        {/* Connect-source 4-step wizard (nested under Layout) */}
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
  )
}