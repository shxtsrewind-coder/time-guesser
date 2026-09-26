import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Trophy,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Maximize2,
  MapPin,
  Calendar,
  Clock,
} from 'lucide-react';
import { useGame } from '../context/GameContext.tsx';
import { ResultMap } from '../components/ResultMap.tsx';
import { PhotoLightbox } from '../components/PhotoLightbox.tsx';
import { ArchivalAdBanner } from '../components/ArchivalAdBanner.tsx';
import { getLocalAdFreeStatus } from '../lib/monetization.ts';

interface RoundResultPageProps {
  onOpenRemoveAds?: () => void;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const RoundResultPage: React.FC<RoundResultPageProps> = ({ onOpenRemoveAds }) => {
  const { gameId, n } = useParams<{ gameId: string; n: string }>();
  const navigate = useNavigate();
  const roundNo = parseInt(n || '1', 10);

  const {
    rounds,
    results,
    maxTotalScore,
    isGameFinished,
    ensureGameLoaded,
    finishCurrentGame,
  } = useGame();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const isAdFree = getLocalAdFreeStatus();

  // 1. Ensure game data is loaded
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!gameId) {
        navigate('/', { replace: true });
        return;
      }

      const loaded = await ensureGameLoaded(gameId);
      if (!isMounted) return;

      if (!loaded) {
        navigate('/', { replace: true });
        return;
      }

      setIsInitializing(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [gameId, ensureGameLoaded, navigate]);

  const result = results[roundNo];
  const roundInfo = useMemo(() => rounds.find((r) => r.round_no === roundNo), [rounds, roundNo]);
  const isLastRound = roundNo >= 5 || (roundInfo && roundNo >= rounds.length);

  // 2. Preload next round photo on mount
  useEffect(() => {
    if (roundNo < 5 && rounds.length > 0) {
      const nextRound = rounds.find((r) => r.round_no === roundNo + 1);
      if (nextRound?.image_url) {
        const img = new Image();
        img.src = nextRound.image_url;
      }
    }
  }, [roundNo, rounds]);

  // 3. Guard: If no saved result for this round, redirect
  useEffect(() => {
    if (isInitializing) return;

    if (isGameFinished) {
      navigate(`/play/${gameId}/final`, { replace: true });
      return;
    }

    if (!result) {
      const firstUnanswered = rounds.find((r) => !results[r.round_no]);
      if (firstUnanswered) {
        navigate(`/play/${gameId}/round/${firstUnanswered.round_no}`, { replace: true });
      } else if (rounds.length > 0) {
        navigate(`/play/${gameId}/final`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isInitializing, isGameFinished, result, rounds, results, gameId, navigate]);

  if (isInitializing || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-stone-400">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        <span className="text-xs uppercase font-medium tracking-widest font-cinzel">
          Synchronizing Archival Records...
        </span>
      </div>
    );
  }

  const {
    guess_year,
    true_year,
    difference,
    year_score,
    actual_lat,
    actual_lng,
    guess_lat,
    guess_lng,
    distance_km,
    location_score,
    taken_on,
    actual_weekday_name,
    guess_weekday,
    weekday_score,
    score,
    round_max,
    total_score,
    caption,
    fun_fact,
    credit,
    source_url,
    license,
  } = result;

  // Timeline percentage math
  const MIN_YEAR = 1820;
  const MAX_YEAR = 2025;
  const guessPercent = Math.min(100, Math.max(0, ((guess_year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100));
  const truePercent = Math.min(100, Math.max(0, ((true_year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100));

  const minPercent = Math.min(guessPercent, truePercent);
  const maxPercent = Math.max(guessPercent, truePercent);
  const deltaWidth = Math.max(2, maxPercent - minPercent);

  const hasLocation = actual_lat !== null && actual_lng !== null && guess_lat !== null && guess_lng !== null;
  const hasWeekday = weekday_score !== null || actual_weekday_name !== null || guess_weekday !== null;

  const handleNextAction = async () => {
    if (isLastRound) {
      setIsFinishing(true);
      if (gameId) {
        await finishCurrentGame(gameId);
      }
      navigate(`/play/${gameId}/final`);
    } else {
      navigate(`/play/${gameId}/round/${roundNo + 1}`);
    }
  };

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 py-4 space-y-5 pb-36 page-enter transition-all ${
        hasLocation ? 'max-w-5xl' : 'max-w-2xl'
      }`}
    >
      {/* 1. Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="font-semibold text-amber-500 uppercase tracking-wider font-mono">
            Round {roundNo} of {rounds.length || 5} Complete
          </span>
          <span className="font-mono text-stone-300 tabular-nums">
            Running Score: <strong className="text-amber-400 font-bold">{total_score.toLocaleString()}</strong> pts
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-stone-900 border border-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
            style={{ width: `${(roundNo / (rounds.length || 5)) * 100}%` }}
          />
        </div>
      </div>

      {/* 2. Round Score Breakdown Card */}
      <div className="bg-[#141210] border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="font-bold text-amber-400 uppercase tracking-wider font-cinzel text-xs">
            Round {roundNo} Results
          </span>
          <span className="font-mono tabular-nums text-stone-300">
            Total {total_score.toLocaleString()} / {maxTotalScore.toLocaleString()} pts
          </span>
        </div>

        <div className="py-1">
          <div className="text-4xl sm:text-5xl font-black text-amber-300 font-cinzel tracking-tight flex items-center justify-center gap-2">
            <span>+{score.toLocaleString()}</span>
            <span className="text-xs font-sans uppercase font-bold text-amber-500/80 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40 font-mono">
              / {round_max?.toLocaleString() || '5,000'} pts
            </span>
          </div>

          {taken_on && (
            <div className="text-xs sm:text-sm text-stone-300 pt-2 flex items-center justify-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>
                Captured: <strong className="text-amber-200">{taken_on}</strong>
                {actual_weekday_name && ` (${actual_weekday_name})`}
              </span>
            </div>
          )}
        </div>

        {/* Three Score Lines (Location, Year, Weekday) */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-left">
          {/* Location Score Line */}
          {hasLocation && location_score !== null && (
            <div className="flex items-center justify-between py-1.5 border-b border-stone-800/70">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-stone-200 font-semibold block">Location Coordinates</span>
                  {distance_km !== null && (
                    <span className="text-[11px] text-stone-400 font-mono block">
                      {Math.round(distance_km).toLocaleString()} km from actual target
                    </span>
                  )}
                </div>
              </div>
              <div className="font-mono font-bold text-stone-100 tabular-nums text-right">
                <span className="text-amber-400 text-sm">{location_score.toLocaleString()}</span>
                <span className="text-stone-500 text-[11px]"> / 5,000</span>
              </div>
            </div>
          )}

          {/* Year Score Line */}
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-stone-200 font-semibold block">Year Chronology</span>
                <span className="text-[11px] text-stone-400 font-mono block">
                  {difference === 0 ? 'Exact year match!' : `Off by ${difference} ${difference === 1 ? 'year' : 'years'}`}
                </span>
              </div>
            </div>
            <div className="font-mono font-bold text-stone-100 tabular-nums text-right">
              <span className="text-amber-400 text-sm">{(year_score ?? score).toLocaleString()}</span>
              <span className="text-stone-500 text-[11px]"> / 5,000</span>
            </div>
          </div>

          {/* Day of Week Score Line */}
          {hasWeekday && weekday_score !== null && (
            <div className="flex items-center justify-between py-1.5 border-t border-stone-800/70">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-stone-200 font-semibold block">Day of the Week</span>
                  {guess_weekday !== null && actual_weekday_name && (
                    <span className="text-[11px] text-stone-400 font-mono block">
                      Guessed {WEEKDAY_NAMES[guess_weekday]} vs Actual {actual_weekday_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="font-mono font-bold text-stone-100 tabular-nums text-right">
                <span className={weekday_score > 0 ? 'text-emerald-400 text-sm' : 'text-stone-400 text-sm'}>
                  {weekday_score.toLocaleString()}
                </span>
                <span className="text-stone-500 text-[11px]"> / 1,000</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Geographic Trajectory & Archival Photo: Side-by-Side if location asked */}
      {hasLocation ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Archival Photo */}
          {roundInfo?.image_url && (
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold text-stone-200 flex items-center gap-1.5 font-cinzel">
                  Archival Evidence
                </span>
                <span className="text-[11px] text-stone-500">Historical Record</span>
              </div>
              <div className="relative rounded-3xl overflow-hidden bg-[#141210] border border-stone-800 shadow-xl h-[300px] sm:h-[340px] md:h-[380px]">
                <img
                  src={roundInfo.image_url}
                  alt={caption || 'Archival photograph'}
                  referrerPolicy="no-referrer"
                  onClick={() => setIsLightboxOpen(true)}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                />
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-sm text-stone-300 hover:text-white text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enlarge</span>
                </button>
              </div>
            </div>
          )}

          {/* Result Map */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-stone-200 flex items-center gap-1.5 font-cinzel">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Geographic Accuracy
              </span>
              {distance_km !== null && (
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {Math.round(distance_km).toLocaleString()} km
                </span>
              )}
            </div>
            <div className="h-[300px] sm:h-[340px] md:h-[380px]">
              <ResultMap
                guessLat={guess_lat}
                guessLng={guess_lng}
                actualLat={actual_lat}
                actualLng={actual_lng}
                distanceKm={distance_km}
              />
            </div>
          </div>
        </div>
      ) : (
        /* When no location asked, show photo */
        roundInfo?.image_url && (
          <div className="relative rounded-3xl overflow-hidden bg-[#141210] border border-stone-800 shadow-md aspect-[16/10] max-h-72">
            <img
              src={roundInfo.image_url}
              alt={caption || 'Archival photograph'}
              referrerPolicy="no-referrer"
              onClick={() => setIsLightboxOpen(true)}
              className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
            />
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-sm text-stone-300 hover:text-white text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Enlarge Photo</span>
            </button>
          </div>
        )
      )}

      {/* 4. Year Timeline & Accuracy Bar */}
      <div className="bg-[#141210] border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Chronological Comparison
          </span>
          {difference === 0 ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Exact Match!
            </span>
          ) : (
            <span className="text-amber-400 font-mono text-[11px]">
              Off by {difference} {difference === 1 ? 'year' : 'years'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block font-mono">
              Your Guess
            </span>
            <span className="text-3xl font-black font-cinzel text-amber-400 font-mono">
              {guess_year}
            </span>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300/80 block font-mono">
              Actual Year
            </span>
            <span className="text-3xl font-black font-cinzel text-emerald-400 font-mono">
              {true_year}
            </span>
          </div>
        </div>

        <div className="pt-2 space-y-1.5">
          <div className="relative w-full h-3 bg-stone-950 rounded-full border border-stone-800 overflow-visible">
            <div
              className="absolute top-0 bottom-0 bg-amber-600/30 rounded-full"
              style={{
                left: `${minPercent}%`,
                width: `${deltaWidth}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: `${guessPercent}%` }}
              title={`Guessed ${guess_year}`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-stone-950 shadow-md ring-2 ring-amber-500/50" />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
              style={{ left: `${truePercent}%` }}
              title={`Actual ${true_year}`}
            >
              <div className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-stone-950 shadow-md ring-2 ring-emerald-500/60" />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono">
            <span>{MIN_YEAR}</span>
            <div className="flex items-center gap-3">
              <span className="text-amber-400">● Guess ({guess_year})</span>
              <span className="text-emerald-400">● Actual ({true_year})</span>
            </div>
            <span>{MAX_YEAR}</span>
          </div>
        </div>
      </div>

      {/* 5. Archival Caption, Fun Fact & Credit Link */}
      <div className="bg-[#141210]/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
        {caption && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
              Archival Record
            </span>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
              {caption}
            </p>
          </div>
        )}

        {fun_fact && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 sm:p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Historical Context</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              {fun_fact}
            </p>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 border-t border-stone-800/80">
          {credit && (
            <span className="truncate max-w-[220px]" title={credit}>
              Credit: {credit}
            </span>
          )}
          {license && (
            <span className="text-stone-500 text-[10px]">
              {license}
            </span>
          )}
          {source_url && (
            <a
              href={source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline transition-colors ml-auto"
            >
              <span>View Archival Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* 7. Large Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#0c0a09] via-[#0c0a09]/95 to-transparent pt-4 pb-4 px-4 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            disabled={isFinishing}
            onClick={handleNextAction}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] text-stone-950 font-bold text-base shadow-xl shadow-amber-950/60 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {isFinishing ? (
              <>
                <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                <span>Tabulating Final Scores...</span>
              </>
            ) : isLastRound ? (
              <>
                <span>See Final Results</span>
                <Trophy className="w-5 h-5 fill-stone-950" />
              </>
            ) : (
              <>
                <span>Next Round ({roundNo + 1}/5)</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && roundInfo?.image_url && (
        <PhotoLightbox
          imageUrl={roundInfo.image_url}
          altText={caption || `Round ${roundNo} archival photo`}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
};
