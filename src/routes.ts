/**
 * Single source of truth for every path in the app.
 *
 * The router table and all navigation surfaces (sidebar, tabs, top bar,
 * command palette, breadcrumb links) read from here so renaming a route is a
 * one-line change instead of a grep across components.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  onboarding: '/onboarding',
  serverError: '/500',
  motionTokens: '/motion-tokens',

  dashboard: '/dashboard',
  attestations: '/attestations',
  attestationDetail: '/attestations/:id',
  sources: '/sources',
  settings: '/settings',
  apiKeys: '/api-keys',
  help: '/help',
  helpArticle: '/help/:slug',
  consentPreferences: '/consent-preferences',

  connectSource: '/connect-source',
  connectSourceProvider: '/connect-source/provider',
  connectSourceAuthorize: '/connect-source/authorize',
  connectSourceCallback: '/connect-source/callback',
  connectSourceScope: '/connect-source/scope',
  connectSourceMapping: '/connect-source/mapping',
  connectSourceConfirm: '/connect-source/confirm',
} as const

export type RouteKey = keyof typeof ROUTES
export type RoutePath = (typeof ROUTES)[RouteKey]
