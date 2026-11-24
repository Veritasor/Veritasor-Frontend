import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { ROUTES } from './routes'
import { LocaleProvider } from './i18n/provider'
import { ToastProvider } from './components/ToastContext'
import Layout from './components/Layout'
import { CookieConsentProvider } from './components/CookieConsentContext'
import { AttestationsProvider } from './state/attestations'
import { WorkspaceProvider } from './state/workspace'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import OnboardingWizard from './pages/OnboardingWizard'
import Dashboard from './pages/Dashboard'
import Attestations from './pages/Attestations'
import AttestationDetail from './pages/AttestationDetail'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import ApiKeys from './pages/ApiKeys'
import HelpArticle from './pages/HelpArticle'
import RevenueSources from './pages/RevenueSources'
import Settings from './pages/Settings'
import ConsentPreferences from './pages/ConsentPreferences'
import VerifyProof from './pages/VerifyProof'
import {
  ConnectSourceWizard,
  SelectSourceProviderStep,
  AuthorizeSourceStep,
  OAuthCallbackLandingStep,
  ConfigureSourceScopeStep,
  MapCurrenciesStep,
  ConfirmSourceStep,
} from './pages/connect-source/ConnectSourceWizard'

/** Route table. Exported so tests can assert it covers every ROUTES value. */
export const appRoutes: RouteObject[] = [
  { path: ROUTES.home, element: <Landing /> },
  { path: ROUTES.login, element: <Login /> },
  { path: ROUTES.signup, element: <Signup /> },
  { path: ROUTES.forgotPassword, element: <ForgotPassword /> },
  { path: ROUTES.onboarding, element: <OnboardingWizard /> },
  { path: ROUTES.serverError, element: <ServerError /> },
const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/onboarding', element: <OnboardingWizard /> },
  { path: '/500', element: <ServerError /> },
  { path: '/proof/:id', element: <VerifyProof /> },
  {
    element: <Layout />,
    children: [
      { path: ROUTES.dashboard, element: <Dashboard /> },
      { path: ROUTES.attestations, element: <Attestations /> },
      { path: ROUTES.attestationDetail, element: <AttestationDetail /> },
      { path: ROUTES.sources, element: <RevenueSources /> },
      { path: ROUTES.settings, element: <Settings /> },
      { path: ROUTES.apiKeys, element: <ApiKeys /> },
      { path: ROUTES.help, element: <HelpArticle /> },
      { path: ROUTES.consentPreferences, element: <ConsentPreferences /> },
      {
        path: ROUTES.connectSource,
        element: <ConnectSourceWizard />,
        children: [
          { path: ROUTES.connectSourceProvider, element: <SelectSourceProviderStep /> },
          { path: ROUTES.connectSourceAuthorize, element: <AuthorizeSourceStep /> },
          { path: ROUTES.connectSourceCallback, element: <OAuthCallbackLandingStep /> },
          { path: ROUTES.connectSourceScope, element: <ConfigureSourceScopeStep /> },
          { path: ROUTES.connectSourceMapping, element: <MapCurrenciesStep /> },
          { path: ROUTES.connectSourceConfirm, element: <ConfirmSourceStep /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]

const router = createBrowserRouter(appRoutes, {
  future: { v7_relativeSplatPath: true },
})

/** Production entry point — wraps the data router in app-wide providers. */
export default function App() {
  return (
    <LocaleProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <AttestationsProvider>
            <CookieConsentProvider>
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </CookieConsentProvider>
          </AttestationsProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </LocaleProvider>
  )
}
