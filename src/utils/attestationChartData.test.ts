import { describe, expect, it } from 'vitest';
import {
  aggregateAttestationTrend,
  getAttestationChartGeometry,
  getAttestationChartLabelIndices,
} from './attestationChartData';

describe('getAttestationChartGeometry', () => {
  it.each([1, 2, 7, 31])('keeps %i bars inside the viewBox without overlap', (count) => {
    const chartWidth = 640;
    const padding = 12;
    const { barWidth, positions } = getAttestationChartGeometry(count, chartWidth, padding);

    expect(positions).toHaveLength(count);
    for (let index = 0; index < positions.length; index += 1) {
      expect(positions[index]).toBeGreaterThanOrEqual(padding);
      expect(positions[index] + barWidth).toBeLessThanOrEqual(chartWidth - padding);
      if (index > 0) {
        expect(positions[index]).toBeGreaterThanOrEqual(positions[index - 1] + barWidth);
      }
    }
  });
});

describe('getAttestationChartLabelIndices', () => {
  it('thins labels so their estimated text widths do not overlap', () => {
    const labels = Array.from({ length: 31 }, (_, index) => `Oct ${index + 1}`);
    const centers = Array.from({ length: 31 }, (_, index) => 22 + index * 19.87);
    const indices = getAttestationChartLabelIndices(labels, centers);

    expect(indices.length).toBeLessThan(labels.length);
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
  });
});
