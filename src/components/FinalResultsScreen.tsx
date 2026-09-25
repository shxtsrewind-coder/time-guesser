import React, { useState } from 'react';
import { Trophy, Share2, RotateCcw, Award, Check, Users, MapPin, Calendar, Clock } from 'lucide-react';
import { FinishGameResponse, GameMode } from '../types.ts';

interface FinalResultsScreenProps {
  mode: GameMode;
  finishData: FinishGameResponse;
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
}

export const FinalResultsScreen: React.FC<FinalResultsScreenProps> = ({
  mode,
  finishData,
  onPlayAgain,
  onOpenLeaderboard,
}) => {
  const [copied, setCopied] = useState(false);

  const { total_score, max_score, round_scores = [], rank, players } = finishData;

  const validMaxScore = max_score > 0 ? max_score : 25000;
  const percentage = Math.round((total_score / validMaxScore) * 100);

  const handleShare = async () => {
    const shareText = `TimeGuess ${total_score.toLocaleString()}/${validMaxScore.toLocaleString()}${
      rank && players ? ` (Rank #${rank}/${players} Daily)` : ''
    }\nPlay at ${window.location.origin}`;

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
    if (ratio >= 0.9) return { title: 'Time Lord', desc: 'Legendary temporal & geographical precision' };
    if (ratio >= 0.75) return { title: 'Master Historian', desc: 'Outstanding chronological & spatial instinct' };
    if (ratio >= 0.55) return { title: 'Archival Explorer', desc: 'Sharp cultural & historical awareness' };
    if (ratio >= 0.35) return { title: 'Time Traveler', desc: 'Solid historical intuition' };
    return { title: 'Temporal Apprentice', desc: 'Keep exploring history & geography' };
  };

  const badge = getPerformanceBadge();

  return (
    <div className="w-full max-w-md mx-auto px-4 py-5 flex flex-col justify-between min-h-[calc(100vh-65px)] space-y-5 pb-8">
      <div className="space-y-4">
        {/* Header Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>{mode === 'daily' ? 'Daily Challenge Completed' : 'Classic Expedition Completed'}</span>
          </div>
          <h1 className="text-3xl font-extrabold font-cinzel text-stone-100">
            {badge.title}
          </h1>
          <p className="text-xs text-stone-400">{badge.desc}</p>
        </div>

        {/* Primary Score Showcase */}
        <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden space-y-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Total Score
          </div>

          <div className="py-2">
            <span className="text-5xl xs:text-6xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 font-mono tracking-tight drop-shadow-md">
              {total_score.toLocaleString()}
            </span>
            <span className="block text-xs text-stone-400 font-medium pt-1 font-mono">
              out of {validMaxScore.toLocaleString()} points ({percentage}%)
            </span>
          </div>

          {/* Daily Rank if available */}
          {rank !== undefined && players !== undefined && (
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold">
              <Users className="w-4 h-4" />
              <span>
                Ranked #{rank} among {players} players today
              </span>
            </div>
          )}
        </div>

        {/* Round by Round Breakdown */}
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center justify-between">
            <span>Round Breakdown</span>
            <span>Accuracy</span>
          </div>

          <div className="space-y-3">
            {round_scores.map((item, idx) => {
              const roundScore = item.score ?? 0;
              const roundMax = item.max_score && item.max_score > 0 ? item.max_score : 5000;
              const roundPercent = Math.min(100, Math.round((roundScore / roundMax) * 100));
              
              return (
                <div key={item.round_no || idx} className="space-y-1.5 bg-stone-950/40 p-2.5 rounded-xl border border-stone-800/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-300 font-medium">Round {item.round_no || idx + 1}</span>
                    <span className="font-mono text-stone-200 tabular-nums font-semibold">
                      <span className="text-amber-400">{roundScore.toLocaleString()}</span>
                      <span className="text-stone-500"> / {roundMax.toLocaleString()} pts</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-stone-950 border border-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                      style={{ width: `${roundPercent}%` }}
                    />
                  </div>

                  {/* Sub-breakdown badges if available */}
                  {(item.location_score !== undefined || item.weekday_score !== undefined || item.year_score !== undefined) && (
                    <div className="flex items-center gap-3 text-[10px] text-stone-400 pt-0.5 font-mono">
                      {item.location_score !== undefined && item.location_score !== null && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-amber-500" />
                          <span>{item.location_score}</span>
                        </span>
                      )}
                      {item.year_score !== undefined && item.year_score !== null && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-amber-500" />
                          <span>{item.year_score}</span>
                        </span>
                      )}
                      {item.weekday_score !== undefined && item.weekday_score !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-amber-500" />
                          <span>{item.weekday_score}</span>
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
      <div className="space-y-2.5 pt-2 pb-1">
        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-stone-950" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-stone-950" />
              <span>Share Score ({total_score.toLocaleString()}/{validMaxScore.toLocaleString()})</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPlayAgain}
            className="py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Play Again</span>
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Leaderboards</span>
          </button>
        </div>
      </div>
    </div>
  );
};
