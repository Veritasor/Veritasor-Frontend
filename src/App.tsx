import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './i18n/provider'
import { Layout } from './components/Layout'
import ApiKeys from './pages/ApiKeys'
import HelpArticle from './pages/HelpArticle'

const Dashboard = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Dashboard Content View</div>
const Attestations = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Attestation Registry View</div>

export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="attestations" element={<Attestations />} />
            <Route path="api-keys" element={<ApiKeys />} />
            <Route path="help" element={<HelpArticle />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LocaleProvider>
  )
}