import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AttestationTrendChart from './AttestationTrendChart';
import { aggregateAttestationTrend } from '../utils/attestationChartData';

const sampleData = [
  { date: '2025-03-01', verified: 1, pending: 0, failed: 0, total: 1 },
  { date: '2025-03-02', verified: 1, pending: 1, failed: 0, total: 2 },
  { date: '2025-03-03', verified: 0, pending: 0, failed: 1, total: 1 },
];

describe('AttestationTrendChart', () => {
  it('renders heading, legend, and chart', () => {
    render(<AttestationTrendChart data={sampleData} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Attestation history' })).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: 'Chart legend' });
    expect(within(legend).getByText('Verified')).toBeInTheDocument();
    expect(within(legend).getByText('Pending')).toBeInTheDocument();
    expect(within(legend).getByText('Failed')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('exposes accessible chart summary, per-bar titles, and visually hidden data table in chart view', () => {
    render(<AttestationTrendChart data={sampleData} />);

    const chart = screen.getByRole('img');
    const labelledBy = chart.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const [titleId, descId] = labelledBy!.split(' ');
    expect(document.getElementById(titleId)).toHaveTextContent('Attestation history');
    expect(document.getElementById(descId)).toHaveTextContent(
      'Stacked bar chart showing counts of verified, pending, and failed attestations across 3 periods. Totals: 2 verified, 1 pending, 1 failed (4 total).',
    );

    const bars = [
      '2025-03-01: verified 1, pending 0, failed 0',
      '2025-03-02: verified 1, pending 1, failed 0',
      '2025-03-03: verified 0, pending 0, failed 1',
    ];
    for (const label of bars) {
      const bar = screen.getByRole('button', { name: label });
      expect(bar).toBeInTheDocument();
      expect(bar.querySelector('title')).toHaveTextContent(label);
    }

    const table = screen.getByRole('table', { name: 'Attestation counts by date' });
    expect(table).toHaveClass('sr-only');
    expect(within(table).getByRole('rowheader', { name: '2025-03-01' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: '2025-03-02' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: '2025-03-03' })).toBeInTheDocument();
  });

  it('toggles to table view and back', () => {
    render(<AttestationTrendChart data={sampleData} />);
    expect(screen.getByRole('table')).toHaveClass('sr-only');

    fireEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(table).not.toHaveClass('sr-only');
    expect(within(table).getByText('2025-03-02')).toBeInTheDocument();
    expect(within(table).getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View as chart' }));
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveClass('sr-only');
  });

  it('shows empty state message when no data is provided', () => {
    render(<AttestationTrendChart data={[]} />);
    expect(screen.getByText('No attestation data available for this period.')).toBeInTheDocument();
  });

  it('omits non-positive status segments while retaining the bar outcome', () => {
    render(
      <AttestationTrendChart
        data={[{ date: '2025-03-04', verified: 0, pending: 0, failed: 0, total: 0 }]}
      />,
    );

    const bar = screen.getByRole('link', { name: /2025-03-04: verified 0/i });
    expect(bar.querySelectorAll('rect')).toHaveLength(0);
    expect(bar).toHaveAttribute('href', '/attestations?from=2025-03-04&to=2025-03-04');
    expect(screen.getByRole('status')).toHaveTextContent('Hover or focus a bar for details.');
  });

  it('renders focusable drill-down links with status and date query params', () => {
    render(<AttestationTrendChart data={sampleData} />);

    const verifiedBar = screen.getByRole('link', { name: /2025-03-01: verified 1/i });
    expect(verifiedBar).toHaveAttribute('href', '/attestations?status=verified&from=2025-03-01&to=2025-03-01');
    expect(verifiedBar).toHaveAttribute('tabindex', '0');

    const mixedBar = screen.getByRole('link', { name: /2025-03-02: verified 1, pending 1/i });
    expect(mixedBar).toHaveAttribute('href', '/attestations?from=2025-03-02&to=2025-03-02');
  });
});

describe('aggregateAttestationTrend', () => {
  it('groups records by date and status', () => {
    const result = aggregateAttestationTrend([
      { status: 'Verified', date: '2025-03-01' },
      { status: 'Pending', date: '2025-03-02' },
      { status: 'Revoked', date: '2025-03-02' },
      { status: 'In review', date: '2025-03-02' },
    ]);
    expect(result).toEqual([
      { date: '2025-03-01', verified: 1, pending: 0, failed: 0, total: 1 },
      { date: '2025-03-02', verified: 0, pending: 2, failed: 1, total: 3 },
    ]);
  });

  it('handles empty and invalid inputs', () => {
    expect(aggregateAttestationTrend([])).toEqual([]);
    const result = aggregateAttestationTrend([{ status: 'Verified' }]);
    expect(result).toEqual([
      { date: 'Unknown', verified: 1, pending: 0, failed: 0, total: 1 },
    ]);
  });
});
