import React, { useState, useEffect } from 'react';
import { Trophy, Share2, RotateCcw, Award, Check, Users, MapPin, Calendar, Clock, Flame, Sparkles } from 'lucide-react';
import { FinishGameResponse, GameMode } from '../types.ts';
import { ArchivalAdBanner } from './ArchivalAdBanner.tsx';
import { getLocalAdFreeStatus } from '../lib/monetization.ts';
import { getStreakData, recordDailyCompletion, getTimeUntilNextDaily, StreakData } from '../lib/streak.ts';

interface FinalResultsScreenProps {
  mode: GameMode;
  finishData: FinishGameResponse;
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
  onOpenRemoveAds?: () => void;
}

export const FinalResultsScreen: React.FC<FinalResultsScreenProps> = ({
  mode,
  finishData,
  onPlayAgain,
  onOpenLeaderboard,
  onOpenRemoveAds,
}) => {
  const [copied, setCopied] = useState(false);
  const isAdFree = getLocalAdFreeStatus();
  const [streakData, setStreakData] = useState<StreakData>(() => {
    if (mode === 'daily') {
      return getStreakData();
    }
    return getStreakData();
  });
  const [countdown, setCountdown] = useState(() => getTimeUntilNextDaily().formatted);

  const { total_score, max_score, round_scores = [], rank, players } = finishData;

  useEffect(() => {
    if (mode === 'daily') {
      // Ensure daily completion is recorded and grab updated streak
      const res = recordDailyCompletion(total_score, max_score);
      setStreakData(getStreakData());
    }

    const timer = setInterval(() => {
      setCountdown(getTimeUntilNextDaily().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, total_score, max_score]);

  const validMaxScore = max_score > 0 ? max_score : 25000;
  const percentage = Math.round((total_score / validMaxScore) * 100);

  const handleShare = async () => {
    const streakPart = mode === 'daily' && streakData.currentStreak > 0 ? ` · 🔥 ${streakData.currentStreak}-Day Streak` : '';
    const rankPart = rank && players ? ` (Rank #${rank}/${players} Daily)` : '';
    const shareText = `TimeGuess ${mode === 'daily' ? 'Daily ' : ''}${total_score.toLocaleString()}/${validMaxScore.toLocaleString()}${streakPart}${rankPart}\nPlay at ${window.location.origin}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // clipboard fallback
      }
    }
  };

  const getPerformanceBadge = () => {
    const ratio = total_score / validMaxScore;
    if (ratio >= 0.9) return { title: 'Master Chrononaut', desc: 'Legendary temporal & geographical intuition' };
    if (ratio >= 0.75) return { title: 'Senior Historian', desc: 'Outstanding chronological & cartographic accuracy' };
    if (ratio >= 0.55) return { title: 'Archival Explorer', desc: 'Keen cultural & historical awareness' };
    if (ratio >= 0.35) return { title: 'Time Traveler', desc: 'Solid historical intuition' };
    return { title: 'Temporal Apprentice', desc: 'Keep exploring world archives' };
  };

  const badge = getPerformanceBadge();

  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col justify-between min-h-[calc(100vh-64px)] space-y-6 pb-12">
      <div className="space-y-5">
        {/* Header Title */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs uppercase tracking-widest text-amber-500 font-mono font-medium">
            {mode === 'daily' ? 'Daily Challenge Complete' : 'Classic Expedition Complete'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-cinzel text-stone-100">
            {badge.title}
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto">{badge.desc}</p>
        </div>

        {/* Primary Score Showcase */}
        <div className="bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden space-y-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-xs font-semibold uppercase tracking-widest text-stone-400 font-mono">
            Final Expedition Score
          </div>

          <div className="py-2">
            <span className="text-5xl sm:text-6xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 font-mono tracking-tight drop-shadow-md">
              {total_score.toLocaleString()}
            </span>
            <span className="block text-xs sm:text-sm text-stone-400 font-medium pt-1 font-mono">
              out of {validMaxScore.toLocaleString()} points ({percentage}%)
            </span>
          </div>

          {/* Daily Rank if available */}
          {rank !== undefined && players !== undefined && (
            <div className="pt-3 border-t border-stone-800/80 flex items-center justify-center gap-2 text-amber-400 text-xs sm:text-sm font-semibold">
              <Users className="w-4 h-4" />
              <span>
                Ranked #{rank} among {players} players today
              </span>
            </div>
          )}
        </div>

        {/* Daily Streak Celebration Card */}
        {mode === 'daily' && (
          <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/40 border border-amber-600/40 rounded-3xl p-5 sm:p-6 text-center shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-400 font-cinzel flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
                Daily Streak Counted!
              </span>
              <span className="font-mono text-stone-400 text-[11px]">
                Next in <strong className="text-amber-300">{countdown}</strong>
              </span>
            </div>

            <div className="py-1">
              <div className="text-3xl sm:text-4xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-mono tracking-tight">
                {streakData.currentStreak} Day{streakData.currentStreak === 1 ? '' : 's'} Active
              </div>
              <p className="text-xs text-stone-300 pt-1">
                You've locked in your score for today's global daily ranking!
              </p>
            </div>

            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400 font-mono">
              <span>Best: <strong className="text-amber-400">{streakData.maxStreak}d</strong></span>
              <span>Total: <strong className="text-stone-200">{streakData.totalCompleted || streakData.completedDates.length}</strong></span>
              <span className="text-amber-400/90 font-sans font-medium">Play again in Classic mode!</span>
            </div>
          </div>
        )}

        {/* Round by Round Breakdown */}
        <div className="bg-[#141210]/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center justify-between font-mono">
            <span>Round Accuracy Breakdown</span>
            <span>Points</span>
          </div>

          <div className="space-y-2.5">
            {round_scores.map((item, idx) => {
              const roundScore = item.score ?? 0;
              const roundMax = item.max_score && item.max_score > 0 ? item.max_score : 5000;
              const roundPercent = Math.min(100, Math.round((roundScore / roundMax) * 100));

              return (
                <div key={item.round_no || idx} className="space-y-1.5 bg-stone-950/60 p-3 rounded-xl border border-stone-800/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-300 font-medium">Round {item.round_no || idx + 1}</span>
                    <span className="font-mono text-stone-200 tabular-nums font-semibold">
                      <span className="text-amber-400">{roundScore.toLocaleString()}</span>
                      <span className="text-stone-500"> / {roundMax.toLocaleString()} pts</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-stone-900 border border-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                      style={{ width: `${roundPercent}%` }}
                    />
                  </div>

                  {/* Sub-breakdown if available */}
                  {(item.location_score !== undefined || item.weekday_score !== undefined || item.year_score !== undefined) && (
                    <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-0.5 font-mono">
                      {item.location_score !== undefined && item.location_score !== null && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          <span>Loc: {item.location_score}</span>
                        </span>
                      )}
                      {item.year_score !== undefined && item.year_score !== null && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Yr: {item.year_score}</span>
                        </span>
                      )}
                      {item.weekday_score !== undefined && item.weekday_score !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Day: {item.weekday_score}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-4 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-stone-950" />
              <span>Score Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-stone-950" />
              <span>Share Score ({total_score.toLocaleString()}/{validMaxScore.toLocaleString()})</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="py-3 px-3 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-700/80 text-stone-200 font-semibold text-xs transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            <div className="flex items-center gap-1.5 text-amber-400">
              <RotateCcw className="w-4 h-4" />
              <span className="font-bold text-stone-100">Play Again</span>
            </div>
            <span className="text-[10px] text-stone-400 font-normal">
              {mode === 'daily' ? 'Classic Expedition' : 'New Expedition'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="py-3 px-3 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-700/80 text-stone-200 font-semibold text-xs transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            <div className="flex items-center gap-1.5 text-amber-400">
              <Trophy className="w-4 h-4" />
              <span className="font-bold text-stone-100">Leaderboard</span>
            </div>
            <span className="text-[10px] text-stone-400 font-normal">
              {mode === 'daily' ? 'Daily Standings' : 'Hall of Fame'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
