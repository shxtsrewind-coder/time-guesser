import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Trophy,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { validateDisplayNameFormat, checkDisplayNameTaken } from '../lib/authHelpers.ts';
import { CountrySelect } from './CountrySelect.tsx';
import { getUserCountryCode, setUserCountry } from '../lib/countryFlags.ts';

export type AuthModalMode = 'choice' | 'save_progress' | 'signup' | 'login';

interface SaveProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  currentDisplayName: string;
  isAnonymous: boolean;
  initialMode?: AuthModalMode;
  onDisplayNameUpdated: (newName: string) => void;
  onAuthResolved: (options?: { isAnonymous: boolean; message?: string }) => void;
  onShowSuccessToast: (msg: string) => void;
}

export const SaveProgressModal: React.FC<SaveProgressModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentDisplayName,
  isAnonymous,
  initialMode = 'choice',
  onDisplayNameUpdated,
  onAuthResolved,
  onShowSuccessToast,
}) => {
  const [mode, setMode] = useState<AuthModalMode>('choice');

  // Form inputs
  const [displayName, setDisplayName] = useState(
    currentDisplayName.startsWith('Player') || currentDisplayName.startsWith('Historian')
      ? ''
      : currentDisplayName
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => getUserCountryCode() || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email confirmation pending state
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatusMsg, setResendStatusMsg] = useState<string | null>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      // If opened with specific intent like 'login' or 'signup', use that; otherwise default to 'choice'
      setMode(initialMode === 'choice' || initialMode === 'save_progress' ? 'choice' : initialMode);
      setErrorMsg(null);
      setConfirmationPending(false);
      setResendStatusMsg(null);
      setSelectedCountryCode(getUserCountryCode() || '');
      if (currentDisplayName && !currentDisplayName.startsWith('Player') && !currentDisplayName.startsWith('Historian')) {
        setDisplayName(currentDisplayName);
      }
    }
  }, [isOpen, initialMode, currentDisplayName]);

  if (!isOpen) return null;

  const isCompletedChoice =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('timeguess_play_choice_completed') === 'true';

  const handleDismissGuest = () => {
    sessionStorage.setItem('timeguess_play_choice_completed', 'true');
    sessionStorage.setItem('timeguess_play_choice_dismissed', 'true');
    onClose();
  };

  // 1. Submit Sign-Up / Upgrade Form (Mode 1 upgrade or Mode 2 fresh sign-up)
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResendStatusMsg(null);

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    const selectedCode = selectedCountryCode.trim() ? selectedCountryCode.trim().toUpperCase() : null;

    // 1. Validate fields
    const nameFormat = validateDisplayNameFormat(trimmedName);
    if (!nameFormat.valid) {
      setErrorMsg(nameFormat.error || 'Display name must be between 2 and 20 characters');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Please choose a password (at least 6 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step A: Check if display name is already taken
      const takenCheck = await checkDisplayNameTaken(trimmedName, userId);
      if (takenCheck.taken) {
        setErrorMsg('That name is taken, try another');
        setIsSubmitting(false);
        return;
      }

      // Step B: If player is currently an anonymous guest, upgrade profile first
      if (isAnonymous && userId) {
        // Update display_name first
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            display_name: trimmedName,
          })
          .eq('id', userId);

        if (profileError) {
          if (
            profileError.code === '23505' ||
            profileError.message?.toLowerCase().includes('unique') ||
            profileError.message?.toLowerCase().includes('already taken')
          ) {
            setErrorMsg('That name is taken, try another');
            setIsSubmitting(false);
            return;
          }
          throw profileError;
        }

        // On submit, after display_name update, also do:
        // await supabase.from('profiles').update({ country_code: selectedCode }).eq('id', user.id)
        // (send null if the player skipped it)
        await supabase
          .from('profiles')
          .update({
            country_code: selectedCode,
          })
          .eq('id', userId);

        // Update local active display name and country
        onDisplayNameUpdated(trimmedName);
        setUserCountry(selectedCode);

        // Step C: Update auth user
        const { error: authError } = await supabase.auth.updateUser({
          email: trimmedEmail,
          password: password,
        });

        if (authError) {
          throw authError;
        }

        // On success: do NOT show "Progress saved!" yet, do NOT refresh is_anonymous as false
        setConfirmationPending(true);
      } else {
        // Mode 2: Fresh account sign-up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              display_name: trimmedName,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (signUpData?.user?.id) {
          try {
            await supabase
              .from('profiles')
              .upsert({
                id: signUpData.user.id,
                display_name: trimmedName,
                country_code: selectedCode,
              });
          } catch {
            // ignore error
          }
        }

        setUserCountry(selectedCode);
        onDisplayNameUpdated(trimmedName);
        setConfirmationPending(true);
      }
    } catch (err: any) {
      console.error('Error creating account:', err);
      const msg = err.message || 'Failed to create account. Please try again.';
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('email exists')
      ) {
        setErrorMsg('An account with this email already exists. Try logging in instead.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Log In Form
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter your email');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, country_code')
          .eq('id', data.user.id)
          .maybeSingle();

        const userDisplayName = profile?.display_name || 'Player';
        if (profile?.country_code) {
          setUserCountry(profile.country_code);
        }

        onDisplayNameUpdated(userDisplayName);
        onAuthResolved({ isAnonymous: false });
        onShowSuccessToast(`Welcome back, ${userDisplayName}!`);
        sessionStorage.setItem('timeguess_play_choice_completed', 'true');
        sessionStorage.setItem('timeguess_play_choice_dismissed', 'true');
        onClose();
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Resend confirmation email
  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setResendingEmail(true);
    setResendStatusMsg(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
      });

      if (error) {
        const { error: secondError } = await supabase.auth.resend({
          type: 'email_change',
          email: trimmedEmail,
        });
        if (secondError) throw secondError;
      }

      setResendStatusMsg('Confirmation email resent! Check your inbox.');
    } catch (err: any) {
      console.warn('Resend email error:', err);
      setResendStatusMsg(
        err.message || 'Could not resend email yet. Please check your spam folder.'
      );
    } finally {
      setResendingEmail(false);
    }
  };

  /*
   * TODO: Google OAuth / linkIdentity will be re-added here later.
   * Google sign-in/linkIdentity UI is intentionally removed for now.
   */

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        className="w-full max-w-lg bg-[#141210] border border-amber-600/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - shown only if choice was already completed in this session */}
        {isCompletedChoice && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-900 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ===================== CONFIRMATION PENDING STATE ===================== */}
        {confirmationPending ? (
          <div className="space-y-5 py-3">
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-6 text-center space-y-4 shadow-inner">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Mail className="w-6 h-6 animate-pulse" />
              </div>

              <p className="text-sm font-semibold text-amber-200 leading-relaxed font-sans">
                Almost there! Check your email to confirm your account, then your score will be saved and you'll appear on the leaderboard.
              </p>

              <div className="pt-2 border-t border-amber-900/50 text-xs text-stone-400 space-y-2.5">
                <p>
                  We sent a confirmation link to{' '}
                  <span className="text-amber-300 font-mono font-semibold">{email}</span>.
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-4 font-medium transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {resendingEmail && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Resend confirmation email</span>
                  </button>
                </div>

                {resendStatusMsg && (
                  <p className="text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-900/80">
                    {resendStatusMsg}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissGuest}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              Continue to Game
            </button>
          </div>
        ) : mode === 'choice' ? (
          /* ===================== "HOW DO YOU WANT TO PLAY?" CHOICE STATE ===================== */
          <div className="space-y-6">
            <div className="text-center space-y-2 pt-1">
              <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                How do you want to play?
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto leading-relaxed">
                Choose how you'd like to experience TimeGuess. You can change your choice anytime.
              </p>
            </div>

            {/* Two large, clearly labeled options with equal visual weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Option A — Continue as Guest */}
              <button
                type="button"
                onClick={handleDismissGuest}
                className="group relative p-5 rounded-2xl bg-stone-900/90 hover:bg-stone-850 border-2 border-stone-700/80 hover:border-stone-500 transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.99] shadow-lg"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 group-hover:text-stone-100 transition-colors">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 font-cinzel">
                    Continue as Guest
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Your scores stay on this device only. You won't appear on the leaderboard.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-stone-300 group-hover:text-amber-300 transition-colors">
                  <span>Play as Guest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option B — Create a free account */}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="group relative p-5 rounded-2xl bg-[#181512] hover:bg-[#1e1a16] border-2 border-amber-600/70 hover:border-amber-500 transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.99] shadow-lg shadow-amber-950/20"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-amber-300 font-cinzel">
                    Create a free account
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Keep your scores forever and compete on the leaderboard.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                  <span>Sign Up Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* Already have an account? Log in */}
            <div className="pt-3 border-t border-stone-800 text-center">
              <p className="text-xs text-stone-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Log in to your account
                </button>
              </p>
            </div>
          </div>
        ) : mode === 'signup' ? (
          /* ===================== SIGN-UP FORM STATE ===================== */
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to options</span>
              </button>
              <span className="text-[11px] font-mono text-amber-400/90 font-semibold uppercase">
                Free Registration
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                Create a Free Account
              </h2>
              <p className="text-xs text-stone-400">
                Save your historical accuracy score and join the world leaderboard.
              </p>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              {/* Field 1: Display Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-300 font-mono">
                    Display Name <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-stone-500">
                    {displayName.length}/20 chars
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setErrorMsg(null);
                    }}
                    maxLength={20}
                    minLength={2}
                    required
                    placeholder="e.g. Amelia"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-amber-500 pl-10"
                  />
                  <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Field 2: Country Searchable Dropdown */}
              <CountrySelect
                value={selectedCountryCode}
                onChange={(code) => setSelectedCountryCode(code)}
                label="Country / National Flag"
              />

              {/* Field 3: Email */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Email Address <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    placeholder="historian@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-amber-500 pl-10"
                  />
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Field 4: Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Choose a Password <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    minLength={6}
                    required
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-amber-500 pl-10"
                  />
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] text-stone-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account &amp; Join Leaderboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs border-t border-stone-800">
              <p className="text-stone-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* ===================== LOG IN FORM STATE ===================== */
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to options</span>
              </button>
              <span className="text-[11px] font-mono text-amber-400/90 font-semibold uppercase">
                Member Sign In
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                Log In to TimeGuess
              </h2>
              <p className="text-xs text-stone-400">
                Access your saved profile, high scores, and daily streak.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Email Address <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    placeholder="historian@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-amber-500 pl-10"
                  />
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Password <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    placeholder="Your password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-amber-500 pl-10"
                  />
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] text-stone-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs border-t border-stone-800">
              <p className="text-stone-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Create free account
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PlayChoiceModal = SaveProgressModal;
