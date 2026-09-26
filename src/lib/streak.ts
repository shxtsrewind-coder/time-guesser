/**
 * Historical Chronology Daily Streak & Countdown Manager
 */

export interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastCompletedDate: string | null; // Format: 'YYYY-MM-DD'
  completedDates: string[];
  totalCompleted: number;
  lastScore: number | null;
  lastMaxScore: number | null;
}

const STREAK_STORAGE_KEY = 'timeguess_daily_streak';

/**
 * Formats a Date object into local 'YYYY-MM-DD'
 */
export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayKey(): string {
  return formatDateKey(new Date());
}

export function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

/**
 * Returns difference in days between two YYYY-MM-DD strings (dateB - dateA)
 */
export function getDayDifference(dateAStr: string, dateBStr: string): number {
  try {
    const [yA, mA, dA] = dateAStr.split('-').map(Number);
    const [yB, mB, dB] = dateBStr.split('-').map(Number);
    const dateA = new Date(yA, mA - 1, dA);
    const dateB = new Date(yB, mB - 1, dB);
    const msDiff = dateB.getTime() - dateA.getTime();
    return Math.round(msDiff / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/**
 * Read the current streak state from storage
 */
export function getStreakData(): StreakData {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      currentStreak: 0,
      maxStreak: 0,
      lastCompletedDate: null,
      completedDates: [],
      totalCompleted: 0,
      lastScore: null,
      lastMaxScore: null,
    };
  }

  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) {
      return {
        currentStreak: 0,
        maxStreak: 0,
        lastCompletedDate: null,
        completedDates: [],
        totalCompleted: 0,
        lastScore: null,
        lastMaxScore: null,
      };
    }

    const data: StreakData = JSON.parse(raw);
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    // Check if streak has lapsed
    if (data.lastCompletedDate) {
      if (data.lastCompletedDate === today) {
        // Completed today, current streak is active
        return data;
      } else if (data.lastCompletedDate === yesterday) {
        // Completed yesterday, current streak is still alive waiting for today's puzzle
        return data;
      } else {
        // Missed at least one full day: current streak resets to 0, maxStreak preserved
        if (data.currentStreak > 0) {
          const lapsed: StreakData = {
            ...data,
            currentStreak: 0,
          };
          localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(lapsed));
          return lapsed;
        }
      }
    }

    return data;
  } catch (err) {
    console.warn('Failed to parse streak data from localStorage', err);
    return {
      currentStreak: 0,
      maxStreak: 0,
      lastCompletedDate: null,
      completedDates: [],
      totalCompleted: 0,
      lastScore: null,
      lastMaxScore: null,
    };
  }
}

export interface RecordCompletionResult {
  currentStreak: number;
  maxStreak: number;
  isFirstToday: boolean;
  isExtended: boolean;
  totalCompleted: number;
}

/**
 * Records that the user has completed today's daily puzzle.
 * Updates currentStreak, maxStreak, completedDates, and dispatches an event.
 */
export function recordDailyCompletion(
  score: number,
  maxScore: number = 25000
): RecordCompletionResult {
  const current = getStreakData();
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  let newStreak = current.currentStreak;
  let isFirstToday = false;
  let isExtended = false;

  const datesSet = new Set(current.completedDates || []);

  if (current.lastCompletedDate === today) {
    // Already recorded today! Preserve streak, update score
    isFirstToday = false;
    isExtended = false;
  } else if (current.lastCompletedDate === yesterday) {
    // Consecutive day streak extension!
    newStreak = (current.currentStreak || 0) + 1;
    isFirstToday = true;
    isExtended = true;
  } else {
    // Fresh streak or recovering from break
    newStreak = 1;
    isFirstToday = true;
    isExtended = false;
  }

  datesSet.add(today);
  const updatedCompletedDates = Array.from(datesSet).sort();
  const newMax = Math.max(current.maxStreak || 0, newStreak);
  const newTotalCompleted = isFirstToday
    ? (current.totalCompleted || 0) + 1
    : current.totalCompleted || 1;

  const updated: StreakData = {
    currentStreak: newStreak,
    maxStreak: newMax,
    lastCompletedDate: today,
    completedDates: updatedCompletedDates,
    totalCompleted: newTotalCompleted,
    lastScore: score,
    lastMaxScore: maxScore,
  };

  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updated));
    // Also save today's completed flag for fast checks
    localStorage.setItem(`timeguess_daily_completed_${today}`, 'true');
  } catch (err) {
    console.warn('Failed to save streak to localStorage', err);
  }

  // Dispatch global window event so UI can react in real time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('timeguess_streak_updated', {
        detail: updated,
      })
    );
  }

  return {
    currentStreak: newStreak,
    maxStreak: newMax,
    isFirstToday,
    isExtended,
    totalCompleted: newTotalCompleted,
  };
}

/**
 * Checks if the user has completed today's daily challenge
 */
export function isDailyCompletedToday(): boolean {
  const today = getTodayKey();
  if (typeof window !== 'undefined' && window.localStorage) {
    const flag = localStorage.getItem(`timeguess_daily_completed_${today}`);
    if (flag === 'true') return true;
  }
  const data = getStreakData();
  return data.lastCompletedDate === today;
}

/**
 * Calculate countdown until next daily puzzle unlocks (midnight local time)
 */
export function getTimeUntilNextDaily(): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  totalSeconds: number;
} {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0
  );
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}`;

  return {
    hours,
    minutes,
    seconds,
    formatted,
    totalSeconds,
  };
}
