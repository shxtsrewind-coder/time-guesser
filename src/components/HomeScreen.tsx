import React from 'react';
import { Calendar, Play, Trophy, Sparkles, HelpCircle, AlertCircle, History } from 'lucide-react';
import { GameMode } from '../types.ts';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
  onOpenLeaderboard: () => void;
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
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 flex flex-col justify-between min-h-[calc(100vh-60px)]">
      {/* Hero Section */}
      <div className="space-y-6 pt-2">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-400 text-xs font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chronological Intuition</span>
          </div>
          <h1 className="text-4xl xs:text-5xl font-extrabold tracking-tight font-cinzel text-amber-300 drop-shadow-md">
            TimeGuess
          </h1>
          <p className="text-stone-400 text-sm max-w-xs mx-auto leading-relaxed">
            Travel back in time. View rare archival photographs and guess the location, year, and day of the week they were captured.
          </p>
        </div>

        {/* Daily already played warning banner */}
        {dailyPlayedNotice && (
          <div className="bg-amber-950/50 border border-amber-700/60 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Daily Challenge Already Completed</p>
              <p className="text-stone-300">
                You've already conquered today's daily puzzle! Test your skills with unlimited Classic mode.
              </p>
            </div>
          </div>
        )}

        {/* Error message banner with dismiss/retry */}
        {errorMessage && !dailyPlayedNotice && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 text-xs text-rose-200 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={onClearError}
              className="text-stone-400 hover:text-stone-200 text-xs underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onStartGame('daily')}
            className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 p-[1px] shadow-lg shadow-amber-900/20 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <div className="relative px-5 py-4 rounded-2xl bg-stone-950/90 group-hover:bg-stone-950/70 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-stone-100 flex items-center gap-2">
                    Daily Challenge
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Ranked
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">Same 5 photos for everyone today</p>
                </div>
              </div>
              {isLoading && loadingMode === 'daily' ? (
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5 text-amber-400 fill-amber-400" />
              )}
            </div>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onStartGame('classic')}
            className="w-full rounded-2xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 p-4 active:scale-[0.98] transition-all flex items-center justify-between shadow-md disabled:opacity-60"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
                <History className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-base font-bold text-stone-100">Play Classic</div>
                <p className="text-xs text-stone-400">Randomized historical collection</p>
              </div>
            </div>
            {isLoading && loadingMode === 'classic' ? (
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5 text-stone-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="w-full py-3 px-4 rounded-xl bg-stone-950/60 hover:bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>View Hall of Fame & Leaderboards</span>
          </button>
        </div>

        {/* How to Play Card */}
        <div className="bg-stone-900/50 border border-stone-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-stone-300 text-xs font-semibold uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>How to Play</span>
          </div>

          <div className="space-y-2 text-xs text-stone-400 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p>Each game consists of <strong className="text-stone-200">5 rounds</strong> of authentic historical photos.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p><strong className="text-amber-400">Year:</strong> Up to 5,000 points for precision timing.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p><strong className="text-amber-400">Location:</strong> Up to 5,000 points by dropping a pin on the map when asked.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p><strong className="text-amber-400">Day of Week:</strong> 1,000 bonus points for guessing the exact weekday.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p>Tap any photo to zoom in and examine vehicles, fashion, signs, and landmarks.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-6 pb-2 text-center text-stone-600 text-xs">
        <p>Photographic archives from public & creative commons sources</p>
      </footer>
    </div>
  );
};
