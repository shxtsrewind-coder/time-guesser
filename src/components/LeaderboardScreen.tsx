import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, RefreshCw, Medal, AlertCircle, Sparkles, User } from 'lucide-react';
import { supabase, parseSupabaseError } from '../lib/supabase.ts';
import { DailyLeaderboardRow, AllTimeLeaderboardRow } from '../types.ts';

interface LeaderboardScreenProps {
  onBack: () => void;
  onStartClassic: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, onStartClassic }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'alltime'>('daily');
  const [dailyScores, setDailyScores] = useState<DailyLeaderboardRow[]>([]);
  const [allTimeScores, setAllTimeScores] = useState<AllTimeLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLeaderboards = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (activeTab === 'daily') {
        const { data, error } = await supabase.rpc('leaderboard_daily');
        if (error) throw error;
        setDailyScores(Array.isArray(data) ? data : []);
      } else {
        const { data, error } = await supabase.rpc('leaderboard_alltime');
        if (error) throw error;
        setAllTimeScores(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      const parsed = await parseSupabaseError(err);
      setErrorMsg(parsed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, [activeTab]);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center shadow-md">
          1
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-6 h-6 rounded-full bg-stone-300 text-stone-950 font-black text-xs flex items-center justify-center shadow-md">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-6 h-6 rounded-full bg-amber-700 text-stone-100 font-black text-xs flex items-center justify-center shadow-md">
          3
        </div>
      );
    }
    return (
      <span className="w-6 text-center text-xs font-mono font-semibold text-stone-500">
        #{rank}
      </span>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col justify-between min-h-[calc(100vh-65px)] space-y-4">
      <div className="space-y-4">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={fetchLeaderboards}
            disabled={loading}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Trophy className="w-4 h-4" />
            <span>Hall of Fame</span>
          </div>
          <h1 className="text-2xl font-bold font-cinzel text-stone-100">
            Leaderboards
          </h1>
          <p className="text-xs text-stone-400">
            Only registered players appear in official rankings.
          </p>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex p-1 rounded-xl bg-stone-900 border border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'daily'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Today's Daily
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alltime')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'alltime'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            All-Time High Scores
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-200 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={fetchLeaderboards}
              className="text-amber-400 underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Scores List / Skeleton / Empty State */}
        <div className="bg-stone-900/50 border border-stone-800/80 rounded-2xl p-2 min-h-[300px] flex flex-col justify-start">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-stone-800/40 animate-pulse flex items-center justify-between px-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-stone-800" />
                    <div className="w-28 h-3.5 rounded bg-stone-800" />
                  </div>
                  <div className="w-16 h-3.5 rounded bg-stone-800" />
                </div>
              ))}
            </div>
          ) : activeTab === 'daily' ? (
            dailyScores.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500 space-y-2">
                <Medal className="w-10 h-10 text-stone-700 stroke-1" />
                <p className="text-sm font-medium text-stone-400">No scores yet</p>
                <p className="text-xs max-w-xs text-stone-500">
                  Be the first signed-in player to tackle today's daily challenge and claim rank #1!
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {dailyScores.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-stone-800/40 transition-colors border border-transparent hover:border-stone-800/50"
                  >
                    <div className="flex items-center gap-3">
                      {renderRankBadge(row.rank || idx + 1)}
                      <span className="text-xs font-semibold text-stone-200 truncate max-w-[170px]">
                        {row.display_name || 'Anonymous Chrononaut'}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                      {row.total_score.toLocaleString()} <span className="text-[10px] text-stone-500 font-sans">pts</span>
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : allTimeScores.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500 space-y-2">
              <Trophy className="w-10 h-10 text-stone-700 stroke-1" />
              <p className="text-sm font-medium text-stone-400">No scores yet</p>
              <p className="text-xs max-w-xs text-stone-500">
                All-time records will be published as players complete 5-round expeditions.
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {allTimeScores.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-stone-800/40 transition-colors border border-transparent hover:border-stone-800/50"
                >
                  <div className="flex items-center gap-3">
                    {renderRankBadge(row.rank || idx + 1)}
                    <span className="text-xs font-semibold text-stone-200 truncate max-w-[170px]">
                      {row.display_name || 'Anonymous Chrononaut'}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                    {row.best_score.toLocaleString()} <span className="text-[10px] text-stone-500 font-sans">pts</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onStartClassic}
          className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 fill-stone-950" />
          <span>Play Classic Mode Now</span>
        </button>
      </div>
    </div>
  );
};
