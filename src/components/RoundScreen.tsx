import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Maximize2, Flag, AlertCircle, Sparkles, MapPin, Calendar, Clock, HelpCircle, Eye } from 'lucide-react';
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
  const [isMapExpanded, setIsMapExpanded] = useState(false);

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
    setIsMapExpanded(false);
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
    <div className="w-full max-w-6xl mx-auto px-3.5 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-20 sm:pb-16">
      {/* Top Meta Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 sm:pb-3 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 font-mono shrink-0">
              Round {roundNumber} of {totalRounds}
            </span>
            <div className="flex gap-1 sm:gap-1.5 items-center">
              {Array.from({ length: totalRounds }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx + 1 === roundNumber
                      ? 'w-5 sm:w-6 bg-amber-400 shadow-sm shadow-amber-400/50'
                      : idx + 1 < roundNumber
                      ? 'w-2 sm:w-2.5 bg-cyan-500/80'
                      : 'w-2 bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setIsScoringInfoOpen(true)}
              className="text-slate-400 hover:text-cyan-400 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="How scoring works"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400/90" />
              <span className="hidden xs:inline">Scoring Rules</span>
            </button>

            <div className="text-right">
              <span className="text-[11px] sm:text-xs text-slate-400">Score </span>
              <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums font-mono">
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

      {/* Main Section: When ask_location is true, image and map stand together on BOTH mobile and desktop! */}
      {roundInfo.ask_location ? (
        <div className="space-y-3 sm:space-y-4">
          {/* Photo & Map: Stood together! Side-by-side on md+, stacked on mobile with expand affordance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 items-stretch">
            {/* Left: Archival Photograph Showcase */}
            <div className="relative group rounded-2xl overflow-hidden bg-[#0b1120] border border-slate-800 shadow-xl h-[200px] xs:h-[220px] sm:h-[280px] md:h-[440px] flex items-center justify-center">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-[#0b1120] animate-pulse flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-7 h-7 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                </div>
              )}

              {imageError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 gap-2">
                  <AlertCircle className="w-7 h-7 text-amber-500" />
                  <button
                    onClick={() => {
                      setImageError(false);
                      setImageLoaded(false);
                    }}
                    className="text-xs text-amber-400 underline cursor-pointer"
                  >
                    Reload
                  </button>
                </div>
              ) : (
                <img
                  src={roundInfo.image_url}
                  alt="Archival photograph"
                  referrerPolicy="no-referrer"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  onClick={() => setIsLightboxOpen(true)}
                  className={`w-full h-full object-cover select-none cursor-pointer transition-all duration-300 ${
                    imageLoaded ? 'opacity-100 animate-photo-reveal' : 'opacity-0'
                  }`}
                />
              )}

              {/* Report affordance */}
              <button
                type="button"
                onClick={() => setReportClicked(true)}
                title="Report issue with photo"
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3 h-3" />
                {reportClicked && <span>Reported</span>}
              </button>

              {/* Zoom button */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                aria-label="Enlarge photo"
                className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 backdrop-blur-md border border-slate-750 text-slate-200 hover:text-white text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-xs">Zoom</span>
              </button>
            </div>

            {/* Right: Map Stand (Docked below photo on mobile, side-by-side on desktop) */}
            <div
              className={`transition-all duration-200 ${
                isMapExpanded
                  ? 'h-[380px] xs:h-[420px] sm:h-[460px] md:h-[440px]'
                  : 'h-[210px] xs:h-[230px] sm:h-[280px] md:h-[440px]'
              }`}
            >
              <GuessMap
                lat={guessLat}
                lng={guessLng}
                onChange={(lat, lng) => {
                  setGuessLat(lat);
                  setGuessLng(lng);
                }}
                disabled={isSubmitting}
                isExpanded={isMapExpanded}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
              />
            </div>
          </div>

          {/* Controls Below: Year Slider & Weekday Picker & Lock In Guess */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch pt-1">
            {/* Year Selector (always shown) */}
            <div className={`space-y-2 bg-[#0b1120]/95 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-md ${
              roundInfo.ask_weekday ? 'md:col-span-6 lg:col-span-6' : 'md:col-span-8'
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Estimated Year</span>
              </div>

              {/* Large Year Number Display */}
              <div className="text-center py-0.5">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={guessYear <= MIN_YEAR || isSubmitting}
                    aria-label="Decrement year by 1"
                    className="w-9 h-9 rounded-full bg-slate-900 border border-slate-750 hover:border-amber-500/60 text-slate-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
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
                    className="w-9 h-9 rounded-full bg-slate-900 border border-slate-750 hover:border-amber-500/60 text-slate-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
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

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono select-none px-1">
                  <span>{MIN_YEAR}</span>
                  {decades.map((d) => (
                    <span
                      key={d}
                      onClick={() => setGuessYear(d)}
                      className={`cursor-pointer transition-colors ${
                        Math.abs(guessYear - d) < 10 ? 'text-amber-400 font-semibold' : 'hover:text-slate-300'
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
              <div className="space-y-2.5 bg-[#0b1120]/95 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-md md:col-span-6 lg:col-span-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Day of Week</span>
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
                        className={`py-2 px-0 rounded-lg xs:rounded-xl text-[10px] xs:text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer min-w-0 ${
                          isSelected
                            ? 'bg-gradient-to-b from-purple-500 to-indigo-600 text-white shadow-md shadow-indigo-950/50 ring-2 ring-purple-300 scale-[1.03]'
                            : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white active:scale-95'
                        }`}
                      >
                        <span className="truncate">{day.label}</span>
                      </button>
                    );
                  })}
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
                className="w-full py-3.5 sm:py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-bold text-base shadow-xl shadow-amber-950/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Lock In Guess</span>
                  </>
                )}
              </button>

              {missingRequirements.length > 0 && (
                <div className="text-[11px] text-slate-400 text-center">
                  <span className="text-amber-400 font-medium">To submit: </span>
                  {roundInfo.ask_location && (guessLat === null || guessLng === null) ? (
                    <span className="text-cyan-400">place pin on map</span>
                  ) : null}
                  {roundInfo.ask_location && (guessLat === null || guessLng === null) && roundInfo.ask_weekday && guessWeekday === null ? ' and ' : ''}
                  {roundInfo.ask_weekday && guessWeekday === null ? (
                    <span className="text-purple-300 font-medium">choose day of week</span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* When ask_location is false: Photo on Left (7 cols), Controls on Right (5 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="relative group rounded-3xl overflow-hidden bg-[#0b1120] border border-slate-800 shadow-2xl aspect-[4/3] flex items-center justify-center">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-[#0b1120] animate-pulse flex flex-col items-center justify-center gap-2.5 text-slate-500">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                </div>
              )}

              {imageError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 gap-2">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <button
                    onClick={() => {
                      setImageError(false);
                      setImageLoaded(false);
                    }}
                    className="text-xs text-amber-400 underline cursor-pointer"
                  >
                    Reload
                  </button>
                </div>
              ) : (
                <img
                  src={roundInfo.image_url}
                  alt="Archival photograph"
                  referrerPolicy="no-referrer"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  onClick={() => setIsLightboxOpen(true)}
                  className={`w-full h-full object-cover transition-all duration-300 cursor-pointer select-none ${
                    imageLoaded ? 'opacity-100 animate-photo-reveal' : 'opacity-0'
                  }`}
                />
              )}

              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                aria-label="Zoom photo"
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 backdrop-blur-md border border-slate-750 text-slate-200 hover:text-white text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-xs">Zoom</span>
              </button>
            </div>

            <div className="flex items-center justify-end text-xs text-slate-400 px-1">
              <button
                type="button"
                onClick={() => setReportClicked(true)}
                className="hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3 h-3 text-slate-500" />
                <span>{reportClicked ? 'Photo reported' : 'Report photo'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Year Selector */}
            <div className="space-y-3 bg-[#0b1120]/95 border border-slate-800 rounded-3xl p-5 shadow-md">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Estimated Year</span>
              </div>

              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={guessYear <= MIN_YEAR || isSubmitting}
                    aria-label="Decrement year by 1"
                    className="w-10 h-10 rounded-full bg-slate-900 border border-slate-750 hover:border-amber-500/60 text-slate-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
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
                    className="w-10 h-10 rounded-full bg-slate-900 border border-slate-750 hover:border-amber-500/60 text-slate-200 hover:text-amber-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shadow-sm cursor-pointer"
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

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono select-none px-1">
                  <span>{MIN_YEAR}</span>
                  {decades.map((d) => (
                    <span
                      key={d}
                      onClick={() => setGuessYear(d)}
                      className={`cursor-pointer transition-colors ${
                        Math.abs(guessYear - d) < 10 ? 'text-amber-400 font-semibold' : 'hover:text-slate-300'
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
              <div className="space-y-2.5 bg-[#0b1120]/95 border border-slate-800 rounded-3xl p-4 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Day of Week</span>
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
                            ? 'bg-gradient-to-b from-purple-500 to-indigo-600 text-white shadow-md shadow-indigo-950/50 ring-2 ring-purple-300 scale-[1.03]'
                            : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white active:scale-95'
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
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-bold text-base shadow-xl shadow-amber-950/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Lock In Guess</span>
                  </>
                )}
              </button>

              {missingRequirements.length > 0 && (
                <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-0.5">
                  <span className="text-amber-400 font-medium">Required:</span>
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
