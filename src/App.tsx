import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Attestations from './pages/Attestations'
import RevenueSources from './pages/RevenueSources'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import OnboardingWizard from './pages/OnboardingWizard'
import NotFound from './pages/NotFound'
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
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="attestations" element={<Attestations />} />
        <Route path="sources" element={<RevenueSources />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
