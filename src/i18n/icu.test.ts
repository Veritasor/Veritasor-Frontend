import { createElement } from 'react'
import { describe, it, expect } from 'vitest'
import { IntlProvider, useIntl } from 'react-intl'
import { renderHook } from '@testing-library/react'
import messages from './messages/en.json'

describe('ICU plural rules', () => {
  it('renders plural form for zero, one, and many', () => {
    const { result } = renderHook(() => useIntl(), {
      wrapper: ({ children }) => createElement(IntlProvider, { locale: 'en', messages }, children),
    })
    expect(result.current.formatMessage({ id: 'milestone.count' }, { count: 0 })).toBe('No milestones')
    expect(result.current.formatMessage({ id: 'milestone.count' }, { count: 1 })).toBe('1 milestone')
    expect(result.current.formatMessage({ id: 'milestone.count' }, { count: 5 })).toBe('5 milestones')
  })
})
