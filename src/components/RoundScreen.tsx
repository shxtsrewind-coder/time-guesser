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
    return `linear-gradient(to right, #d97706 0%, #d97706 ${percentage}%, #262320 ${percentage}%, #262320 100%)`;
  };

  const decades = [1840, 1880, 1920, 1960, 2000];

  // Requirements checks
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

  const missingRequirements: string[] = [];
  if (roundInfo.ask_location && (guessLat === null || guessLng === null)) {
    missingRequirements.push('pin the location on the map');
  }
  if (roundInfo.ask_weekday && guessWeekday === null) {
    missingRequirements.push('choose the day of the week');
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-4 pb-16">
      {/* Top Meta Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-500 font-mono">
              Round {roundNumber} of {totalRounds}
            </span>
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: totalRounds }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx + 1 === roundNumber
                      ? 'w-6 bg-amber-400'
                      : idx + 1 < roundNumber
                      ? 'w-2.5 bg-amber-600/70'
                      : 'w-2 bg-stone-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsScoringInfoOpen(true)}
              className="text-stone-400 hover:text-amber-400 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="How scoring works"
            >
              <HelpCircle className="w-4 h-4 text-amber-500/80" />
              <span className="hidden xs:inline">Scoring Rules</span>
            </button>

            <div className="text-right">
              <span className="text-xs text-stone-400">Score </span>
              <span className="text-sm font-bold text-stone-100 tabular-nums font-mono">
                {runningScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={onRetry}
              className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-700 text-rose-100 text-xs font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Main Section: When ask_location is true, image and map stand SIDE BY SIDE! */}
      {roundInfo.ask_location ? (
        <div className="space-y-4">
          {/* SIDE-BY-SIDE: Image on the Left, Map on the Right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-stretch">
            {/* Left: Archival Photograph Showcase */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold text-stone-200 flex items-center gap-1.5 font-cinzel">
                  Archival Evidence
                </span>
                <span className="text-[11px] text-stone-400">Examine details & clues</span>
              </div>

              <div className="relative group rounded-3xl overflow-hidden bg-[#141210] border border-stone-800 shadow-xl h-[320px] sm:h-[380px] md:h-[440px] flex items-center justify-center">
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 bg-[#141210] animate-pulse flex flex-col items-center justify-center gap-2.5 text-stone-500">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                    <span className="text-xs font-cinzel tracking-widest uppercase">
                      Retrieving Archive...
                    </span>
                  </div>
                )}

                {imageError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-stone-400 gap-2">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                    <p className="text-xs">Photograph preview could not be loaded.</p>
                    <button
                      onClick={() => {
                        setImageError(false);
                        setImageLoaded(false);
                      }}
                      className="text-xs text-amber-400 underline cursor-pointer"
                    >
                      Reload Image
                    </button>
                  </div>
                ) : (
                  <img
                    src={roundInfo.image_url}
                    alt="Historical archival photograph"
                    referrerPolicy="no-referrer"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    onClick={() => setIsLightboxOpen(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer select-none ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )}

                {/* Zoom button */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="Zoom photo"
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 backdrop-blur-md border border-stone-700/80 text-stone-200 hover:text-white text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium text-xs">Zoom & Inspect</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 pt-0.5">
                <span>Tip: Look for vehicles, signs, and architecture</span>
                <button
                  type="button"
                  onClick={() => setReportClicked(true)}
                  className="hover:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="w-3 h-3 text-stone-600" />
                  <span>{reportClicked ? 'Photo reported' : 'Report photo'}</span>
                </button>
              </div>
            </div>

            {/* Right: Map Stand Side-by-Side */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-1.5 font-semibold text-stone-200 font-cinzel">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Geographic Pin</span>
                </div>
                {guessLat !== null && guessLng !== null ? (
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                    ✓ Pin Placed
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    Required · Click map to drop pin
                  </span>
                )}
              </div>

              <div className="h-[320px] sm:h-[380px] md:h-[440px]">
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

              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 pt-0.5">
                <span>Pan or use region tabs · Drag pin to refine</span>
                {guessLat !== null && guessLng !== null && (
                  <span className="text-emerald-400/90 font-mono font-medium">Ready</span>
                )}
              </div>
            </div>
          </div>

          {/* Controls Below: Year Slider & Weekday Picker & Lock In Guess */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch pt-1">
            {/* Year Selector (always shown) */}
            <div className={`space-y-3 bg-[#141210]/95 border border-stone-800 rounded-3xl p-4 shadow-md ${
              roundInfo.ask_weekday ? 'md:col-span-6 lg:col-span-6' : 'md:col-span-8'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-stone-200">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Chronological Year</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  ✓ {guessYear}
                </span>
              </div>

              {/* Large Year Number Display */}
              <div className="text-center py-0.5">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={guessYear <= MIN_YEAR || isSubmitting}
                    aria-label="Decrement year by 1"
                    className="w-9 h-9 rounded-full bg-stone-900 border border-stone-700/80 hover:border-amber-500/60 text-stone-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="min-w-[130px] text-center select-none">
                    <span className="text-4xl sm:text-5xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 tabular-nums font-mono drop-shadow-md">
                      {guessYear}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={guessYear >= MAX_YEAR || isSubmitting}
                    aria-label="Increment year by 1"
                    className="w-9 h-9 rounded-full bg-stone-900 border border-stone-700/80 hover:border-amber-500/60 text-stone-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Year Slider */}
              <div className="space-y-1 px-1">
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

            {/* Weekday Selector (if ask_weekday is true) */}
            {roundInfo.ask_weekday && (
              <div className="space-y-2.5 bg-[#141210]/95 border border-stone-800 rounded-3xl p-4 shadow-md md:col-span-6 lg:col-span-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-200">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Day of Week</span>
                  </div>
                  {guessWeekday !== null ? (
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      ✓ {WEEKDAYS.find((w) => w.id === guessWeekday)?.label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400/90 font-medium">
                      Required
                    </span>
                  )}
                </div>

                {/* 7 Segmented Buttons: Sun Mon Tue Wed Thu Fri Sat */}
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((day) => {
                    const isSelected = guessWeekday === day.id;
                    return (
                      <button
                        key={day.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setGuessWeekday(day.id)}
                        className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-stone-950 shadow-md shadow-amber-950/50 ring-2 ring-amber-300 scale-[1.03]'
                            : 'bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-white active:scale-95'
                        }`}
                      >
                        <span>{day.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[10px] text-stone-500 text-center font-mono">
                  +1,000 pt calendar precision bonus
                </div>
              </div>
            )}

            {/* Lock In Guess CTA */}
            <div className={`space-y-2 flex flex-col justify-center ${
              roundInfo.ask_weekday ? 'md:col-span-12 lg:col-span-3' : 'md:col-span-4'
            }`}>
              <button
                type="button"
                disabled={!isReadyToLockIn}
                onClick={handleSubmit}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-bold text-base shadow-xl shadow-amber-950/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-stone-950" />
                    <span>Lock In Guess</span>
                  </>
                )}
              </button>

              {missingRequirements.length > 0 && (
                <div className="text-[11px] text-stone-400 text-center">
                  <span className="text-amber-500 font-medium">To submit: </span>
                  <span>{missingRequirements.join(' and ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* When ask_location is false: Photo on Left (7 cols), Controls on Right (5 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="relative group rounded-3xl overflow-hidden bg-[#141210] border border-stone-800 shadow-2xl aspect-[4/3] flex items-center justify-center">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-[#141210] animate-pulse flex flex-col items-center justify-center gap-2.5 text-stone-500">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                  <span className="text-xs font-cinzel tracking-widest uppercase">
                    Retrieving Archive...
                  </span>
                </div>
              )}

              {imageError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-stone-400 gap-2">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <p className="text-xs">Photograph preview could not be loaded.</p>
                  <button
                    onClick={() => {
                      setImageError(false);
                      setImageLoaded(false);
                    }}
                    className="text-xs text-amber-400 underline cursor-pointer"
                  >
                    Reload Image
                  </button>
                </div>
              ) : (
                <img
                  src={roundInfo.image_url}
                  alt="Historical archival photograph"
                  referrerPolicy="no-referrer"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  onClick={() => setIsLightboxOpen(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer select-none ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}

              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                aria-label="Zoom photo"
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 backdrop-blur-md border border-stone-700/80 text-stone-200 hover:text-white text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-xs">Zoom & Inspect</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 px-1">
              <span>Clues: Examine architecture, clothing fashion, vehicles, and signage.</span>
              <button
                type="button"
                onClick={() => setReportClicked(true)}
                className="hover:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3 h-3 text-stone-600" />
                <span>{reportClicked ? 'Photo reported' : 'Report photo'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Year Selector */}
            <div className="space-y-3 bg-[#141210]/95 border border-stone-800 rounded-3xl p-5 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-stone-200">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>1. Guess Year</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  ✓ Year {guessYear}
                </span>
              </div>

              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={guessYear <= MIN_YEAR || isSubmitting}
                    aria-label="Decrement year by 1"
                    className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700/80 hover:border-amber-500/60 text-stone-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="min-w-[140px] text-center select-none">
                    <span className="text-5xl sm:text-6xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 tabular-nums font-mono drop-shadow-md">
                      {guessYear}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={guessYear >= MAX_YEAR || isSubmitting}
                    aria-label="Increment year by 1"
                    className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700/80 hover:border-amber-500/60 text-stone-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

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

            {/* Weekday Selector */}
            {roundInfo.ask_weekday && (
              <div className="space-y-2.5 bg-[#141210]/95 border border-stone-800 rounded-3xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-200">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>2. Day of the Week</span>
                  </div>
                  {guessWeekday !== null ? (
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      ✓ {WEEKDAYS.find((w) => w.id === guessWeekday)?.full}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400/90 font-medium">
                      Required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const isSelected = guessWeekday === day.id;
                    return (
                      <button
                        key={day.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setGuessWeekday(day.id)}
                        className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-stone-950 shadow-md shadow-amber-950/50 ring-2 ring-amber-300 scale-[1.03]'
                            : 'bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 hover:text-white active:scale-95'
                        }`}
                      >
                        <span>{day.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lock In Guess */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={!isReadyToLockIn}
                onClick={handleSubmit}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-bold text-base shadow-xl shadow-amber-950/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Coordinates...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-stone-950" />
                    <span>Lock in Guess</span>
                  </>
                )}
              </button>

              {missingRequirements.length > 0 && (
                <div className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5 pt-0.5">
                  <span className="text-amber-500 font-medium">Required:</span>
                  <span>Please {missingRequirements.join(' and ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <PhotoLightbox
          imageUrl={roundInfo.image_url}
          altText={`Round ${roundNumber} archival photo`}
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
