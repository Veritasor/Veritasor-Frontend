---
title: Loading Skeleton Design System
description: WCAG 2.1 AA compliant loading states with shimmer animations and reduced motion support
date: 2024-01-15
---

# Loading Skeleton Design System

## Overview

The loading skeleton system provides accessible, responsive loading states for the Dashboard and Attestations pages. It reduces perceived latency through skeleton placeholders that match final layouts while ensuring compliance with WCAG 2.1 AA accessibility standards.

## Features

### Accessibility
- **aria-busy="true"** attribute to announce loading state to assistive technology
- **role="status"** for live region updates
- Descriptive **aria-label** attributes for context
- Semantic HTML structure maintained during loading

### Performance
- Shimmer animation with CSS
- Reduced motion support via `prefers-reduced-motion` media query
- Minimal repaints through CSS animations only
- No JavaScript animation overhead

### Responsive Design
- Adaptive grid layouts for different viewport sizes
- Mobile-optimized spacing and metrics
- Touch-friendly component sizing
- Proper breakpoint handling

## CSS Classes

### Core Skeleton Classes

#### `.skeleton`
Base skeleton class with shimmer animation. Applies gradient background and animation.

**Usage:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.1) 0%,
    rgba(148, 163, 184, 0.2) 50%,
    rgba(148, 163, 184, 0.1) 100%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: shimmer 2s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: pulse 2s infinite;
  }
}
```

#### `.loading-region`
Container for loading state with pointer events disabled.

**Accessibility:**
- Wraps loading skeleton components
- Contains aria-busy and aria-label attributes
- Uses role="status" for live region announcement

#### `.skeleton-metric`
Individual metric card skeleton.

**Structure:**
- `.skeleton-metric-label` - metric label placeholder
- `.skeleton-metric-value` - metric value placeholder

#### `.skeleton-card`
Card wrapper for skeleton content.

#### `.skeleton-row`
Row skeleton for list items (e.g., attestations table rows).

#### `.skeleton-row-header`
Header row skeleton for table-like structures.

## Components

### DashboardSkeleton
**Location:** `src/components/SkeletonLoader.tsx`

Loading skeleton for Dashboard page with:
- 4 metric card skeletons
- Action list item skeletons
- Proper WCAG 2.1 AA attributes

**Props:** None
**Accessibility:** aria-busy, aria-label, role="status"

### AttestationsSkeleton
**Location:** `src/components/SkeletonLoader.tsx`

Loading skeleton for Attestations page with:
- Table header row skeleton
- 5 row skeletons for list items
- Semantic table structure

**Props:** None
**Accessibility:** aria-busy, aria-label, role="status"

### MetricCardSkeleton
Individual metric card skeleton component.

### AttestationRowSkeleton
Individual attestation row skeleton component.

## Integration

### Dashboard Page
```tsx
import { DashboardSkeleton } from '../components/SkeletonLoader'

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    // Dashboard content
  )
}
```

### Attestations Page
```tsx
import { AttestationsSkeleton } from '../components/SkeletonLoader'

export default function Attestations() {
  const [isLoading, setIsLoading] = useState(false)

  if (isLoading) {
    return <AttestationsSkeleton />
  }

  return (
    // Attestations content
  )
}
```

## Accessibility Compliance

### WCAG 2.1 AA Standards

#### 1. Perceivable
- ✅ Visible shimmer animation communicates loading state
- ✅ Sufficient color contrast in skeleton backgrounds
- ✅ Placeholder shapes match final layout

#### 2. Operable
- ✅ Loading region disabled for interaction (pointer-events: none)
- ✅ Reduced motion animation for users with vestibular disorders
- ✅ No keyboard traps during loading

#### 3. Understandable
- ✅ aria-label describes loading state clearly
- ✅ role="status" announces changes to screen readers
- ✅ Semantic structure preserved

#### 4. Robust
- ✅ Valid HTML with ARIA attributes
- ✅ Compatible with assistive technologies
- ✅ Progressive enhancement - works without CSS

## Animation Details

### Shimmer Animation
- **Duration:** 2 seconds
- **Timing:** Linear infinite
- **Effect:** Left-to-right gradient sweep
- **Range:** -1000px to 1000px

### Pulse Animation (Reduced Motion)
- **Duration:** 2 seconds
- **Timing:** Ease in-out infinite
- **Effect:** Opacity fade 1 → 0.7 → 1
- **Purpose:** Signals loading without motion

## Responsive Breakpoints

### Mobile (< 640px)
- Single column layout for metrics
- Stacked grid for table cells
- Larger touch targets
- Simplified headers

### Tablet (640px - 1024px)
- 2-column grid for metrics
- Responsive row spacing
- Adaptive font sizing

### Desktop (> 1024px)
- Multi-column auto-fit grid for metrics
- Full-width table displays
- Optimal spacing and typography

## Testing

### Unit Tests
- Location: `src/components/SkeletonLoader.test.tsx`
- Coverage: 14 tests covering:
  - Accessibility attributes
  - CSS class application
  - Component rendering
  - Responsive behavior

### Accessibility Testing
- axe DevTools: Run accessibility audit
- Screen reader: Test with NVDA/JAWS
- Keyboard: Tab through page
- Color contrast: Verify WCAG AA compliance

### Visual Regression
- Compare skeleton layouts with final content
- Verify animations on different browsers
- Test reduced motion settings

## Best Practices

### When to Use Skeletons
✅ Network requests > 200ms
✅ Data visualization updates
✅ List loading scenarios
✅ Progressive content loading

### When NOT to Use
❌ Instant operations (< 200ms)
❌ Error states
❌ Empty states
❌ Transient overlays

### Performance Tips
- Keep skeleton CSS minimal
- Use hardware-accelerated animations
- Avoid JavaScript for animations
- Test performance on low-end devices

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers

## Future Enhancements

1. **Skeleton Content Switching**
   - Smooth transitions between skeleton and content
   - Skeleton fade-out animation

2. **Custom Skeleton Shapes**
   - Circle skeletons for avatars
   - More complex shapes via SVG

3. **Skeleton Error States**
   - Skeleton background color change on error
   - Retry button integration

4. **Performance Metrics**
   - Skeleton timing in performance monitoring
   - Perceived performance benchmarks

## References

- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Reducing Perceived Latency](https://www.smashingmagazine.com/2020/11/skeleton-screens-best-practices/)
- [Prefers Reduced Motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

## Maintenance

### Update Checklist
- [ ] Test with latest screen readers
- [ ] Verify animation performance
- [ ] Review color contrast ratios
- [ ] Check mobile responsiveness
- [ ] Update accessibility audit results

### Related Files
- `src/index.css` - Skeleton CSS styles
- `src/components/SkeletonLoader.tsx` - Skeleton components
- `src/pages/Dashboard.tsx` - Dashboard integration
- `src/pages/Attestations.tsx` - Attestations integration
