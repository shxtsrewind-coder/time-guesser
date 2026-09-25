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
  Navigation,
} from 'lucide-react';
import { useGame } from '../context/GameContext.tsx';
import { ResultMap } from '../components/ResultMap.tsx';
import { PhotoLightbox } from '../components/PhotoLightbox.tsx';

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const RoundResultPage: React.FC = () => {
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

  // 3. Guard: If no saved result for this round, redirect to current unanswered round
  useEffect(() => {
    if (isInitializing) return;

    if (isGameFinished) {
      navigate(`/play/${gameId}/final`, { replace: true });
      return;
    }

    if (!result) {
      // Find the first unanswered round
      const firstUnanswered = rounds.find((r) => !results[r.round_no]);
      if (firstUnanswered) {
        navigate(`/play/${gameId}/round/${firstUnanswered.round_no}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isInitializing, result, rounds, results, isGameFinished, gameId, navigate]);

  if (isInitializing || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-stone-400">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        <span className="text-xs uppercase font-medium tracking-widest font-serif-display">
          Loading Round Results...
        </span>
      </div>
    );
  }

  const {
    round_no,
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
    max_total,
    caption,
    fun_fact,
    credit,
    source_url,
    license,
  } = result;

  const validMaxTotal = max_total || maxTotalScore || 25000;

  // Timeline representation (1820 to 2025)
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
    if (isFinishing) return;

    if (isLastRound) {
      setIsFinishing(true);
      await finishCurrentGame(gameId);
      navigate(`/play/${gameId}/final`);
    } else {
      navigate(`/play/${gameId}/round/${roundNo + 1}`);
    }
  };

  return (
    <div className="page-enter w-full max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* 1. Round Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider font-semibold text-amber-500">
            Round {round_no} of {rounds.length || 5} Complete
          </span>
          <span className="font-mono text-stone-400 font-medium">
            Running Total: <strong className="text-stone-100">{total_score.toLocaleString()}</strong> / {validMaxTotal.toLocaleString()} pts
          </span>
        </div>

        <div className="flex gap-1.5 items-center w-full">
          {Array.from({ length: rounds.length || 5 }).map((_, idx) => {
            const isFilled = idx + 1 <= round_no;
            const isCurrent = idx + 1 === round_no;
            return (
              <div
                key={idx}
                className={`h-2 rounded-full flex-1 transition-all ${
                  isCurrent
                    ? 'bg-amber-400 ring-2 ring-amber-500/50'
                    : isFilled
                    ? 'bg-amber-600'
                    : 'bg-stone-800'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 2. Primary Score Breakdown Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl text-center space-y-3 relative overflow-hidden">
        <div className="py-1">
          <div className="text-4xl font-black text-amber-300 font-mono tracking-tight flex items-center justify-center gap-1.5">
            <span>+{score.toLocaleString()}</span>
            <span className="text-xs font-sans uppercase font-bold text-amber-500/80 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
              / {round_max?.toLocaleString() || '5,000'} pts
            </span>
          </div>

          {taken_on && (
            <div className="text-xs text-stone-300 pt-1 flex items-center justify-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Taken on: <strong className="text-amber-200">{taken_on}</strong>
                {actual_weekday_name && ` (${actual_weekday_name})`}
              </span>
            </div>
          )}
        </div>

        {/* THREE SCORE LINES: Location, Year, Day of week */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-xl p-3 space-y-2 text-xs text-left">
          {/* Location Score Line */}
          {hasLocation && location_score !== null && (
            <div className="flex items-center justify-between py-1 border-b border-stone-800/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300 font-medium">Location</span>
                {distance_km !== null && (
                  <span className="text-[10px] text-stone-500 font-mono">
                    ({Math.round(distance_km).toLocaleString()} km away)
                  </span>
                )}
              </div>
              <div className="font-mono font-bold text-stone-100 tabular-nums">
                <span className="text-amber-400">{location_score.toLocaleString()}</span>
                <span className="text-stone-500"> / 5,000</span>
              </div>
            </div>
          )}

          {/* Year Score Line */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-stone-300 font-medium">Year</span>
              <span className="text-[10px] text-stone-500 font-mono">
                ({difference === 0 ? 'Exact Year!' : `Off by ${difference} ${difference === 1 ? 'yr' : 'yrs'}`})
              </span>
            </div>
            <div className="font-mono font-bold text-stone-100 tabular-nums">
              <span className="text-amber-400">{(year_score ?? score).toLocaleString()}</span>
              <span className="text-stone-500"> / 5,000</span>
            </div>
          </div>

          {/* Day of Week Score Line */}
          {hasWeekday && weekday_score !== null && (
            <div className="flex items-center justify-between py-1 border-t border-stone-800/60">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300 font-medium">Day of Week</span>
                {guess_weekday !== null && actual_weekday_name && (
                  <span className="text-[10px] text-stone-500">
                    ({WEEKDAY_NAMES[guess_weekday]?.slice(0, 3)} vs {actual_weekday_name.slice(0, 3)})
                  </span>
                )}
              </div>
              <div className="font-mono font-bold text-stone-100 tabular-nums">
                <span className={weekday_score > 0 ? 'text-emerald-400' : 'text-stone-400'}>
                  {weekday_score.toLocaleString()}
                </span>
                <span className="text-stone-500"> / 1,000</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Geographic Accuracy Map (if location was asked) */}
      {hasLocation && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-stone-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Geographic Proximity
            </span>
            {distance_km !== null && (
              <span className="text-[11px] font-mono text-amber-400">
                {Math.round(distance_km).toLocaleString()} km
              </span>
            )}
          </div>
          <ResultMap
            guessLat={guess_lat}
            guessLng={guess_lng}
            actualLat={actual_lat}
            actualLng={actual_lng}
            distanceKm={distance_km}
          />
        </div>
      )}

      {/* 4. Year Timeline & Comparison */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Chronological Timeline
          </span>
          {difference === 0 ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Exact Year!
            </span>
          ) : (
            <span className="text-amber-400 font-mono text-[11px]">
              Off by {difference} {difference === 1 ? 'year' : 'years'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
              You Guessed
            </span>
            <span className="text-2xl font-bold font-serif-display text-amber-400 font-mono">
              {guess_year}
            </span>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300/80 block">
              Actual Year
            </span>
            <span className="text-2xl font-bold font-serif-display text-emerald-400 font-mono">
              {true_year}
            </span>
          </div>
        </div>

        <div className="pt-2 space-y-1.5">
          <div className="relative w-full h-3 bg-stone-950 rounded-full border border-stone-800 overflow-visible">
            <div
              className="absolute top-0 bottom-0 bg-amber-600/40 rounded-full"
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

      {/* 5. Photo Preview with Zoom */}
      {roundInfo?.image_url && (
        <div className="relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-md aspect-[16/10] max-h-56">
          <img
            src={roundInfo.image_url}
            alt={caption || 'Archival photograph record'}
            referrerPolicy="no-referrer"
            onClick={() => setIsLightboxOpen(true)}
            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-stone-300 hover:text-white text-xs flex items-center gap-1.5 shadow-md"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Enlarge Photo</span>
          </button>
        </div>
      )}

      {/* 6. Historical Context, Fun Fact & Credit Link */}
      <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 space-y-3">
        {caption && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Archival Record
            </span>
            <p className="text-xs text-stone-200 leading-relaxed font-medium">
              {caption}
            </p>
          </div>
        )}

        {fun_fact && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Historical Fun Fact</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              {fun_fact}
            </p>
          </div>
        )}

        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 border-t border-stone-800/80">
          {credit && (
            <span className="truncate max-w-[200px]" title={credit}>
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

      {/* 7. Large Sticky Button at the Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent pt-4 pb-4 px-4 backdrop-blur-sm">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            disabled={isFinishing}
            onClick={handleNextAction}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] text-stone-950 font-bold text-base shadow-xl shadow-amber-950/60 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
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
                <span>Next Round ({round_no + 1}/5)</span>
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
          altText={caption || `Round ${round_no} archival photo`}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
};
