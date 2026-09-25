import React, { useState } from 'react';
import { ArrowRight, Trophy, ExternalLink, Sparkles, CheckCircle2, Maximize2, MapPin, Calendar, Clock, Navigation } from 'lucide-react';
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

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4 pb-12">
      {/* Primary Score & Round Header */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl text-center space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="font-semibold text-amber-400">Round {round_no} Breakdown</span>
          <span className="font-mono tabular-nums">Total: {total_score.toLocaleString()} pts</span>
        </div>

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

        {/* THREE SCORE LINES: Location X/5000, Year X/5000, Day of week X/1000 */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-xl p-3 space-y-2 text-xs">
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
                ({difference === 0 ? 'Exact' : `Off by ${difference} ${difference === 1 ? 'yr' : 'yrs'}`})
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

      {/* MAP RESULT (if location was guessed) */}
      {hasLocation && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-stone-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Geographic Accuracy
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

      {/* YEAR TIMELINE & COMPARISON */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Chronological Accuracy
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

        {/* Visual Timeline Bar */}
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

      {/* Photo with zoom */}
      <div className="relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-md aspect-[16/10] max-h-56">
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
          className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 backdrop-blur-sm text-stone-300 hover:text-white text-[10px] flex items-center gap-1"
        >
          <Maximize2 className="w-3 h-3 text-amber-400" />
          <span>Enlarge Photo</span>
        </button>
      </div>

      {/* Archival Context, Fun Fact & Credit */}
      <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 space-y-3">
        {caption && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Photo Record
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
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline transition-colors"
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
          className="w-full py-4 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-base shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
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
