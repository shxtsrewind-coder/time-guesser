import React, { useState, useEffect } from 'react';
import { Trophy, User, Flame } from 'lucide-react';
import { GameMode } from '../types.ts';
import { getUserCountry } from '../lib/countryFlags.ts';
import { getStreakData, isDailyCompletedToday, StreakData } from '../lib/streak.ts';

interface HeaderProps {
  currentScreen: string;
  gameMode?: GameMode;
  currentRound?: number;
  totalScore?: number;
  displayName: string;
  onOpenProfile: () => void;
  onGoHome: () => void;
  onOpenLeaderboard: () => void;
  onOpenRemoveAds?: () => void;
  isPlaying?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  currentRound,
  totalScore,
  displayName,
  onOpenProfile,
  onGoHome,
  onOpenLeaderboard,
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
    <header className="sticky top-0 z-40 w-full bg-[#0c0a09]/95 backdrop-blur-md border-b border-stone-800/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Single text element Brand Title */}
        <button
          type="button"
          onClick={onGoHome}
          className="group flex items-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md transition-transform active:scale-95"
          aria-label="TimeGuess Home"
        >
          <span className="text-xl sm:text-2xl font-black font-cinzel tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 group-hover:brightness-110 transition-all select-none">
            TimeGuess
          </span>
        </button>

        {/* Zone 2: Live In-Game Status (Unboxed clean typography with tabular nums) */}
        {isPlaying && currentRound !== undefined ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-300 font-medium tabular-nums px-3 py-1 rounded-lg bg-stone-900/60 border border-stone-800/80">
            <span className="text-amber-400 font-semibold tracking-wide">
              Round {currentRound} of 5
            </span>
            <span className="text-stone-600" aria-hidden="true">·</span>
            <span className="font-mono font-bold text-stone-100">
              {(totalScore ?? 0).toLocaleString()} <span className="text-[11px] font-sans font-normal text-stone-400">pts</span>
            </span>
          </div>
        ) : null}

        {/* Zone 3: Primary Action Points */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Daily Streak Indicator */}
          <button
            type="button"
            onClick={onOpenProfile}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer group active:scale-95 ${
              streakData.currentStreak > 0
                ? 'bg-amber-950/25 border-amber-600/40 hover:bg-amber-950/40 text-amber-300'
                : 'bg-stone-900/80 border-stone-800 hover:border-stone-700 text-stone-400'
            }`}
            title={`Daily Puzzle Streak: ${streakData.currentStreak} day${streakData.currentStreak === 1 ? '' : 's'}${
              isCompletedToday ? ' · Completed for today!' : ' · Complete today\'s puzzle to build streak'
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                streakData.currentStreak > 0
                  ? 'text-amber-400 fill-amber-400 animate-pulse'
                  : 'text-stone-500'
              }`}
            />
            <span className="font-mono text-xs font-bold tabular-nums">
              {streakData.currentStreak}
            </span>
            <span className="hidden sm:inline text-[11px] font-sans font-medium text-stone-400">
              {streakData.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </button>

          {/* Leaderboard Button */}
          {currentScreen !== 'leaderboard' && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-850 border border-stone-700/80 hover:border-amber-500/40 text-stone-300 hover:text-amber-300 text-xs font-medium transition-colors cursor-pointer"
              title="View Leaderboard & Rankings"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Leaderboard</span>
            </button>
          )}

          {/* Player Profile */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900/70 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer max-w-[130px] sm:max-w-[150px]"
            title={`Player Profile (${userCountry.name})`}
          >
            <span className="text-xs shrink-0 select-none" title={userCountry.name}>{userCountry.flag}</span>
            <span className="truncate whitespace-nowrap">{displayName || 'Player'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
