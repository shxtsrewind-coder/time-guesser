import React from 'react';
import { Trophy, Clock, User, Compass } from 'lucide-react';
import { GameMode } from '../types.ts';

interface HeaderProps {
  currentScreen: string;
  gameMode?: GameMode;
  currentRound?: number;
  totalScore?: number;
  displayName: string;
  onOpenProfile: () => void;
  onGoHome: () => void;
  onOpenLeaderboard: () => void;
  isPlaying?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  gameMode,
  currentRound,
  totalScore,
  displayName,
  onOpenProfile,
  onGoHome,
  onOpenLeaderboard,
  isPlaying,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full max-w-lg mx-auto px-4 py-3 bg-[#0c0a09]/90 backdrop-blur-md border-b border-stone-800/80 flex items-center justify-between transition-colors">
      {/* Brand title */}
      <button
        type="button"
        onClick={onGoHome}
        className="flex items-center gap-2 text-left group transition-transform active:scale-95"
      >
        <span className="text-xl font-bold tracking-wider font-cinzel text-amber-400 group-hover:text-amber-300 transition-colors">
          TimeGuess
        </span>
      </button>

      {/* Center status if playing */}
      {isPlaying && currentRound !== undefined && (
        <div className="flex items-center gap-2.5 text-xs text-stone-300 tabular-nums">
          <span className="font-semibold text-amber-400">
            R{currentRound}/5
          </span>
          <span className="text-stone-600">·</span>
          <span className="font-bold text-stone-100">
            {(totalScore ?? 0).toLocaleString()} <span className="text-[10px] text-stone-400">pts</span>
          </span>
        </div>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {!isPlaying && currentScreen !== 'leaderboard' && (
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-medium transition-colors"
            title="Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xs:inline">Rankings</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-medium transition-colors"
          title="Profile & Sign In"
        >
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span className="max-w-[70px] truncate">{displayName || 'Sign in'}</span>
        </button>
      </div>
    </header>
  );
};
