import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { ROUTES } from './routes'
import { Suspense, lazy } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, type RouteObject } from 'react-router-dom'
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
import { RouteErrorBoundary } from './components/ErrorBoundary'
import { DashboardSkeleton } from './components/SkeletonLoader'
import ServerError from './pages/ServerError'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Attestations = lazy(() => import('./pages/Attestations'))
const AttestationDetail = lazy(() => import('./pages/AttestationDetail'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const HelpArticle = lazy(() => import('./pages/HelpArticle'))
const RevenueSources = lazy(() => import('./pages/RevenueSources'))
const Settings = lazy(() => import('./pages/Settings'))
const ConsentPreferences = lazy(() => import('./pages/ConsentPreferences'))

const ConnectSourceWizard = lazy(() =>
  import('./pages/connect-source/ConnectSourceWizard').then((m) => ({
    default: m.ConnectSourceWizard,
  })),
)
const SelectSourceProviderStep = lazy(() =>
  import('./pages/connect-source/ConnectSourceWizard').then((m) => ({
    default: m.SelectSourceProviderStep,
  })),
)
const AuthorizeSourceStep = lazy(() =>
  import('./pages/connect-source/ConnectSourceWizard').then((m) => ({
    default: m.AuthorizeSourceStep,
  })),
)
const OAuthCallbackLandingStep = lazy(() =>
  import('./pages/connect-source/ConnectSourceWizard').then((m) => ({
    default: m.OAuthCallbackLandingStep,
  })),
)
const ConfigureSourceScopeStep = lazy(() =>
  import('./pages/connect-source/ConnectSourceWizard').then((m) => ({
    default: m.ConfigureSourceScopeStep,
  })),
)
const MapCurrenciesStep = lazy(() =>
  import('./pages/connect-source/ConnectSourceWizard').then((m) => ({
    default: m.MapCurrenciesStep,
  })),
)
const ConfirmSourceStep = lazy(() =>
  import('./pages/connect-source/ConnectSourceWizard').then((m) => ({
    default: m.ConfirmSourceStep,
  })),
)

export function RouteSuspenseFallback() {
  return (
    <div aria-busy="true" role="status" aria-label="Loading page">
      <DashboardSkeleton />
    </div>
  )
}

function RootSuspenseBoundary() {
  return (
    <Suspense fallback={<RouteSuspenseFallback />}>
      <Outlet />
    </Suspense>
  )
}

const appRoutes: RouteObject[] = [
  {
    element: <RootSuspenseBoundary />,
    errorElement: <RouteErrorBoundary />,
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
      { path: '/', element: <Landing /> },
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/onboarding', element: <OnboardingWizard /> },
      { path: '/500', element: <ServerError /> },
      {
        element: <Layout />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'attestations', element: <Attestations /> },
          { path: 'attestations/:id', element: <AttestationDetail /> },
          { path: 'sources', element: <RevenueSources /> },
          { path: 'settings', element: <Settings /> },
          { path: 'api-keys', element: <ApiKeys /> },
          { path: 'help', element: <HelpArticle /> },
          { path: 'consent-preferences', element: <ConsentPreferences /> },
          {
            path: 'connect-source',
            element: <ConnectSourceWizard />,
            children: [
              { path: 'provider', element: <SelectSourceProviderStep /> },
              { path: 'authorize', element: <AuthorizeSourceStep /> },
              { path: 'callback', element: <OAuthCallbackLandingStep /> },
              { path: 'scope', element: <ConfigureSourceScopeStep /> },
              { path: 'mapping', element: <MapCurrenciesStep /> },
              { path: 'confirm', element: <ConfirmSourceStep /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
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
