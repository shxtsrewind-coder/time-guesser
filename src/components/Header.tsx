import React, { useState, useEffect } from 'react';
import { Trophy, User, Flame, Sparkles } from 'lucide-react';
import { GameMode } from '../types.ts';
import { getUserCountry } from '../lib/countryFlags.ts';
import { getStreakData, isDailyCompletedToday, StreakData } from '../lib/streak.ts';

interface HeaderProps {
  currentScreen: string;
  gameMode?: GameMode;
  currentRound?: number;
  totalScore?: number;
  displayName: string;
  isAnonymous?: boolean;
  onOpenProfile: () => void;
  onGoHome: () => void;
  onOpenLeaderboard: () => void;
  onOpenRemoveAds?: () => void;
  onOpenSaveProgress?: () => void;
  isPlaying?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  currentRound,
  totalScore,
  displayName,
  isAnonymous,
  onOpenProfile,
  onGoHome,
  onOpenLeaderboard,
  onOpenSaveProgress,
  isPlaying,
}) => {
  const [userCountry, setUserCountryState] = useState(getUserCountry);
  const [streakData, setStreakData] = useState<StreakData>(getStreakData);
  const [isCompletedToday, setIsCompletedToday] = useState(isDailyCompletedToday);

  useEffect(() => {
    const handleCountryChange = () => {
      setUserCountryState(getUserCountry());
    };
    const handleStreakChange = () => {
      setStreakData(getStreakData());
      setIsCompletedToday(isDailyCompletedToday());
    };

    window.addEventListener('timeguess_country_changed', handleCountryChange);
    window.addEventListener('timeguess_streak_updated', handleStreakChange);
    return () => {
      window.removeEventListener('timeguess_country_changed', handleCountryChange);
      window.removeEventListener('timeguess_streak_updated', handleStreakChange);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0e1a]/90 backdrop-blur-xl border-b border-slate-800/80 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Zone 1: Single text element Brand Title with When (Gold) & Where (Cyan) */}
        <button
          type="button"
          onClick={onGoHome}
          className="group flex items-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg transition-transform active:scale-95"
          aria-label="When & Where Home"
        >
          <span className="text-lg xs:text-xl sm:text-2xl font-black font-cinzel tracking-wider group-hover:brightness-110 transition-all select-none flex items-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
              When
            </span>
            <span className="text-slate-400 font-cinzel text-lg xs:text-xl sm:text-2xl mx-1 font-black">
              &amp;
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-400">
              Where
            </span>
          </span>
        </button>

        {/* Zone 2: Live In-Game Status (Unboxed clean typography with tabular nums) */}
        {isPlaying && currentRound !== undefined ? (
          <div className="flex items-center gap-1.5 xs:gap-2 text-[11px] sm:text-sm text-slate-300 font-medium tabular-nums px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner shrink-0">
            <span className="text-amber-400 font-semibold tracking-wide">
              R{currentRound}/5
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono font-bold text-slate-100">
              {(totalScore ?? 0).toLocaleString()} <span className="text-[10px] sm:text-[11px] font-sans font-normal text-slate-400">pts</span>
            </span>
          </div>
        ) : null}

        {/* Zone 3: Primary Action Points */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Daily Streak Indicator */}
          <button
            type="button"
            onClick={onOpenProfile}
            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer group active:scale-95 ${
              streakData.currentStreak > 0
                ? 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 text-amber-300 shadow-sm shadow-amber-950/20'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
            title={`Daily Puzzle Streak: ${streakData.currentStreak} day${streakData.currentStreak === 1 ? '' : 's'}${
              isCompletedToday ? ' · Completed for today!' : ' · Complete today\'s puzzle to build streak'
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                streakData.currentStreak > 0
                  ? 'text-amber-400 fill-amber-400 animate-pulse'
                  : 'text-slate-500'
              }`}
            />
            <span className="font-mono text-xs font-bold tabular-nums">
              {streakData.currentStreak}
            </span>
            <span className="hidden sm:inline text-[11px] font-sans font-medium text-slate-400">
              {streakData.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </button>

          {/* Leaderboard Button (Hidden on small mobile when actively playing to preserve viewport space) */}
          {currentScreen !== 'leaderboard' && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className={`items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-sm ${
                isPlaying ? 'hidden sm:flex' : 'flex'
              }`}
              title="View Leaderboard & Rankings"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Leaderboard</span>
            </button>
          )}

          {/* Guest Mode Trigger Button (Hide on very small mobile screens when playing) */}
          {isAnonymous && onOpenSaveProgress && !isPlaying && (
            <button
              type="button"
              onClick={onOpenSaveProgress}
              className="hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
              title="How do you want to play?"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="whitespace-nowrap">Guest</span>
            </button>
          )}

          {/* Player Profile */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 text-slate-300 text-xs font-medium transition-colors cursor-pointer max-w-[85px] xs:max-w-[120px] sm:max-w-[150px]"
            title={`Player Profile${userCountry ? ` (${userCountry.name})` : ''}`}
          >
            {userCountry?.flag && (
              <span className="text-xs shrink-0 select-none" title={userCountry.name}>
                {userCountry.flag}
              </span>
            )}
            <span className="truncate whitespace-nowrap">{displayName || 'Player'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
