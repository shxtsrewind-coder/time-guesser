import React, { useState, useEffect } from 'react';
import { Calendar, Play, Trophy, HelpCircle, AlertCircle, Flame, Lock, Crown } from 'lucide-react';
import { GameMode } from '../types.ts';
import { getStreakData, isDailyCompletedToday, getTimeUntilNextDaily, StreakData } from '../lib/streak.ts';
import { supabase } from '../lib/supabase.ts';
import { codeToFlagEmoji } from '../lib/countryFlags.ts';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
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
  const [topRanks, setTopRanks] = useState<TopRankedItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl sm:text-6xl font-black font-cinzel tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 uppercase select-none">
          TIMEGUESS
        </h1>

        <p className="text-xs sm:text-sm text-stone-400 max-w-xl mx-auto leading-relaxed">
          Study archival photographs, deduce the year, pin the coordinates, and guess the day of the week to earn up to 11,000 points per round.
        </p>
      </div>

      {/* Daily streak hero badge */}
      <div className="max-w-xl mx-auto bg-[#141210]/95 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-5 h-5 fill-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold text-stone-400 uppercase tracking-wider">
              Daily Streak
            </div>
            <div className="text-sm font-bold text-stone-100 font-cinzel">
              {streakData.currentStreak > 0 ? (
                <span className="text-amber-300">
                  {streakData.currentStreak} Day{streakData.currentStreak === 1 ? '' : 's'} Solved in a Row
                </span>
              ) : (
                <span className="text-stone-300">Start your daily challenge streak today</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-mono text-stone-500">Next Daily</div>
          <div className="text-xs font-mono font-bold text-amber-400">{countdown}</div>
        </div>
      </div>

      {/* Daily already completed notice */}
      {dailyPlayedNotice && (
        <div className="max-w-xl mx-auto bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-amber-300">Daily Challenge Locked for Today</p>
              <p className="text-stone-300 text-xs">
                Your score is logged on the global leaderboard. The next challenge unlocks at midnight!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>View Standings</span>
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && !dailyPlayedNotice && (
        <div className="max-w-xl mx-auto bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-xs text-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onClearError}
            className="text-stone-400 hover:text-stone-200 text-xs underline shrink-0 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Play Action Column (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Daily Challenge Card: Normal or Locked/Completed State */}
          {showDailyFinished ? (
            <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-850 via-amber-950/20 to-stone-900 border border-stone-800 shadow-xl">
              <div className="relative px-5 py-4 sm:py-5 rounded-2xl bg-[#141210]/95 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-900/90 border border-stone-750 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-inner">
                    <Lock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                      <span>Daily Challenge</span>
                      <span className="text-[11px] font-mono text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/70 inline-flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Locked · Solved Today</span>
                      </span>
                    </div>
                    <div className="text-xs text-stone-300 flex items-center gap-2 font-mono">
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
                    <p className="text-[11px] text-stone-400 font-mono">
                      Next Daily Puzzle unlocks in <strong className="text-amber-300">{countdown}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled
                    className="py-2.5 px-3.5 rounded-xl bg-stone-900/90 border border-stone-800 text-stone-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                    title="Daily challenge already completed for today"
                  >
                    <Lock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Locked</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenLeaderboard}
                    className="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 text-stone-950" />
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
              className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 p-[1px] shadow-xl shadow-amber-950/30 active:scale-[0.99] transition-transform disabled:opacity-60 text-left cursor-pointer"
            >
              <div className="relative px-5 py-4 sm:py-5 rounded-2xl bg-[#141210] group-hover:bg-[#181512] transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                      <span>Daily Challenge</span>
                      <span className="text-[11px] font-mono text-amber-400 font-semibold">
                        · Ranked Global
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-400">
                      Synchronized 5-photo puzzle · One attempt per day
                    </p>
                  </div>
                </div>

                {isLoading && loadingMode === 'daily' ? (
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 group-hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 transition-colors">
                    <Play className="w-5 h-5 fill-amber-400" />
                  </div>
                )}
              </div>
            </button>
          )}

          {/* How Scoring Works Guide */}
          <div className="bg-[#141210]/90 border border-stone-800/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-stone-300 text-xs font-semibold uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>How Scoring Works</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-400 leading-relaxed">
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800/60">
                <span className="text-amber-400 font-semibold block mb-0.5">Year Estimation (5,000 pts)</span>
                <span>Pinpoint the exact year. Points scale down gradually per year of difference.</span>
              </div>
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800/60">
                <span className="text-amber-400 font-semibold block mb-0.5">Map Coordinates (5,000 pts)</span>
                <span>Drop a marker on the world map when asked. Closer distance yields more points.</span>
              </div>
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800/60">
                <span className="text-amber-400 font-semibold block mb-0.5">Day of Week (1,000 pts)</span>
                <span>Deduce Sunday through Saturday for a precision calendar bonus.</span>
              </div>
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800/60">
                <span className="text-amber-400 font-semibold block mb-0.5">Zoom &amp; Clues</span>
                <span>Inspect vehicle models, clothing styles, building materials, and street signs.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols on lg): Leadership Board Standings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#141210]/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider font-mono">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Leadership Board</span>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">Top 5</span>
            </div>

            {/* Top 5 Ranking List */}
            {loadingLeaderboard ? (
              <div className="space-y-2 py-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-xl bg-stone-900/60 animate-pulse flex items-center justify-between px-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded bg-stone-800" />
                      <div className="w-24 h-3 rounded bg-stone-800" />
                    </div>
                    <div className="w-14 h-3 rounded bg-stone-800" />
                  </div>
                ))}
              </div>
            ) : topRanks.length === 0 ? (
              <div className="py-6 text-center text-stone-500 space-y-1">
                <Trophy className="w-8 h-8 text-stone-700 mx-auto stroke-1" />
                <p className="text-xs text-stone-400">No scores recorded yet today</p>
                <p className="text-[11px] text-stone-600">Be the first to claim rank #1!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {topRanks.map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950/70 border border-stone-850 hover:border-stone-750 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderRankBadge(item.rank)}
                      {item.countryCode && codeToFlagEmoji(item.countryCode) && (
                        <span className="text-base select-none shrink-0" aria-label={item.countryCode}>
                          {codeToFlagEmoji(item.countryCode)}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-stone-200 truncate max-w-[130px] sm:max-w-[170px]">
                        {item.displayName}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {item.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-stone-500 font-sans ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Button underneath saying View Global Standings */}
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-700/80 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>View Global Standings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editorial Footer */}
      <footer className="pt-6 pb-2 text-center text-stone-600 text-xs border-t border-stone-900">
        <p>Archival photographs sourced from verified public domain collections and Wikimedia Commons</p>
      </footer>
    </div>
  );
};
