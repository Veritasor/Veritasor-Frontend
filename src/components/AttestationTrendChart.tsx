import { useId, useState, type MouseEvent, type KeyboardEvent } from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import type { AttestationStatus, AttestationTrendDatum } from '../utils/attestationChartData';

const STATUS_CONFIG = [
  { key: 'verified', label: 'Verified', color: '#137a63', pattern: 'stripes' },
  { key: 'pending', label: 'Pending', color: '#b58900', pattern: 'dots' },
  { key: 'failed', label: 'Failed', color: '#b33b3b', pattern: 'crosshatch' },
] as const;

type View = 'chart' | 'table';
export type TrendStatusFilter = 'all' | AttestationStatus;

const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const MARGIN = { top: 10, right: 16, bottom: 40, left: 44 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

export function buildAttestationDrilldownUrl(
  datum: AttestationTrendDatum,
  statusFilter: TrendStatusFilter = 'all',
): string {
  const params = new URLSearchParams();

  if (statusFilter !== 'all') {
    params.set('status', statusFilter);
  } else {
    const nonZeroStatuses = STATUS_CONFIG.filter((s) => datum[s.key] > 0);
    if (nonZeroStatuses.length === 1) {
      params.set('status', nonZeroStatuses[0].key);
    }
  }

  if (datum.date && datum.date !== 'Unknown') {
    params.set('from', datum.date);
    params.set('to', datum.endDate ?? datum.date);
  }

  const query = params.toString();
  return query ? `/attestations?${query}` : '/attestations';
}

interface AttestationTrendChartProps {
  data: AttestationTrendDatum[];
  title?: string;
  showStatusFilter?: boolean;
}

function useOptionalNavigate() {
  const inRouter = useInRouterContext();
  // Safe conditional hook usage avoided by delegating to inner component or checking context:
  // Wait: hooks cannot be called conditionally, so we use a small helper component for router links.
  return inRouter;
}

function RouterAwareBarLink({
  href,
  className,
  ariaLabel,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  href: string;
  className: string;
  ariaLabel: string;
  onFocus: () => void;
  onBlur: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLAnchorElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(href);
    }
  }

  return (
    <a
      href={href}
      className={className}
      tabIndex={0}
      role='link'
      aria-label={ariaLabel}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </a>
  );
}

function PlainBarLink({
  href,
  className,
  ariaLabel,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  href: string;
  className: string;
  ariaLabel: string;
  onFocus: () => void;
  onBlur: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      tabIndex={0}
      role='link'
      aria-label={ariaLabel}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </a>
  );
}

export default function AttestationTrendChart({
  data,
  title = 'Attestation history',
  showStatusFilter = false,
}: AttestationTrendChartProps) {
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9]/g, '');
  const titleId = `trend-title-${safeId}`;
  const descId = `trend-desc-${safeId}`;
  const patternId = (key: string) => `pattern-${safeId}-${key}`;
  const inRouter = useOptionalNavigate();

  const [view, setView] = useState<View>('chart');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrendStatusFilter>('all');

  const visibleStatuses =
    statusFilter === 'all'
      ? STATUS_CONFIG
      : STATUS_CONFIG.filter((status) => status.key === statusFilter);

  const getDatumTotal = (datum: AttestationTrendDatum) =>
    statusFilter === 'all' ? datum.total : datum[statusFilter];

  const maxTotal = Math.max(0, ...data.map(getDatumTotal));

  const toggleView = () => setView((v) => (v === 'chart' ? 'table' : 'chart'));

  if (data.length === 0) {
    return (
      <section className='attestation-trend-chart' aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        <p role='status'>No attestation data available for this period.</p>
      </section>
    );
  }

  const activeDatum = activeIndex !== null ? data[activeIndex] : null;
  const BarLink = inRouter ? RouterAwareBarLink : PlainBarLink;

  return (
    <section className='attestation-trend-chart' aria-labelledby={titleId}>
      <header className='attestation-trend-chart__header'>
        <h2 id={titleId}>{title}</h2>
        <div className='attestation-trend-chart__controls'>
          {showStatusFilter && (
            <div className='attestation-trend-chart__filters' role='group' aria-label='Filter chart by status'>
              {(['all', 'verified', 'pending', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  type='button'
                  className={`attestation-trend-chart__filter-btn${statusFilter === status ? ' attestation-trend-chart__filter-btn--active' : ''}`}
                  aria-pressed={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          )}
          <button
            type='button'
            className='attestation-trend-chart__toggle'
            onClick={toggleView}
            aria-expanded={view === 'table'}
          >
            {view === 'chart' ? 'View as table' : 'View as chart'}
          </button>
        </div>
      </header>

      {view === 'chart' ? (
        <>
          <div className='attestation-trend-chart__legend' role='list' aria-label='Chart legend'>
            {visibleStatuses.map((status) => (
              <span key={status.key} role='listitem' className={`legend-item legend-item--${status.key}`}>
                <svg width='16' height='16' aria-hidden='true'>
                  <rect width='16' height='16' fill={`url(#${patternId(status.key)})`} />
                </svg>
                {status.label}
              </span>
            ))}
          </div>

          <svg
            className='attestation-trend-chart__svg'
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role='img'
            aria-labelledby={`${titleId} ${descId}`}
          >
            <desc id={descId}>
              Stacked bar chart showing counts of verified, pending, and failed attestations. Select a bar to view filtered attestations.
            </desc>

            <defs>
              {STATUS_CONFIG.map((status) => (
                <pattern id={patternId(status.key)} key={status.key} patternUnits='userSpaceOnUse' width='6' height='6'>
                  <rect width='6' height='6' fill={status.color} />
                  {status.pattern === 'stripes' && <path d='M0 0 L6 6' stroke='#fff' strokeWidth='2' />}
                  {status.pattern === 'dots' && <circle cx='3' cy='3' r='1.5' fill='#fff' />}
                  {status.pattern === 'crosshatch' && (
                    <>
                      <path d='M0 0 L6 6' stroke='#fff' strokeWidth='2' />
                      <path d='M6 0 L0 6' stroke='#fff' strokeWidth='2' />
                    </>
                  )}
                </pattern>
              ))}
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
              const value = Math.round(maxTotal * fraction);
              const y = MARGIN.top + PLOT_HEIGHT - fraction * PLOT_HEIGHT;
              return (
                <g key={fraction}>
                  <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={y} y2={y} stroke='#d1d5db' strokeDasharray='4 4' />
                  <text x={MARGIN.left - 8} y={y + 4} textAnchor='end' className='axis-label'>
                    {value}
                  </text>
                </g>
              );
            })}

            <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={MARGIN.top + PLOT_HEIGHT} y2={MARGIN.top + PLOT_HEIGHT} stroke='#6b7280' strokeWidth='2' />

            {data.map((datum, index) => {
              const slot = PLOT_WIDTH / data.length;
              const barWidth = Math.max(slot * 0.6, 2);
              const x = MARGIN.left + slot * index + (slot - barWidth) / 2;
              const yTop = MARGIN.top + PLOT_HEIGHT;
              let yCursor = 0;
              const segments = visibleStatuses.map((status) => {
                const count = datum[status.key];
                if (count <= 0) return null;
                const segmentHeight = (count / Math.max(maxTotal, 1)) * PLOT_HEIGHT;
                const y = yTop - yCursor - segmentHeight;
                yCursor += segmentHeight;
                return (
                  <rect
                    key={status.key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={segmentHeight}
                    fill={`url(#${patternId(status.key)})`}
                    stroke='#1f2937'
                    strokeWidth='0.5'
                  />
                );
              });

              const href = buildAttestationDrilldownUrl(datum, statusFilter);
              const periodLabel = datum.endDate ? `${datum.date} to ${datum.endDate}` : datum.date;

              return (
                <BarLink
                  key={datum.date}
                  href={href}
                  className='attestation-trend-chart__bar'
                  ariaLabel={`${periodLabel}: verified ${datum.verified}, pending ${datum.pending}, failed ${datum.failed}`}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {segments}
                  <text x={x + barWidth / 2} y={yTop + 16} textAnchor='middle' className='x-axis-label'>
                    {dateShort(datum.date)}
                  </text>
                </BarLink>
              );
            })}
          </svg>

          <div className='attestation-trend-chart__tooltip' aria-live='polite' role='status'>
            {activeDatum ? (
              `${activeDatum.date}: verified ${activeDatum.verified}, pending ${activeDatum.pending}, failed ${activeDatum.failed}`
            ) : (
              'Hover or focus a bar for details.'
            )}
          </div>
        </>
      ) : (
        <table className='attestation-trend-chart__table'>
          <caption>Attestation counts by date</caption>
          <thead>
            <tr>
              <th scope='col'>Date</th>
              <th scope='col'>Verified</th>
              <th scope='col'>Pending</th>
              <th scope='col'>Failed</th>
              <th scope='col'>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((datum) => (
              <tr key={datum.date}>
                <th scope='row'>{datum.date}</th>
                <td>{datum.verified}</td>
                <td>{datum.pending}</td>
                <td>{datum.failed}</td>
                <td>{datum.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function dateShort(date: string): string {
  if (!date || date === 'Unknown') return '—';
  const parts = date.split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return date;
}
