import React, { useState } from 'react';
import { X, User, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  isAnonymous: boolean;
  currentDisplayName: string;
  onDisplayNameUpdated: (newName: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  isAnonymous,
  currentDisplayName,
  onDisplayNameUpdated,
}) => {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      onDisplayNameUpdated(trimmed);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update display name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-200">
            <User className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold tracking-tight">Player Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 transition-colors"
            aria-label="Close profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notice */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-xl p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Account Status:</span>
            <span className="text-amber-400 font-medium">
              {isAnonymous ? 'Guest / Anonymous' : 'Signed In'}
            </span>
          </div>
          <p className="text-stone-500 leading-relaxed pt-1">
            {isAnonymous
              ? 'Only registered (non-anonymous) players appear on global leaderboards. Full sign-in is coming soon!'
              : 'You are signed in and eligible for leaderboard ranking.'}
          </p>
        </div>

        {/* Display name form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setErrorMsg(null);
              }}
              maxLength={24}
              placeholder="e.g. ChronoScout"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2 rounded-lg">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span>Saving...</span>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-stone-950" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Name</span>
              )}
            </button>
          </div>
        </form>

        {/* Sign in placeholder button */}
        <div className="pt-2 border-t border-stone-800/80">
          <button
            type="button"
            onClick={() => {
              alert('Sign In is a placeholder for now. Stay tuned for Google & Email sign-in!');
            }}
            className="w-full py-2 px-3 rounded-xl border border-stone-700 hover:border-stone-600 bg-stone-800/50 text-stone-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Sign in (Placeholder)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
