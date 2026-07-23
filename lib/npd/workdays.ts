/**
 * Workday-aware date maths for NPD.
 *
 * The Google Sheet computes `Days Left = TODAY() - Planned` — a raw calendar
 * subtraction. That is wrong in a factory: it counts Sundays and Diwali as
 * working days, so a task showing "3 days left" on a Friday before a long
 * weekend actually has ONE working day left. Every plan built on that number is
 * quietly optimistic.
 *
 * This module is the app's answer. It is pure and isomorphic (server + client):
 * the server loads the active `holidays` rows once, hands the ISO dates to the
 * client as a plain string[], and both sides compute identical numbers from the
 * same `WorkdayCalendar`.
 *
 * Weekend rule: Sunday is the only standing non-working day (Indian
 * manufacturing works a 6-day week). Saturdays that are actually off are
 * expected to be entered as holidays, which keeps the rule data-driven instead
 * of hardcoded.
 */

const MS_PER_DAY = 86_400_000;

export interface WorkdayCalendar {
  /** ISO `yyyy-mm-dd` dates that are non-working (public holidays, shutdowns). */
  holidays: ReadonlySet<string>;
  /** Weekday numbers (0=Sun … 6=Sat) that are non-working every week. */
  weekend: ReadonlySet<number>;
}

/** Default: Sundays off, no holidays. Used when the calendar isn't supplied. */
export const DEFAULT_CALENDAR: WorkdayCalendar = {
  holidays: new Set<string>(),
  weekend: new Set([0]),
};

export function makeCalendar(
  holidayISOs: readonly string[],
  weekendDays: readonly number[] = [0],
): WorkdayCalendar {
  return { holidays: new Set(holidayISOs), weekend: new Set(weekendDays) };
}

function toUTC(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}
function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isWorkday(iso: string, cal: WorkdayCalendar = DEFAULT_CALENDAR): boolean {
  if (cal.holidays.has(iso)) return false;
  return !cal.weekend.has(toUTC(iso).getUTCDay());
}

/**
 * Signed count of WORKING days from `fromISO` to `toISO`.
 *
 * The start day is excluded and the end day is included, which is what makes
 * "days left" read naturally: if today is Monday and the task is planned for
 * Tuesday, you have 1 working day left, not 0 and not 2.
 *
 * Negative when `toISO` is in the past — that magnitude is the overdue count,
 * and it too skips weekends/holidays, so a task that went overdue on Friday
 * shows "1 working day overdue" on Monday rather than "3 days overdue".
 */
export function workdaysBetween(
  fromISO: string,
  toISO: string,
  cal: WorkdayCalendar = DEFAULT_CALENDAR,
): number {
  if (fromISO === toISO) return 0;
  const forward = fromISO < toISO;
  const start = toUTC(forward ? fromISO : toISO);
  const end = toUTC(forward ? toISO : fromISO);

  // Guard against a malformed date silently becoming an infinite loop.
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const span = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  if (span > 3650) return forward ? span : -span; // >10y apart: not a real plan, don't walk it

  let count = 0;
  const cur = new Date(start);
  for (let i = 0; i < span; i++) {
    cur.setUTCDate(cur.getUTCDate() + 1); // step first => start excluded, end included
    if (isWorkday(fromUTC(cur), cal)) count++;
  }
  return forward ? count : -count;
}

/**
 * Add `n` WORKING days to a date, landing on a working day.
 *
 * This is what generates an NPD schedule that a shop floor can actually hit.
 * The activity template's `offsetDays` become working-day offsets, so a
 * 36-activity plan starting the week of a festival no longer front-loads three
 * activities onto days nobody is in the building.
 *
 * `n === 0` still rolls forward off a non-working day — a plan must never be
 * dated on a Sunday.
 */
export function addWorkdays(
  iso: string,
  n: number,
  cal: WorkdayCalendar = DEFAULT_CALENDAR,
): string {
  const d = toUTC(iso);
  if (Number.isNaN(d.getTime())) return iso;

  if (n === 0) {
    let guard = 0;
    while (!isWorkday(fromUTC(d), cal) && guard++ < 400) d.setUTCDate(d.getUTCDate() + 1);
    return fromUTC(d);
  }

  const step = n > 0 ? 1 : -1;
  let remaining = Math.abs(n);
  let guard = 0;
  while (remaining > 0 && guard++ < 4000) {
    d.setUTCDate(d.getUTCDate() + step);
    if (isWorkday(fromUTC(d), cal)) remaining--;
  }
  return fromUTC(d);
}

/** Working days lost to weekends/holidays between two dates — the number to
 *  show when explaining why "10 days" of plan is really 12 days of calendar. */
export function nonWorkingDaysBetween(
  fromISO: string,
  toISO: string,
  cal: WorkdayCalendar = DEFAULT_CALENDAR,
): number {
  const calendarDays = Math.abs(
    Math.round((toUTC(toISO).getTime() - toUTC(fromISO).getTime()) / MS_PER_DAY),
  );
  return calendarDays - Math.abs(workdaysBetween(fromISO, toISO, cal));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
