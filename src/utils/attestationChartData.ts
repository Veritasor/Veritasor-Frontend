export type AttestationStatus = 'verified' | 'pending' | 'failed';
export type TrendBucketGranularity = 'day' | 'week';

export interface AttestationTrendDatum {
  date: string;
  endDate?: string;
  verified: number;
  pending: number;
  failed: number;
  total: number;
}

export interface AggregateAttestationTrendOptions {
  from?: string;
  to?: string;
  bucket?: TrendBucketGranularity | 'auto';
}

export interface AttestationInput {
  id?: string;
  status?: string;
  date?: string;
  createdAt?: string;
}

export interface AttestationChartGeometry {
  barWidth: number;
  positions: number[];
}

export function getAttestationChartGeometry(
  bucketCount: number,
  chartWidth = 640,
  padding = 12,
): AttestationChartGeometry {
  const count = Math.max(0, Math.floor(bucketCount));
  const bandWidth = Math.max(0, chartWidth - padding * 2) / Math.max(count, 1);
  const barWidth = count === 0 ? 0 : Math.min(48, bandWidth * 0.7);

  return {
    barWidth,
    positions: Array.from({ length: count }, (_, index) =>
      padding + index * bandWidth + (bandWidth - barWidth) / 2,
    ),
  };
}

export function getAttestationChartLabelIndices(labels: string[], centers: number[]): number[] {
  const candidates = labels
    .map((label, index) => ({ index, center: centers[index], width: label.length * 6 }))
    .filter(({ center }) => center !== undefined);
  if (candidates.length <= 1) return candidates.map(({ index }) => index);

  const selected = [candidates[0]];
  for (const candidate of candidates.slice(1, -1)) {
    const previous = selected[selected.length - 1];
    if (candidate.center - candidate.width / 2 >= previous.center + previous.width / 2 + 6) {
      selected.push(candidate);
    }
  }

  const last = candidates[candidates.length - 1];
  while (
    selected.length > 1 &&
    last.center - last.width / 2 <
      selected[selected.length - 1].center + selected[selected.length - 1].width / 2 + 6
  ) {
    selected.pop();
  }
  if (
    last.center - last.width / 2 >=
    selected[selected.length - 1].center + selected[selected.length - 1].width / 2 + 6
  ) {
    selected.push(last);
  }

  return selected.map(({ index }) => index);
}

function normalizeDate(input: AttestationInput): string {
  const raw = input.date ?? input.createdAt ?? '';
  if (!raw) return 'Unknown';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match.slice(1).join('-');
    return 'Unknown';
  }
  return date.toISOString().slice(0, 10);
}

function statusKey(status?: string): AttestationStatus {
  const normalized = status?.toLowerCase() ?? '';
  if (normalized.includes('verif') || normalized.includes('success') || normalized.includes('valid')) return 'verified';
  if (normalized.includes('pend') || normalized.includes('review') || normalized.includes('process') || normalized.includes('wait')) return 'pending';
  return 'failed';
}

function isIsoDateString(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getWeekStartIso(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const dayOfWeek = date.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return date.toISOString().slice(0, 10);
}

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function resolveBucketGranularity(
  options?: AggregateAttestationTrendOptions,
): TrendBucketGranularity {
  if (!options?.bucket || options.bucket === 'day') return 'day';
  if (options.bucket === 'week') return 'week';
  if (isIsoDateString(options.from) && isIsoDateString(options.to)) {
    const startMs = new Date(`${options.from}T00:00:00Z`).getTime();
    const endMs = new Date(`${options.to}T00:00:00Z`).getTime();
    const spanDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
    if (spanDays > 31) return 'week';
  }
  return 'day';
}

export function aggregateAttestationTrend(
  records: AttestationInput[],
  options?: AggregateAttestationTrendOptions,
): AttestationTrendDatum[] {
  const from = isIsoDateString(options?.from) ? options.from : undefined;
  const to = isIsoDateString(options?.to) ? options.to : undefined;
  const granularity = resolveBucketGranularity(options);

  const grouped = new Map<string, { verified: number; pending: number; failed: number }>();

  for (const record of records) {
    const rawDate = normalizeDate(record);
    if (from || to) {
      if (rawDate === 'Unknown') continue;
      if (from && rawDate < from) continue;
      if (to && rawDate > to) continue;
    }

    const bucketKey =
      granularity === 'week' && rawDate !== 'Unknown' ? getWeekStartIso(rawDate) : rawDate;
    const status = statusKey(record.status);
    const current = grouped.get(bucketKey) ?? { verified: 0, pending: 0, failed: 0 };
    current[status] += 1;
    grouped.set(bucketKey, current);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      ...(granularity === 'week' && date !== 'Unknown' ? { endDate: addDaysIso(date, 6) } : {}),
      ...counts,
      total: counts.verified + counts.pending + counts.failed,
    }));
}
