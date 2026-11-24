/** Seconds-remaining values (below one minute) at which the countdown is announced. */
export const ANNOUNCE_SECONDS = [30, 10] as const;

/**
 * The countdown is announced politely at milestones only (on open, each full
 * minute, and at 30s / 10s) so screen readers are not flooded every second.
 */
export const isAnnounceMilestone = (seconds: number): boolean =>
  seconds > 0 &&
  (seconds % 60 === 0 || (ANNOUNCE_SECONDS as readonly number[]).includes(seconds));

/** Spoken form of a duration, e.g. `2 minutes 5 seconds`. */
export const formatSpoken = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (mins > 0) parts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`);
  if (secs > 0) parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ') || '0 seconds';
};
