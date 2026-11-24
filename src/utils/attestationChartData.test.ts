import { describe, expect, it } from 'vitest';
import {
  aggregateAttestationTrend,
  getAttestationChartGeometry,
  getAttestationChartLabelIndices,
} from './attestationChartData';

describe('getAttestationChartGeometry', () => {
  it('returns zero barWidth and empty positions without NaN for empty or invalid bucket counts', () => {
    for (const count of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      const geometry = getAttestationChartGeometry(count);
      expect(geometry.barWidth).toBe(0);
      expect(Number.isNaN(geometry.barWidth)).toBe(false);
      expect(geometry.positions).toEqual([]);
    }
  });

  it('handles zero or degenerate chart width without NaN', () => {
    const zeroWidth = getAttestationChartGeometry(3, 0, 0);
    expect(zeroWidth.barWidth).toBe(0);
    expect(zeroWidth.positions).toEqual([0, 0, 0]);

    const narrowWidth = getAttestationChartGeometry(2, 10, 12);
    expect(narrowWidth.barWidth).toBe(0);
    expect(narrowWidth.positions).toEqual([12, 12]);

    const nanDimensions = getAttestationChartGeometry(2, Number.NaN, Number.NaN);
    expect(nanDimensions.barWidth).toBe(0);
    expect(nanDimensions.positions).toEqual([0, 0]);
  });

  it.each([1, 2, 7, 31])('keeps %i bars inside the viewBox without overlap', (count) => {
    const chartWidth = 640;
    const padding = 12;
    const { barWidth, positions } = getAttestationChartGeometry(count, chartWidth, padding);

    expect(positions).toHaveLength(count);
    for (let index = 0; index < positions.length; index += 1) {
      expect(Number.isNaN(positions[index])).toBe(false);
      expect(positions[index]).toBeGreaterThanOrEqual(padding);
      expect(positions[index] + barWidth).toBeLessThanOrEqual(chartWidth - padding);
      if (index > 0) {
        expect(positions[index]).toBeGreaterThanOrEqual(positions[index - 1] + barWidth);
      }
    }
  });
});

describe('getAttestationChartLabelIndices', () => {
  it('handles empty and single-label inputs', () => {
    expect(getAttestationChartLabelIndices([], [])).toEqual([]);
    expect(getAttestationChartLabelIndices(['Oct 1'], [100])).toEqual([0]);
  });

  it('keeps all indices when labels do not overlap and drops overlapping second label', () => {
    expect(getAttestationChartLabelIndices(['Oct 1', 'Oct 2'], [50, 200])).toEqual([0, 1]);
    expect(getAttestationChartLabelIndices(['Oct 1', 'Oct 2'], [50, 55])).toEqual([0]);
  });

  it('filters out missing or non-finite centers', () => {
    expect(
      getAttestationChartLabelIndices(['Oct 1', 'Oct 2', 'Oct 3'], [50, Number.NaN, 200]),
    ).toEqual([0, 2]);
  });

  it('thins labels so their estimated text widths do not overlap', () => {
    const labels = Array.from({ length: 31 }, (_, index) => `Oct ${index + 1}`);
    const centers = Array.from({ length: 31 }, (_, index) => 22 + index * 19.87);
    const indices = getAttestationChartLabelIndices(labels, centers);

    expect(indices.length).toBeLessThan(labels.length);
    expect(indices[0]).toBe(0);
    for (let index = 1; index < indices.length; index += 1) {
      const previous = indices[index - 1];
      const current = indices[index];
      expect(centers[current] - labels[current].length * 3).toBeGreaterThanOrEqual(
        centers[previous] + labels[previous].length * 3 + 6,
      );
    }
  });
});

describe('aggregateAttestationTrend range and bucketing', () => {
  const records = [
    { status: 'verified', createdAt: '2026-05-04T10:00:00Z' }, // Mon
    { status: 'pending', createdAt: '2026-05-06T12:00:00Z' }, // Wed (same week)
    { status: 'failed', createdAt: '2026-05-12T09:00:00Z' }, // Tue (next week)
    { status: 'verified', createdAt: '2026-06-20T09:00:00Z' }, // Outside May
  ];

  it('filters records by inclusive from/to date range', () => {
    const result = aggregateAttestationTrend(records, {
      from: '2026-05-05',
      to: '2026-05-15',
    });

    expect(result).toEqual([
      { date: '2026-05-06', verified: 0, pending: 1, failed: 0, total: 1 },
      { date: '2026-05-12', verified: 0, pending: 0, failed: 1, total: 1 },
    ]);
  });

  it('buckets records by ISO week (Monday-Sunday) with endDate', () => {
    const result = aggregateAttestationTrend(records, {
      from: '2026-05-01',
      to: '2026-05-31',
      bucket: 'week',
    });

    expect(result).toEqual([
      {
        date: '2026-05-04',
        endDate: '2026-05-10',
        verified: 1,
        pending: 1,
        failed: 0,
        total: 2,
      },
      {
        date: '2026-05-11',
        endDate: '2026-05-17',
        verified: 0,
        pending: 0,
        failed: 1,
        total: 1,
      },
    ]);
  });

  it('automatically switches to week bucketing when range exceeds 31 days', () => {
    const result = aggregateAttestationTrend(records, {
      from: '2026-05-01',
      to: '2026-07-01',
      bucket: 'auto',
    });

    expect(result[0].endDate).toBe('2026-05-10');
    expect(result).toHaveLength(3);
describe('aggregateAttestationTrend', () => {
  it('returns an empty array for empty input', () => {
    expect(aggregateAttestationTrend([])).toEqual([]);
  });

  it('aggregates a single record correctly', () => {
    expect(
      aggregateAttestationTrend([{ id: '1', status: 'verified', date: '2026-10-01T12:00:00Z' }]),
    ).toEqual([
      {
        date: '2026-10-01',
        verified: 1,
        pending: 0,
        failed: 0,
        total: 1,
      },
    ]);
  });

  it('preserves equal counts on status ties for the same date', () => {
    const result = aggregateAttestationTrend([
      { status: 'verified', date: '2026-10-05' },
      { status: 'success', date: '2026-10-05' },
      { status: 'pending', date: '2026-10-05' },
      { status: 'in_review', date: '2026-10-05' },
      { status: 'failed', date: '2026-10-05' },
      { status: 'rejected', date: '2026-10-05' },
    ]);

    expect(result).toEqual([
      {
        date: '2026-10-05',
        verified: 2,
        pending: 2,
        failed: 2,
        total: 6,
      },
    ]);
  });

  it('normalizes dates, falls back to createdAt/Unknown, and sorts ascending', () => {
    const result = aggregateAttestationTrend([
      { status: 'valid', createdAt: '2026-10-10T08:30:00Z' },
      { status: 'waiting', date: '2026-10-02' },
      { status: undefined, date: 'not-a-date' },
      { status: 'processing' },
    ]);

    expect(result).toEqual([
      { date: '2026-10-02', verified: 0, pending: 1, failed: 0, total: 1 },
      { date: '2026-10-10', verified: 1, pending: 0, failed: 0, total: 1 },
      { date: 'Unknown', verified: 0, pending: 1, failed: 1, total: 2 },
    ]);
  });
});
