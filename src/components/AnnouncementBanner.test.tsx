import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AnnouncementBanner from './AnnouncementBanner'

describe('AnnouncementBanner saveDismissed', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('saves dismissed announcement successfully', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const announcements = [{ id: 'a1', title: 'T1', message: 'M1' }]
    
    render(<AnnouncementBanner announcements={announcements} />)
    
    expect(screen.getByText('T1')).toBeInTheDocument()
    
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }))
    
    // UI updates
    expect(screen.queryByText('T1')).not.toBeInTheDocument()
    
    // Local storage was called successfully
    expect(setItemSpy).toHaveBeenCalledWith(
      'veritasor:dismissed-announcements:anonymous',
      JSON.stringify(['a1'])
    )
  })

  it('ignores storage errors when saving dismissed announcement (branch at line 36)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded')
    })
    
    const announcements = [{ id: 'a2', title: 'T2', message: 'M2' }]
    
    render(<AnnouncementBanner announcements={announcements} />)
    
    expect(screen.getByText('T2')).toBeInTheDocument()
    
    // This should not throw, branch is caught
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }))
    }).not.toThrow()
    
    // UI still updates because state is updated successfully despite storage error
    expect(screen.queryByText('T2')).not.toBeInTheDocument()
    
    expect(setItemSpy).toHaveBeenCalled()
  })
})
