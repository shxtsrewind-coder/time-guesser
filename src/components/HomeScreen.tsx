import React, { useState, useEffect } from 'react';
import { Calendar, Play, Trophy, HelpCircle, AlertCircle, History, Compass, Eye, Flame, Check, RotateCcw } from 'lucide-react';
import { GameMode } from '../types.ts';
import { getStreakData, isDailyCompletedToday, getTimeUntilNextDaily, StreakData } from '../lib/streak.ts';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
  onOpenLeaderboard: () => void;
  onOpenRemoveAds?: () => void;
  isLoading: boolean;
  loadingMode: GameMode | null;
  errorMessage: string | null;
  onClearError: () => void;
  dailyPlayedNotice?: boolean;
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

  const showDailyFinished = isCompletedToday || dailyPlayedNotice;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-between min-h-[calc(100vh-64px)] space-y-8">
      <div className="space-y-8">
        {/* Editorial Hero Header */}
        <div className="text-center space-y-3 pt-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-stone-100 via-stone-200 to-amber-200 tracking-tight">
            TimeGuess
          </h1>

          {/* Daily Streak Indicator */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/90 border border-stone-800 text-xs shadow-sm">
              <Flame
                className={`w-4 h-4 ${
                  streakData.currentStreak > 0
                    ? 'text-amber-400 fill-amber-400 animate-pulse'
                    : 'text-stone-500'
                }`}
              />
              <span className="font-mono font-bold text-amber-300">
                {streakData.currentStreak} Day{streakData.currentStreak === 1 ? '' : 's'} Streak
              </span>
              <span className="text-stone-600">·</span>
              <span className="text-stone-400">
                {isCompletedToday
                  ? 'Completed Today!'
                  : 'Play today\'s puzzle to keep streak!'}
              </span>
            </div>
          </div>
        </div>

        {/* Daily already completed notice */}
        {dailyPlayedNotice && (
          <div className="max-w-xl mx-auto bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm text-amber-300">Daily Challenge Completed for Today</p>
                <p className="text-stone-300 text-xs">
                  Your score is logged on the global leaderboard. Ready to keep playing? Enjoy unlimited Classic expeditions!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onStartGame('classic')}
              disabled={isLoading}
              className="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Classic Mode</span>
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
          {/* Main Play Actions Column (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Daily Challenge Card: Normal or Completed/Play Again State */}
            {showDailyFinished ? (
              <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600/30 via-amber-600/20 to-stone-800 p-[1px] shadow-xl">
                <div className="relative px-5 py-4 sm:py-5 rounded-2xl bg-[#141210] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Check className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                        <span>Daily Challenge</span>
                        <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                          · Completed Today
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

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onStartGame('classic')}
                    className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading && loadingMode === 'classic' ? (
                      <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Play Again (Classic)</span>
                      </>
                    )}
                  </button>
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

            {/* Classic Mode Card */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStartGame('classic')}
              className="w-full rounded-2xl bg-[#141210] hover:bg-[#181512] border border-stone-800 p-4 sm:p-5 active:scale-[0.99] transition-all flex items-center justify-between shadow-md disabled:opacity-60 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-stone-900 border border-stone-700/80 flex items-center justify-center text-stone-300 group-hover:text-amber-400 transition-colors shrink-0">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-stone-100">Classic Expedition</div>
                  <p className="text-xs sm:text-sm text-stone-400">
                    Endless randomized historical rounds from global archives
                  </p>
                </div>
              </div>

              {isLoading && loadingMode === 'classic' ? (
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-stone-900 group-hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-stone-400 group-hover:text-stone-200 shrink-0 transition-colors">
                  <Play className="w-5 h-5 text-stone-400 group-hover:text-amber-400" />
                </div>
              )}
            </button>

            {/* How to Play Guide */}
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
                  <span className="text-amber-400 font-semibold block mb-0.5">Zoom & Clues</span>
                  <span>Inspect vehicle models, clothing styles, building materials, and street signs.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols on lg): Leaderboard & Monetization */}
          <div className="lg:col-span-5 space-y-4">
            {/* Leaderboard CTA Card */}
            <div className="bg-[#141210]/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Chrono Leaderboard</span>
                </div>
                <span className="text-[11px] text-stone-500 font-mono">Live Standings</span>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed">
                Check daily champions and all-time high scorers. Compete against historical explorers worldwide.
              </p>

              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>View Global Standings</span>
              </button>
            </div>
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
