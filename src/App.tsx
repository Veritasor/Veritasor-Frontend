import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './i18n/provider'
import Layout from './components/Layout'
import ApiKeys from './pages/ApiKeys'
import HelpArticle from './pages/HelpArticle'
import RevenueSources from './pages/RevenueSources'
import {
  ConnectSourceWizard,
  SelectSourceProviderStep,
  AuthorizeSourceStep,
  ConfigureSourceScopeStep,
  ConfirmSourceStep,
} from './pages/connect-source/ConnectSourceWizard'

const Dashboard = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Dashboard Content View</div>
const Attestations = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Attestation Registry View</div>

/**
 * AppRoutes — the route tree without any router or locale wrapper.
 * Exported so tests can wrap it in MemoryRouter + IntlProvider directly.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="attestations" element={<Attestations />} />
        <Route path="sources" element={<RevenueSources />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="help" element={<HelpArticle />} />
        <Route path="connect-source" element={<ConnectSourceWizard />}>
          <Route path="provider" element={<SelectSourceProviderStep />} />
          <Route path="authorize" element={<AuthorizeSourceStep />} />
          <Route path="scope" element={<ConfigureSourceScopeStep />} />
          <Route path="confirm" element={<ConfirmSourceStep />} />
        </Route>
      </Route>
    </Routes>
  )
}

/** Production entry point — wraps AppRoutes in BrowserRouter + LocaleProvider. */
export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LocaleProvider>
  )
}
