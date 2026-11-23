import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router-dom'
import { ROUTES } from '../routes'
import { appRoutes } from '../App'

/** Flatten the (possibly nested) route table into the absolute paths it serves. */
function collectRoutePaths(routes: RouteObject[], parentPath = ''): string[] {
  return routes.flatMap((route) => {
    let fullPath = parentPath

    if (route.path) {
      if (route.path.startsWith('/')) {
        fullPath = route.path
      } else {
        const base = parentPath === '/' ? '' : parentPath.replace(/\/$/, '')
        fullPath = `${base}/${route.path}`
      }
    }

    const own = route.path ? [fullPath] : []
    return [...own, ...collectRoutePaths(route.children ?? [], fullPath)]
  })
}

describe('ROUTES', () => {
  it('does not contain duplicate paths', () => {
    const values = Object.values(ROUTES)
    expect(new Set(values).size).toBe(values.length)
  })

  it('registers every ROUTES path in the router configuration', () => {
    const registered = new Set(collectRoutePaths(appRoutes))

    for (const path of Object.values(ROUTES)) {
      expect(registered, `Expected route table to include "${path}"`).toContain(path)
    }
  })
})
