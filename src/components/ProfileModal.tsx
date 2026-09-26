import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Check,
  Zap,
  Crown,
  RefreshCw,
  AlertCircle,
  Flame,
  ShieldCheck,
  Sparkles,
  LogIn,
  LogOut,
} from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import {
  getLocalAdFreeStatus,
  restorePurchases,
  getAdFreePurchaseDate,
} from '../lib/monetization.ts';
import {
  getUserCountryCode,
  setUserCountry,
  codeToFlagEmoji,
} from '../lib/countryFlags.ts';
import { CountrySelect } from './CountrySelect.tsx';
import {
  getStreakData,
  isDailyCompletedToday,
  getTimeUntilNextDaily,
  StreakData,
} from '../lib/streak.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  isAnonymous: boolean;
  currentDisplayName: string;
  onDisplayNameUpdated: (newName: string) => void;
  onOpenRemoveAds: () => void;
  onOpenAuthModal?: (mode: 'choice' | 'save_progress' | 'signup' | 'login') => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  isAnonymous,
  currentDisplayName,
  onDisplayNameUpdated,
  onOpenRemoveAds,
  onOpenAuthModal,
  userEmail,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [selectedCountry, setSelectedCountry] = useState<string>(() => getUserCountryCode() || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  const [streakData, setStreakData] = useState<StreakData>(getStreakData);
  const [isCompletedToday, setIsCompletedToday] = useState(isDailyCompletedToday);
  const [countdown, setCountdown] = useState(() => getTimeUntilNextDaily().formatted);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentDisplayName);
      setSelectedCountry(getUserCountryCode() || '');
      setErrorMsg(null);
    }
  }, [isOpen, currentDisplayName]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilNextDaily().formatted);
      setIsCompletedToday(isDailyCompletedToday());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isAdFree = getLocalAdFreeStatus();
  const purchaseDate = getAdFreePurchaseDate();

  if (!isOpen) return null;

  const currentFlag = codeToFlagEmoji(selectedCountry);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const trimmed = displayName.trim();
    if (!trimmed) {
      setErrorMsg('Display name cannot be empty');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const countryCodeToSave = selectedCountry ? selectedCountry.toUpperCase() : null;

      // Update display_name
      const { error: nameError } = await supabase
        .from('profiles')
        .update({
          display_name: trimmed,
        })
        .eq('id', userId);

      if (nameError) {
        if (nameError.code === '23505' || nameError.message?.toLowerCase().includes('unique')) {
          setErrorMsg('That name is taken, try another');
          setSaving(false);
          return;
        }
        throw nameError;
      }

      // Also update country_code
      const { error: countryError } = await supabase
        .from('profiles')
        .update({
          country_code: countryCodeToSave,
        })
        .eq('id', userId);

      if (countryError) {
        throw countryError;
      }

      setUserCountry(countryCodeToSave);
      onDisplayNameUpdated(trimmed);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    setRestoreMsg(null);
    const res = await restorePurchases(userId);
    setRestoring(false);
    setRestoreMsg(res.message);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2.5 text-stone-200">
            <User className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold font-cinzel tracking-tight flex items-center gap-2">
              <span>Player Profile</span>
              {currentFlag && <span className="text-base select-none">{currentFlag}</span>}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            aria-label="Close profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Streak & Historical Record Card */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-cinzel">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Daily Puzzle Streak</span>
            </div>
            {isCompletedToday ? (
              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Solved Today
              </span>
            ) : (
              <span className="text-[11px] font-mono text-amber-400 font-semibold">
                Available Now
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#141210] p-2.5 rounded-xl border border-stone-800">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">Current</span>
              <span className="text-lg font-bold font-mono text-amber-300">
                {streakData.currentStreak} <span className="text-[10px] text-stone-400 font-normal">d</span>
              </span>
            </div>
            <div className="bg-[#141210] p-2.5 rounded-xl border border-stone-800">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">Best</span>
              <span className="text-lg font-bold font-mono text-stone-200">
                {streakData.maxStreak} <span className="text-[10px] text-stone-400 font-normal">d</span>
              </span>
            </div>
            <div className="bg-[#141210] p-2.5 rounded-xl border border-stone-800">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">Total</span>
              <span className="text-lg font-bold font-mono text-stone-200">
                {streakData.totalCompleted || streakData.completedDates.length}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-0.5 border-t border-stone-800/60 font-mono">
            <span>Next Daily Puzzle:</span>
            <span className="text-amber-400 font-bold">{countdown}</span>
          </div>
        </div>

        {/* Ad-Free Status Block */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">Supporter Status</span>
            {isAdFree ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono">
                <Crown className="w-3 h-3 fill-amber-400" />
                Supporter Active
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-stone-400 bg-stone-900 px-2.5 py-0.5 rounded-full border border-stone-800 font-mono">
                Free Mode
              </span>
            )}
          </div>

          {isAdFree ? (
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Ads are removed. {purchaseDate ? `Active since: ${purchaseDate}` : ''}
            </p>
          ) : (
            <div className="pt-1.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRemoveAds();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-stone-950" />
                <span>Remove Ads ($2.99)</span>
              </button>

              <button
                type="button"
                onClick={handleRestorePurchases}
                disabled={restoring}
                className="py-2 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-300 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Restore previous purchase"
              >
                <RefreshCw className={`w-3 h-3 ${restoring ? 'animate-spin text-amber-400' : ''}`} />
                <span>Restore</span>
              </button>
            </div>
          )}

          {restoreMsg && (
            <p className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-900/50">
              {restoreMsg}
            </p>
          )}
        </div>

        {/* Display name & Country form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
              Leaderboard Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setErrorMsg(null);
              }}
              maxLength={20}
              minLength={2}
              placeholder="e.g. ChronoScout"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
            />
          </div>

          {/* Searchable country dropdown */}
          <CountrySelect
            value={selectedCountry}
            onChange={(code) => setSelectedCountry(code)}
            label="Nationality / Flag"
          />

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <span>Saving Changes...</span>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-stone-950" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </form>

        {/* Account / Play Choice Section */}
        <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
          {isAnonymous ? (
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal?.('choice');
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 hover:text-amber-300 font-mono uppercase tracking-wider cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Guest Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal?.('choice');
                  }}
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60 cursor-pointer transition-colors"
                >
                  Change Mode
                </button>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed">
                Currently playing as guest. Your scores stay on this device only.
              </p>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal?.('choice');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-700/80 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>How do you want to play?</span>
              </button>
            </div>
          ) : (
            <div className="bg-stone-950/80 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-mono">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Member Account</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/60">
                  Active
                </span>
              </div>

              {userEmail && (
                <p className="text-[11px] text-stone-400 font-mono truncate">
                  Logged in as <span className="text-stone-200">{userEmail}</span>
                </p>
              )}

              {onSignOut && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-stone-200 text-xs font-medium border border-stone-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out (Switch to Guest)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
