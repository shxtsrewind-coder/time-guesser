import React, { useState } from 'react';
import { X, Trophy, Compass, Check, ArrowRight, User, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { POPULAR_COUNTRIES, getUserCountry, setUserCountry } from '../lib/countryFlags.ts';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  currentDisplayName: string;
  onProfileSaved: (newName: string, countryCode: string) => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentDisplayName,
  onProfileSaved,
}) => {
  const [displayName, setDisplayName] = useState(currentDisplayName || 'Historian');
  const [selectedCountry, setSelectedCountry] = useState(() => getUserCountry().code);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCountryObj =
    POPULAR_COUNTRIES.find((c) => c.code === selectedCountry) || getUserCountry();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = displayName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a display name to appear on the leaderboard');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Save country preference locally and dispatch event
      setUserCountry(selectedCountry);

      // 2. Persist to Supabase if authenticated user exists
      if (userId) {
        await supabase
          .from('profiles')
          .update({
            display_name: trimmed,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }

      // 3. Mark welcome as completed in local storage
      localStorage.setItem('timeguess_onboarding_completed_v2', 'true');

      // 4. Update parent state
      onProfileSaved(trimmed, selectedCountry);
      onClose();
    } catch (err: any) {
      console.warn('Could not save profile to Supabase:', err);
      // Still allow local progress
      localStorage.setItem('timeguess_onboarding_completed_v2', 'true');
      onProfileSaved(trimmed, selectedCountry);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('timeguess_onboarding_completed_v2', 'true');
    const trimmed = displayName.trim() || currentDisplayName || 'Historian';
    setUserCountry(selectedCountry);
    onProfileSaved(trimmed, selectedCountry);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-[#141210] border border-amber-600/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-stone-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-850 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with Historical Badge */}
        <div className="text-center space-y-3 pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-600/40 text-amber-400 text-xs font-mono font-semibold tracking-wider uppercase">
            <Compass className="w-3.5 h-3.5" />
            <span>Historical Chronology &amp; Cartography</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 tracking-wide">
            Welcome to TimeGuess
          </h2>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            Examine authentic archival photographs from world collections. Decipher the year, map coordinates, and day of the week across five distinct historical eras.
          </p>
        </div>

        {/* Setup Form for Leaderboard: Name & Flag */}
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Trophy className="w-4 h-4" />
            <span>Leaderboard Registration</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Register your name and nation’s flag to record your scores and stand atop the global leaderboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name Input */}
            <div>
              <label
                htmlFor="welcome-display-name"
                className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono"
              >
                Historian Name
              </label>
              <div className="relative">
                <input
                  id="welcome-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={25}
                  placeholder="e.g. Amelia Earhart"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500 pl-9 transition-colors"
                />
                <User className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Country Flag Selector */}
            <div>
              <label
                htmlFor="welcome-country"
                className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono"
              >
                Country / National Flag
              </label>
              <div className="relative">
                <select
                  id="welcome-country"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500 appearance-none cursor-pointer pr-10"
                >
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-stone-900 text-stone-100">
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Live Leaderboard Badge Preview */}
            <div className="pt-1">
              <div className="text-[11px] font-mono text-stone-500 mb-1.5">
                Leaderboard Entry Preview:
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0e0c0a] border border-amber-600/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-amber-400 font-mono text-xs font-bold">#1</span>
                  <span className="text-xl" title={currentCountryObj.name}>
                    {currentCountryObj.flag}
                  </span>
                  <span className="text-xs font-bold text-stone-100 truncate">
                    {displayName.trim() || 'Historian'}
                  </span>
                  <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    You
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-bold text-amber-400">0</span>
                  <span className="text-[10px] text-stone-500 ml-1">pts</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl">
                {errorMsg}
              </p>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <span>Registering Historian...</span>
              ) : (
                <>
                  <span>Join Leaderboard &amp; Begin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info note */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors underline underline-offset-4 cursor-pointer"
          >
            Continue as guest (can change anytime in Profile)
          </button>
        </div>
      </div>
    </div>
  );
};
