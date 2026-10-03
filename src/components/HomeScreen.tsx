import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Play,
  Trophy,
  HelpCircle,
  AlertCircle,
  Flame,
  Lock,
  Crown,
  ArrowUpDown,
  CheckCircle,
  X,
} from 'lucide-react';
import { GameMode } from '../types.ts';
import { getStreakData, isDailyCompletedToday, getTimeUntilNextDaily, StreakData } from '../lib/streak.ts';
import { supabase } from '../lib/supabase.ts';
import { codeToFlagEmoji } from '../lib/countryFlags.ts';
import { ScoringInfoModal } from './ScoringInfoModal.tsx';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
  onOpenDecadeSort: () => void;
  onOpenLeaderboard: () => void;
  onOpenRemoveAds?: () => void;
  isAnonymous?: boolean;
  onOpenSaveProgress?: () => void;
  onOpenLogin?: () => void;
  isLoading: boolean;
  loadingMode: GameMode | null;
  errorMessage: string | null;
  onClearError: () => void;
  dailyPlayedNotice?: boolean;
}

interface TopRankedItem {
  rank: number;
  displayName: string;
  score: number;
  countryCode?: string | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onOpenDecadeSort,
  onOpenLeaderboard,
  isLoading,
  loadingMode,
  errorMessage,
  onClearError,
  dailyPlayedNotice,
}) => {
  const [streakData, setStreakData] = useState<StreakData>(getStreakData);
  const [isCompletedToday, setIsCompletedToday] = useState(isDailyCompletedToday);
  const [countdown, setCountdown] = useState(() => getTimeUntilNextDaily().formatted);
  const [decadeStreak, setDecadeStreak] = useState<number>(0);
  const [topRanks, setTopRanks] = useState<TopRankedItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [isScoringModalOpen, setIsScoringModalOpen] = useState(false);
  const [hasDismissedTip, setHasDismissedTip] = useState(() => {
    try {
      return localStorage.getItem('timeguess_tip_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissTip = () => {
    setHasDismissedTip(true);
    try {
      localStorage.setItem('timeguess_tip_dismissed', 'true');
    } catch {}
  };

  // Fetch decade sort streak for logged in users
  useEffect(() => {
    let isMounted = true;
    const fetchDecadeStreak = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (user && !user.is_anonymous) {
          const { data } = await supabase
            .from('profiles')
            .select('decade_sort_streak')
            .eq('id', user.id)
            .maybeSingle();
          if (isMounted && data?.decade_sort_streak) {
            setDecadeStreak(data.decade_sort_streak);
          }
        }
      } catch (err) {
        console.warn('Could not load decade streak:', err);
      }
    };

    fetchDecadeStreak();

    const handleDecadeStreakUpdate = (e: any) => {
      if (typeof e.detail?.streak === 'number') {
        setDecadeStreak(e.detail.streak);
      } else {
        fetchDecadeStreak();
      }
    };

    window.addEventListener('timeguess_decade_streak_updated', handleDecadeStreakUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('timeguess_decade_streak_updated', handleDecadeStreakUpdate);
    };
  }, []);

  useEffect(() => {
    const handleStreakChange = () => {
      setStreakData(getStreakData());
      setIsCompletedToday(isDailyCompletedToday());
    };

    window.addEventListener('timeguess_streak_updated', handleStreakChange);

    const timer = setInterval(() => {
      setCountdown(getTimeUntilNextDaily().formatted);
      setIsCompletedToday(isDailyCompletedToday());
    }, 1000);

    return () => {
      window.removeEventListener('timeguess_streak_updated', handleStreakChange);
      clearInterval(timer);
    };
  }, []);

  // Fetch top 5 ranking
  useEffect(() => {
    let isMounted = true;

    const loadTop5 = async () => {
      try {
        setLoadingLeaderboard(true);
        // Prefer today's challenge leaderboard
        const { data: dailyData, error: dailyError } = await supabase.rpc('leaderboard_daily');

        let rows: TopRankedItem[] = [];
        if (!dailyError && Array.isArray(dailyData) && dailyData.length > 0) {
          rows = dailyData.slice(0, 5).map((r, i) => ({
            rank: r.rank || i + 1,
            displayName: r.display_name || 'Anonymous Chrononaut',
            score: r.total_score,
            countryCode: r.country_code || null,
          }));
        } else {
          // Fallback to all-time top 5 if daily hasn't started yet
          const { data: allTimeData } = await supabase.rpc('leaderboard_alltime');
          if (Array.isArray(allTimeData) && allTimeData.length > 0) {
            rows = allTimeData.slice(0, 5).map((r, i) => ({
              rank: r.rank || i + 1,
              displayName: r.display_name || 'Anonymous Chrononaut',
              score: r.best_score,
              countryCode: r.country_code || null,
            }));
          }
        }

        if (isMounted) {
          setTopRanks(rows);
        }
      } catch (err) {
        console.warn('Could not load top 5 leaderboard preview:', err);
      } finally {
        if (isMounted) {
          setLoadingLeaderboard(false);
        }
      }
    };

    loadTop5();

    return () => {
      isMounted = false;
    };
  }, []);

  const showDailyFinished = isCompletedToday || Boolean(dailyPlayedNotice);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-[11px] flex items-center justify-center font-mono shrink-0 shadow-sm">
          <Crown className="w-3 h-3 fill-amber-400 text-amber-400" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-5 h-5 rounded-md bg-stone-300/20 border border-stone-400/40 text-stone-200 font-bold text-[11px] flex items-center justify-center font-mono shrink-0">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-5 h-5 rounded-md bg-amber-800/30 border border-amber-700/50 text-amber-400 font-bold text-[11px] flex items-center justify-center font-mono shrink-0">
          3
        </span>
      );
    }
    return (
      <span className="w-5 text-center text-xs font-mono font-medium text-stone-500 shrink-0">
        #{rank}
      </span>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Hero Header with Dual-Accent Presence */}
      <div className="text-center space-y-2 sm:space-y-3 pt-1 sm:pt-2">
        <h1 className="text-3xl xs:text-5xl sm:text-6xl font-black font-cinzel tracking-wider uppercase select-none flex items-center justify-center flex-wrap gap-x-2.5 sm:gap-x-3 gap-y-1">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 drop-shadow-md">
            WHEN
          </span>
          <span className="text-slate-500 font-serif-display italic font-normal text-2xl xs:text-4xl sm:text-5xl mx-0.5">
            &amp;
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-400 drop-shadow-md">
            WHERE
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed px-2">
          Study authentic archival photographs, deduce the historical year, pin world coordinates, and uncover the calendar day.
        </p>
      </div>

      {/* Daily streak hero badge */}
      <div className="max-w-xl mx-auto bg-[#0b1120]/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Daily Streak
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-100 font-cinzel truncate">
              {streakData.currentStreak > 0 ? (
                <span className="text-amber-300">
                  {streakData.currentStreak} Day{streakData.currentStreak === 1 ? '' : 's'} Solved in a Row
                </span>
              ) : (
                <span className="text-slate-300">Start your daily challenge streak today</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-left xs:text-right shrink-0 border-t xs:border-t-0 pt-2 xs:pt-0 border-slate-800/80 flex xs:flex-col justify-between items-center xs:items-end">
          <div className="text-[10px] uppercase font-mono text-slate-400">Next Daily</div>
          <div className="text-xs font-mono font-bold text-amber-400">{countdown}</div>
        </div>
      </div>

      {/* Daily already completed notice */}
      {dailyPlayedNotice && (
        <div className="max-w-xl mx-auto bg-amber-950/30 border border-amber-700/50 rounded-2xl p-3.5 sm:p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-amber-300">Daily Challenge Locked for Today</p>
              <p className="text-slate-300 text-xs">
                Your score is logged on the global leaderboard. The next challenge unlocks at midnight UTC!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>View Standings</span>
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && !dailyPlayedNotice && (
        <div className="max-w-xl mx-auto bg-rose-950/40 border border-rose-800/60 rounded-2xl p-3.5 sm:p-4 text-xs text-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onClearError}
            className="text-slate-400 hover:text-slate-200 text-xs underline shrink-0 font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Main Play Action Column (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          {/* Daily Challenge Card: Normal or Locked/Completed State */}
          {showDailyFinished ? (
            <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-amber-950/30 to-slate-800 border border-slate-700/80 shadow-xl">
              <div className="relative px-4 py-3.5 sm:px-5 sm:py-5 rounded-2xl bg-[#0b1120]/95 flex flex-col xs:flex-row xs:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-slate-750 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-inner">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                      <span>Daily Challenge</span>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                        · Solved
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 flex items-center gap-2 font-mono flex-wrap">
                      {streakData.lastScore !== null && (
                        <span>
                          Score: <strong className="text-amber-400">{streakData.lastScore.toLocaleString()}</strong> pts
                        </span>
                      )}
                      <span>·</span>
                      <span className="text-amber-400 flex items-center gap-1 font-semibold">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        {streakData.currentStreak}d Streak
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Next Daily in <strong className="text-amber-300">{countdown}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 xs:pt-0">
                  <button
                    type="button"
                    onClick={onOpenLeaderboard}
                    className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 text-slate-950" />
                    <span>Leaderboard</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStartGame('daily')}
              className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 p-[1px] shadow-xl shadow-amber-950/20 active:scale-[0.99] transition-transform disabled:opacity-60 text-left cursor-pointer"
            >
              <div className="relative px-4 py-3.5 sm:px-5 sm:py-5 rounded-2xl bg-[#0b1120] group-hover:bg-[#0f172a] transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                      <span className="truncate">Daily Challenge</span>
                      <span className="text-[10px] sm:text-[11px] font-mono text-amber-400 font-semibold shrink-0">
                        · Ranked
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 truncate">
                      5 historical photos · 1 attempt daily
                    </p>
                  </div>
                </div>

                {isLoading && loadingMode === 'daily' ? (
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 transition-colors">
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400" />
                  </div>
                )}
              </div>
            </button>
          )}

          {/* Decade Sort Game Mode Card */}
          <button
            type="button"
            onClick={onOpenDecadeSort}
            className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 p-[1px] shadow-xl shadow-cyan-950/20 active:scale-[0.99] transition-transform text-left cursor-pointer"
          >
            <div className="relative px-4 py-3.5 sm:px-5 sm:py-5 rounded-2xl bg-[#0b1120] group-hover:bg-[#0f172a] transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <ArrowUpDown className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span>Decade Sort</span>
                    {decadeStreak > 0 && (
                      <span className="text-[11px] font-mono font-bold text-cyan-300 inline-flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                        <span>{decadeStreak} Streak</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 truncate">
                    Sort 5 photos in chronological sequence · Unlimited
                  </p>
                </div>
              </div>

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 transition-colors">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-cyan-400" />
              </div>
            </div>
          </button>

          {/* Dismissible First-Visit Tip (shown once, dismissible) */}
          {!hasDismissedTip && (
            <div className="bg-[#0b1120]/95 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-300 shadow-md gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-400 font-bold font-mono text-[11px] shrink-0">Tip:</span>
                <span className="truncate">Deduce year, world coordinates, and weekday to score up to 11,000 pts.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsScoringModalOpen(true)}
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer"
                >
                  Rules
                </button>
                <button
                  type="button"
                  onClick={handleDismissTip}
                  aria-label="Dismiss tip"
                  className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quiet How to Play action link */}
          <div className="pt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsScoringModalOpen(true)}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How Scoring &amp; Rules Work</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 cols on lg): Leadership Board Standings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0b1120]/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider font-mono">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Leaderboard Standings</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Top 5 Today</span>
            </div>

            {/* Top 5 Ranking List */}
            {loadingLeaderboard ? (
              <div className="space-y-2 py-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-xl bg-slate-900/60 animate-pulse flex items-center justify-between px-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded bg-slate-800" />
                      <div className="w-24 h-3 rounded bg-slate-800" />
                    </div>
                    <div className="w-14 h-3 rounded bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : topRanks.length === 0 ? (
              <div className="py-6 text-center text-slate-500 space-y-1">
                <Trophy className="w-8 h-8 text-slate-700 mx-auto stroke-1" />
                <p className="text-xs text-slate-400">No scores recorded yet today</p>
                <p className="text-[11px] text-slate-500">Be the first to claim rank #1!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {topRanks.map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderRankBadge(item.rank)}
                      {item.countryCode && codeToFlagEmoji(item.countryCode) && (
                        <span className="text-base select-none shrink-0" aria-label={item.countryCode}>
                          {codeToFlagEmoji(item.countryCode)}
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {item.displayName}
                      </span>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <span className="text-xs font-bold text-amber-400">
                        {item.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
            >
              <span>View Full Standings</span>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Editorial Footer */}
      <footer className="pt-6 pb-2 text-center text-slate-500 text-xs border-t border-slate-800/80">
        <p>Archival photographs sourced from verified world archives and public domain collections</p>
      </footer>

      {/* Scoring Guide Modal */}
      <ScoringInfoModal
        isOpen={isScoringModalOpen}
        onClose={() => setIsScoringModalOpen(false)}
      />
    </div>
  );
};
