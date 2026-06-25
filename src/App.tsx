import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import ApiKeys from './pages/ApiKeys'

const Dashboard = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Dashboard Content View</div>
const Attestations = () => <div className="p-6 text-zinc-900 dark:text-white font-semibold">Attestation Registry View</div>

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attestations" element={<Attestations />} />
          <Route path="api-keys" element={<ApiKeys />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}