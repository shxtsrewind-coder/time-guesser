import React, { useState } from 'react';
import { ArrowRight, Trophy, ExternalLink, Sparkles, CheckCircle2, Maximize2, MapPin, Calendar, Clock } from 'lucide-react';
import { SubmitGuessResponse } from '../types.ts';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import { ResultMap } from './ResultMap.tsx';

interface RoundResultScreenProps {
  roundResult: SubmitGuessResponse;
  imageUrl: string;
  onProceed: () => void;
  isLastRound: boolean;
  isLoadingNext: boolean;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const RoundResultScreen: React.FC<RoundResultScreenProps> = ({
  roundResult,
  imageUrl,
  onProceed,
  isLastRound,
  isLoadingNext,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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
    caption,
    fun_fact,
    credit,
    source_url,
    license,
  } = roundResult;

  const MIN_YEAR = 1820;
  const MAX_YEAR = 2025;
  const guessPercent = Math.min(100, Math.max(0, ((guess_year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100));
  const truePercent = Math.min(100, Math.max(0, ((true_year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100));
  
  const minPercent = Math.min(guessPercent, truePercent);
  const maxPercent = Math.max(guessPercent, truePercent);
  const deltaWidth = Math.max(2, maxPercent - minPercent);

  const hasLocation = actual_lat !== null && actual_lng !== null && guess_lat !== null && guess_lng !== null;
  const hasWeekday = weekday_score !== null || actual_weekday_name !== null || guess_weekday !== null;

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 py-4 space-y-4 pb-12 transition-all ${
        hasLocation ? 'max-w-5xl' : 'max-w-xl'
      }`}
    >
      {/* Primary Score Breakdown */}
      <div className="bg-[#141210] border border-stone-800 rounded-3xl p-5 shadow-xl text-center space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="font-semibold text-amber-400 font-cinzel">Round {round_no} Summary</span>
          <span className="font-mono tabular-nums">Total: {total_score.toLocaleString()} pts</span>
        </div>

        <div className="py-1">
          <div className="text-4xl font-black text-amber-300 font-cinzel tracking-tight flex items-center justify-center gap-2">
            <span>+{score.toLocaleString()}</span>
            <span className="text-xs font-sans uppercase font-bold text-amber-500/80 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40 font-mono">
              / {round_max?.toLocaleString() || '5,000'} pts
            </span>
          </div>
          {taken_on && (
            <div className="text-xs text-stone-300 pt-1 flex items-center justify-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Captured: <strong className="text-amber-200">{taken_on}</strong>
                {actual_weekday_name && ` (${actual_weekday_name})`}
              </span>
            </div>
          )}
        </div>

        {/* Three Score Lines */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-3.5 space-y-2 text-xs text-left">
          {hasLocation && location_score !== null && (
            <div className="flex items-center justify-between py-1 border-b border-stone-800/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300 font-medium">Location</span>
                {distance_km !== null && (
                  <span className="text-[11px] text-stone-500 font-mono">
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

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-stone-300 font-medium">Year</span>
              <span className="text-[11px] text-stone-500 font-mono">
                ({difference === 0 ? 'Exact' : `Off by ${difference} ${difference === 1 ? 'yr' : 'yrs'}`})
              </span>
            </div>
            <div className="font-mono font-bold text-stone-100 tabular-nums">
              <span className="text-amber-400">{(year_score ?? score).toLocaleString()}</span>
              <span className="text-stone-500"> / 5,000</span>
            </div>
          </div>

          {hasWeekday && weekday_score !== null && (
            <div className="flex items-center justify-between py-1 border-t border-stone-800/60">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300 font-medium">Day of Week</span>
                {guess_weekday !== null && actual_weekday_name && (
                  <span className="text-[11px] text-stone-500 font-mono">
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

      {/* Photo and Result Map: Side by side when location was asked */}
      {hasLocation ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Photo */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-stone-200 font-cinzel">Archival Evidence</span>
              <span className="text-[11px] text-stone-500">Record</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-[#141210] border border-stone-800 shadow-md h-[280px] sm:h-[320px]">
              <img
                src={imageUrl}
                alt={caption || 'Archival photo result'}
                referrerPolicy="no-referrer"
                onClick={() => setIsLightboxOpen(true)}
                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
              />
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-stone-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Enlarge</span>
              </button>
            </div>
          </div>

          {/* Result Map */}
          <div className="flex flex-col space-y-1.5">
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
            <div className="h-[280px] sm:h-[320px]">
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
        /* Photo when no location asked */
        <div className="relative rounded-2xl overflow-hidden bg-[#141210] border border-stone-800 shadow-md aspect-[16/10] max-h-64">
          <img
            src={imageUrl}
            alt={caption || 'Archival photo result'}
            referrerPolicy="no-referrer"
            onClick={() => setIsLightboxOpen(true)}
            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-stone-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Enlarge</span>
          </button>
        </div>
      )}

      {/* Year Timeline */}
      <div className="bg-[#141210] border border-stone-800 rounded-2xl p-4 space-y-3">
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

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block font-mono">
              You Guessed
            </span>
            <span className="text-2xl font-black font-cinzel text-amber-400 font-mono">
              {guess_year}
            </span>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300/80 block font-mono">
              Actual Year
            </span>
            <span className="text-2xl font-black font-cinzel text-emerald-400 font-mono">
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

      {/* Archival Context, Fun Fact & Credit */}
      <div className="bg-[#141210]/90 border border-stone-800 rounded-2xl p-4 space-y-3">
        {caption && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
              Photo Record
            </span>
            <p className="text-xs text-stone-200 leading-relaxed font-medium">
              {caption}
            </p>
          </div>
        )}

        {fun_fact && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Historical Context</span>
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
              <span>View Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Next Button */}
      <div className="pt-2">
        <button
          type="button"
          disabled={isLoadingNext}
          onClick={onProceed}
          className="w-full py-4 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-base shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
        >
          {isLoadingNext ? (
            <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
          ) : isLastRound ? (
            <>
              <span>See Final Results</span>
              <Trophy className="w-5 h-5" />
            </>
          ) : (
            <>
              <span>Next Round ({round_no + 1}/5)</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <PhotoLightbox
          imageUrl={imageUrl}
          altText={caption || `Round ${round_no} result photo`}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
};
