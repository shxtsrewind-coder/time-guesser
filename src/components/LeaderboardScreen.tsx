import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  ArrowLeft,
  RefreshCw,
  Medal,
  AlertCircle,
  Sparkles,
  Search,
  Crown,
  Compass,
  User,
  Zap,
} from 'lucide-react';
import { supabase, parseSupabaseError } from '../lib/supabase.ts';
import { DailyLeaderboardRow, AllTimeLeaderboardRow } from '../types.ts';
import { getLocalAdFreeStatus } from '../lib/monetization.ts';
import { getUserCountry, getCountryForUser, CountryInfo } from '../lib/countryFlags.ts';

interface LeaderboardScreenProps {
  onBack: () => void;
  onStartClassic: () => void;
  currentUserId?: string | null;
  currentDisplayName?: string;
  onOpenRemoveAds?: () => void;
}

interface RankedEntry {
  rank: number;
  displayName: string;
  score: number;
  country: CountryInfo;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  onBack,
  onStartClassic,
  currentDisplayName,
  onOpenRemoveAds,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'alltime'>('daily');
  const [dailyScores, setDailyScores] = useState<DailyLeaderboardRow[]>([]);
  const [allTimeScores, setAllTimeScores] = useState<AllTimeLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCountry, setUserCountryState] = useState<CountryInfo>(getUserCountry);
  const isAdFree = getLocalAdFreeStatus();

  // Listen for country changes
  useEffect(() => {
    const handleCountryChange = () => {
      setUserCountryState(getUserCountry());
    };
    window.addEventListener('timeguess_country_changed', handleCountryChange);
    return () => {
      window.removeEventListener('timeguess_country_changed', handleCountryChange);
    };
  }, []);

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

  const currentList: RankedEntry[] = useMemo(() => {
    const resolveCountry = (name: string, explicitCode?: string) => {
      if (currentDisplayName && name.toLowerCase() === currentDisplayName.toLowerCase()) {
        return userCountry;
      }
      return getCountryForUser(name, explicitCode);
    };

    if (activeTab === 'daily') {
      return dailyScores.map((row, idx) => ({
        rank: row.rank || idx + 1,
        displayName: row.display_name || 'Anonymous Chrononaut',
        score: row.total_score,
        country: resolveCountry(row.display_name || 'Anonymous Chrononaut', (row as any).country_code || (row as any).country),
      }));
    } else {
      return allTimeScores.map((row, idx) => ({
        rank: row.rank || idx + 1,
        displayName: row.display_name || 'Anonymous Chrononaut',
        score: row.best_score,
        country: resolveCountry(row.display_name || 'Anonymous Chrononaut', (row as any).country_code || (row as any).country),
      }));
    }
  }, [activeTab, dailyScores, allTimeScores, currentDisplayName, userCountry]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase().trim();
    return currentList.filter(
      (item) =>
        item.displayName.toLowerCase().includes(q) ||
        item.rank.toString() === q ||
        item.country.name.toLowerCase().includes(q)
    );
  }, [currentList, searchQuery]);

  const topThree = useMemo(() => {
    return {
      first: currentList.find((i) => i.rank === 1) || null,
      second: currentList.find((i) => i.rank === 2) || null,
      third: currentList.find((i) => i.rank === 3) || null,
    };
  }, [currentList]);

  const userRankEntry = useMemo(() => {
    if (!currentDisplayName) return null;
    return currentList.find(
      (i) => i.displayName.toLowerCase() === currentDisplayName.toLowerCase()
    );
  }, [currentList, currentDisplayName]);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-stone-950 font-black text-xs flex items-center justify-center shadow-md shadow-amber-950/50">
          <Crown className="w-4 h-4 fill-stone-950" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-stone-200 via-stone-300 to-stone-400 text-stone-950 font-black text-xs flex items-center justify-center shadow-md">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-100 font-black text-xs flex items-center justify-center shadow-md">
          3
        </div>
      );
    }
    return (
      <div className="w-7 text-center text-xs font-mono font-bold text-stone-500">
        #{rank}
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-stone-100 transition-colors py-1 px-2 rounded-lg hover:bg-stone-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2.5">
          {!isAdFree && onOpenRemoveAds && (
            <button
              type="button"
              onClick={onOpenRemoveAds}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Remove Ads</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchLeaderboards}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-850 border border-stone-700/80 text-stone-300 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Title Section */}
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-amber-500 font-mono font-medium">
          Global Chrono Rankings
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-cinzel text-stone-100">
          Leaderboard
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
          Compete with players around the world in temporal accuracy and geographical intuition.
        </p>
      </div>

      {/* Segmented Mode Selector */}
      <div className="flex max-w-sm mx-auto p-1 rounded-xl bg-stone-900/90 border border-stone-800 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-950/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Daily Challenge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alltime')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'alltime'
              ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-950/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          All-Time High Scores
        </button>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="max-w-md mx-auto bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchLeaderboards}
            className="text-amber-400 underline font-semibold ml-2 hover:text-amber-300 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Responsive Grid: Side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols on lg): Top 3 Podium & Player Standing */}
        <div className="lg:col-span-5 space-y-4">
          {/* Top 3 Podium Showcase Card */}
          <div className="bg-[#141210] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider font-mono">
              <span>Podium Leaders</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Top 3
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 py-2">
                <div className="h-16 rounded-xl bg-stone-900/60 animate-pulse" />
                <div className="h-14 rounded-xl bg-stone-900/40 animate-pulse" />
                <div className="h-14 rounded-xl bg-stone-900/30 animate-pulse" />
              </div>
            ) : currentList.length === 0 ? (
              <div className="py-8 text-center text-stone-500 space-y-2">
                <Medal className="w-10 h-10 text-stone-700 mx-auto stroke-1" />
                <p className="text-xs text-stone-400">Podium is currently vacant</p>
                <p className="text-[11px] text-stone-600">
                  Complete today's challenge to claim the first rank!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* 1st Place Champion */}
                {topThree.first && (
                  <div className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 p-[1px] shadow-lg shadow-amber-950/40">
                    <div className="bg-[#171513] p-3.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                          <Crown className="w-5 h-5 fill-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block font-mono">
                            Champion #1
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base select-none shrink-0" title={topThree.first.country.name}>
                              {topThree.first.country.flag}
                            </span>
                            <span className="text-sm font-bold text-stone-100 truncate block">
                              {topThree.first.displayName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-black font-cinzel text-amber-300 font-mono">
                          {topThree.first.score.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-stone-500 block">pts</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2nd Place Silver */}
                {topThree.second && (
                  <div className="rounded-xl bg-stone-950/70 border border-stone-800 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-stone-850 border border-stone-700 flex items-center justify-center text-stone-200 font-black text-xs shrink-0">
                        2
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block font-mono">
                          Runner Up
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm select-none shrink-0" title={topThree.second.country.name}>
                            {topThree.second.country.flag}
                          </span>
                          <span className="text-xs font-semibold text-stone-200 truncate block">
                            {topThree.second.displayName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-stone-200 font-mono">
                        {topThree.second.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-stone-500 block">pts</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place Bronze */}
                {topThree.third && (
                  <div className="rounded-xl bg-stone-950/70 border border-stone-800 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center justify-center text-amber-300 font-black text-xs shrink-0">
                        3
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500/80 block font-mono">
                          Third Place
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm select-none shrink-0" title={topThree.third.country.name}>
                            {topThree.third.country.flag}
                          </span>
                          <span className="text-xs font-semibold text-stone-200 truncate block">
                            {topThree.third.displayName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-amber-400 font-mono">
                        {topThree.third.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-stone-500 block">pts</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User's Standing Card */}
          <div className="bg-[#141210] border border-stone-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Your Standing</span>
              </span>
              <div className="flex items-center gap-1.5 text-stone-300 font-semibold">
                <span className="text-sm" title={userCountry.name}>{userCountry.flag}</span>
                <span>{currentDisplayName || 'Guest'}</span>
              </div>
            </div>

            <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-stone-500 font-mono">Current Position</span>
                <p className="text-xs font-semibold text-stone-200">
                  {userRankEntry
                    ? `Rank #${userRankEntry.rank} on Leaderboard`
                    : 'Unranked (Finish a game to appear)'}
                </p>
              </div>

              {userRankEntry && (
                <div className="text-right">
                  <span className="text-[10px] uppercase text-stone-500 font-mono">Score</span>
                  <p className="text-sm font-bold font-mono text-amber-400">
                    {userRankEntry.score.toLocaleString()} pts
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={onStartClassic}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 fill-stone-950" />
            <span>Launch Classic Game</span>
          </button>
        </div>

        {/* Right Column (7 cols on lg): Search + Ranked Roster Table */}
        <div className="lg:col-span-7 space-y-3">
          {/* Search bar & count */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players by name, rank or country..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-900/80 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
              />
            </div>
            <span className="text-xs text-stone-500 shrink-0 font-mono">
              {filteredList.length} {filteredList.length === 1 ? 'Player' : 'Players'}
            </span>
          </div>

          {/* Roster Container */}
          <div className="bg-[#141210] border border-stone-800 rounded-2xl p-2 min-h-[380px] flex flex-col justify-start">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-xl bg-stone-900/60 animate-pulse flex items-center justify-between px-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-stone-800" />
                      <div className="w-32 h-3.5 rounded bg-stone-800" />
                    </div>
                    <div className="w-16 h-3.5 rounded bg-stone-800" />
                  </div>
                ))}
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500 space-y-2">
                <Trophy className="w-10 h-10 text-stone-700 stroke-1" />
                <p className="text-sm font-medium text-stone-400">
                  {searchQuery ? 'No matching players found' : 'No records yet'}
                </p>
                <p className="text-xs max-w-xs text-stone-500">
                  {searchQuery
                    ? `No players matched "${searchQuery}". Try a different search.`
                    : 'Be the first explorer to record an archival triumph!'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 p-1 max-h-[520px] overflow-y-auto pr-1">
                {filteredList.map((row) => {
                  const isCurrentUser =
                    currentDisplayName &&
                    row.displayName.toLowerCase() === currentDisplayName.toLowerCase();

                  return (
                    <div
                      key={row.rank}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all border ${
                        isCurrentUser
                          ? 'bg-amber-950/30 border-amber-600/40 shadow-sm'
                          : 'bg-stone-950/50 border-stone-850 hover:bg-stone-900/50 hover:border-stone-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {renderRankBadge(row.rank)}

                        {/* User Country Flag */}
                        <span
                          className="text-lg shrink-0 select-none cursor-default"
                          title={row.country.name}
                          aria-label={row.country.name}
                        >
                          {row.country.flag}
                        </span>

                        {/* Monogram Avatar */}
                        <div className="w-7 h-7 rounded-full bg-stone-850 border border-stone-750 flex items-center justify-center text-[11px] font-bold text-stone-300 shrink-0 font-cinzel">
                          {row.displayName.slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold truncate max-w-[120px] sm:max-w-[200px] ${
                              isCurrentUser ? 'text-amber-300 font-bold' : 'text-stone-200'
                            }`}
                          >
                            {row.displayName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                          {row.score.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-stone-500 font-sans ml-1">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
