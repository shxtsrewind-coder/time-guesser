import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Maximize2, Flag, AlertCircle, Sparkles, MapPin, Calendar, Clock, HelpCircle } from 'lucide-react';
import { RoundInfo } from '../types.ts';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import { GuessMap } from './GuessMap.tsx';
import { ScoringInfoModal } from './ScoringInfoModal.tsx';

interface RoundScreenProps {
  roundNumber: number;
  totalRounds: number;
  runningScore: number;
  roundInfo: RoundInfo;
  onSubmitGuess: (guess: {
    year: number;
    lat?: number;
    lng?: number;
    weekday?: number;
  }) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

const MIN_YEAR = 1820;
const MAX_YEAR = 2025;
const DEFAULT_START_YEAR = 1950;

const WEEKDAYS = [
  { id: 0, label: 'Sun', full: 'Sunday' },
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
];

export const RoundScreen: React.FC<RoundScreenProps> = ({
  roundNumber,
  totalRounds,
  runningScore,
  roundInfo,
  onSubmitGuess,
  isSubmitting,
  errorMessage,
  onRetry,
}) => {
  const [guessYear, setGuessYear] = useState<number>(DEFAULT_START_YEAR);
  const [guessLat, setGuessLat] = useState<number | null>(null);
  const [guessLng, setGuessLng] = useState<number | null>(null);
  const [guessWeekday, setGuessWeekday] = useState<number | null>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isScoringInfoOpen, setIsScoringInfoOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [reportClicked, setReportClicked] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  // Reset inputs on round change
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setReportClicked(false);
    setGuessLat(null);
    setGuessLng(null);
    setGuessWeekday(null);
  }, [roundInfo.round_no, roundInfo.image_url]);

  const handleDecrement = () => {
    setGuessYear((prev) => Math.max(MIN_YEAR, prev - 1));
  };

  const handleIncrement = () => {
    setGuessYear((prev) => Math.min(MAX_YEAR, prev + 1));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuessYear(parseInt(e.target.value, 10));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      setGuessYear((prev) => Math.max(MIN_YEAR, prev - 10));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      setGuessYear((prev) => Math.min(MAX_YEAR, prev + 10));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setGuessYear(MIN_YEAR);
    } else if (e.key === 'End') {
      e.preventDefault();
      setGuessYear(MAX_YEAR);
    }
  };

  const calculateSliderBackground = () => {
    const percentage = ((guessYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
    return `linear-gradient(to right, #d97706 0%, #d97706 ${percentage}%, #292524 ${percentage}%, #292524 100%)`;
  };

  const decades = [1840, 1880, 1920, 1960, 2000];

  // Validation: check if all required inputs are set
  const isLocationComplete = !roundInfo.ask_location || (guessLat !== null && guessLng !== null);
  const isWeekdayComplete = !roundInfo.ask_weekday || guessWeekday !== null;
  const isReadyToLockIn = isLocationComplete && isWeekdayComplete && !isSubmitting;

  const handleSubmit = () => {
    if (!isReadyToLockIn) return;
    onSubmitGuess({
      year: guessYear,
      lat: roundInfo.ask_location && guessLat !== null ? guessLat : undefined,
      lng: roundInfo.ask_location && guessLng !== null ? guessLng : undefined,
      weekday: roundInfo.ask_weekday && guessWeekday !== null ? guessWeekday : undefined,
    });
  };

  // Missing requirements prompt
  const missingRequirements: string[] = [];
  if (roundInfo.ask_location && (guessLat === null || guessLng === null)) {
    missingRequirements.push('Drop a pin on the map');
  }
  if (roundInfo.ask_weekday && guessWeekday === null) {
    missingRequirements.push('Select a day of the week');
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 space-y-4 pb-12">
      {/* Top Meta Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-500">
              Round {roundNumber} of {totalRounds}
            </span>
            <div className="flex gap-1 items-center">
              {Array.from({ length: totalRounds }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx + 1 === roundNumber
                      ? 'w-5 bg-amber-400'
                      : idx + 1 < roundNumber
                      ? 'w-2.5 bg-amber-700/60'
                      : 'w-2 bg-stone-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsScoringInfoOpen(true)}
              className="text-stone-400 hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
              title="How scoring works"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden xs:inline">Scoring</span>
            </button>

            <div className="text-right">
              <div className="text-[10px] uppercase text-stone-500 font-semibold tracking-wider">Score</div>
              <div className="text-sm font-bold text-stone-100 tabular-nums font-mono">
                {runningScore.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={onRetry}
              className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-700 text-rose-100 text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Archival Photo Card */}
        <div className="relative group rounded-2xl overflow-hidden bg-stone-900/90 border border-stone-800 shadow-xl aspect-[4/3] flex items-center justify-center">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-stone-900 animate-pulse flex flex-col items-center justify-center gap-2 text-stone-600">
              <div className="w-8 h-8 rounded-full border-2 border-amber-600/30 border-t-amber-500 animate-spin" />
              <span className="text-xs font-serif-display tracking-widest uppercase">Retrieving Archive...</span>
            </div>
          )}

          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-stone-400 gap-2">
              <AlertCircle className="w-8 h-8 text-amber-500/80" />
              <p className="text-xs">Photograph preview could not be loaded.</p>
              <button
                onClick={() => {
                  setImageError(false);
                  setImageLoaded(false);
                }}
                className="text-xs text-amber-400 underline"
              >
                Reload Image
              </button>
            </div>
          ) : (
            <img
              src={roundInfo.image_url}
              alt="Archival historical photo to guess"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              onClick={() => setIsLightboxOpen(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer select-none ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Tap to zoom indicator */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label="Tap to zoom photo"
            className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 backdrop-blur-sm border border-stone-700/60 text-stone-300 hover:text-white text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-[11px]">Tap to Zoom</span>
          </button>
        </div>
      </div>

      {/* 1. MAP SECTION (if ask_location is true) */}
      {roundInfo.ask_location && (
        <div className="space-y-2 bg-stone-900/50 border border-stone-800/80 rounded-2xl p-3 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-stone-200">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>1. Guess Location</span>
            </div>
            {guessLat !== null && guessLng !== null ? (
              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Pin Dropped
              </span>
            ) : (
              <span className="text-[11px] text-amber-400 font-medium animate-pulse">
                Required · Tap to pin
              </span>
            )}
          </div>

          <GuessMap
            lat={guessLat}
            lng={guessLng}
            onChange={(lat, lng) => {
              setGuessLat(lat);
              setGuessLng(lng);
            }}
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* 2. YEAR SELECTOR SECTION (Always shown) */}
      <div className="space-y-3 bg-stone-900/50 border border-stone-800/80 rounded-2xl p-3.5 shadow-md">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-stone-200">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>{roundInfo.ask_location ? '2. Guess Year' : '1. Guess Year'}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            ✓ Year: {guessYear}
          </span>
        </div>

        {/* Large Year Display */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={guessYear <= MIN_YEAR || isSubmitting}
              aria-label="Decrement year by 1"
              className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700/80 hover:border-amber-500/60 text-stone-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="min-w-[150px] py-0.5 px-2 text-center">
              <span className="text-5xl font-black tracking-tight font-serif-display text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 drop-shadow-md select-none tabular-nums">
                {guessYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleIncrement}
              disabled={guessYear >= MAX_YEAR || isSubmitting}
              aria-label="Increment year by 1"
              className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700/80 hover:border-amber-500/60 text-stone-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-1.5 px-1">
          <div className="relative py-1">
            <input
              ref={sliderRef}
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={guessYear}
              onChange={handleSliderChange}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              style={{ background: calculateSliderBackground() }}
              className="year-slider"
              aria-label="Select guessed year"
              aria-valuemin={MIN_YEAR}
              aria-valuemax={MAX_YEAR}
              aria-valuenow={guessYear}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono select-none px-1">
            <span>{MIN_YEAR}</span>
            {decades.map((d) => (
              <span
                key={d}
                onClick={() => setGuessYear(d)}
                className={`cursor-pointer transition-colors ${
                  Math.abs(guessYear - d) < 10 ? 'text-amber-400 font-semibold' : 'hover:text-stone-300'
                }`}
              >
                {d}
              </span>
            ))}
            <span>{MAX_YEAR}</span>
          </div>
        </div>
      </div>

      {/* 3. WEEKDAY SELECTOR SECTION (if ask_weekday is true) */}
      {roundInfo.ask_weekday && (
        <div className="space-y-2.5 bg-stone-900/50 border border-stone-800/80 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-stone-200">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                {roundInfo.ask_location ? '3. Day of the Week' : '2. Day of the Week'}
              </span>
            </div>
            {guessWeekday !== null ? (
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                ✓ {WEEKDAYS.find((w) => w.id === guessWeekday)?.full} (+1,000 max)
              </span>
            ) : (
              <span className="text-[11px] text-amber-400 font-medium animate-pulse">
                Required · Choose day
              </span>
            )}
          </div>

          {/* Seven buttons Sun Mon Tue Wed Thu Fri Sat */}
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => {
              const isSelected = guessWeekday === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setGuessWeekday(day.id)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-stone-950 shadow-md shadow-amber-900/40 ring-2 ring-amber-300 scale-[1.03]'
                      : 'bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-stone-300 active:scale-95'
                  }`}
                >
                  <span>{day.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing Requirements Guidance */}
      {missingRequirements.length > 0 && (
        <div className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5">
          <span className="text-amber-500 font-medium">To submit:</span>
          <span>{missingRequirements.join(' and ')}</span>
        </div>
      )}

      {/* Lock in guess button */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          disabled={!isReadyToLockIn}
          onClick={handleSubmit}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-bold text-base shadow-lg shadow-amber-950/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
              <span>Verifying Guess...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-stone-950" />
              <span>Lock in Guess</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={() => setReportClicked(true)}
            className="text-[11px] text-stone-600 hover:text-stone-400 transition-colors flex items-center gap-1"
          >
            <Flag className="w-3 h-3 text-stone-600" />
            <span>{reportClicked ? 'Photo flagged for review · Thank you' : 'Report this photo'}</span>
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <PhotoLightbox
          imageUrl={roundInfo.image_url}
          altText={`Round ${roundNumber} historical photo`}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}

      {/* Scoring Info Modal */}
      <ScoringInfoModal
        isOpen={isScoringInfoOpen}
        onClose={() => setIsScoringInfoOpen(false)}
      />
    </div>
  );
};
