import React, { useState } from 'react';
import { X, Zap, Check, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import {
  restorePurchases,
  setLocalAdFreeStatus,
  getLocalAdFreeStatus,
  getAdFreePurchaseDate,
} from '../lib/monetization.ts';

interface RemoveAdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  onAdFreeUnlocked: () => void;
}

export const RemoveAdsModal: React.FC<RemoveAdsModalProps> = ({
  isOpen,
  onClose,
  userId,
  onAdFreeUnlocked,
}) => {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAlreadyAdFree = getLocalAdFreeStatus();
  const purchaseDate = getAdFreePurchaseDate();

  if (!isOpen) return null;

  const handlePurchase = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Call Supabase edge function create-checkout-session per instructions
      const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: {} });

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      // If error or no URL (e.g. edge function not deployed in preview environment)
      if (error) {
        console.warn('Supabase edge function create-checkout-session returned error:', error);
        // Fallback to local server checkout proxy or sandbox test
        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || undefined,
            successUrl: `${window.location.origin}/#/premium/success`,
            cancelUrl: `${window.location.origin}/#/premium/cancelled`,
          }),
        });

        if (res.ok) {
          const fallbackData = await res.json();
          if (fallbackData.url) {
            window.location.href = fallbackData.url;
            return;
          }
        }

        setErrorMessage(error.message || 'Payment service is currently unavailable. Please try again.');
      } else {
        setErrorMessage('Unable to connect to payment server.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setErrorMessage(null);
    const result = await restorePurchases(userId);
    setRestoring(false);

    if (result.restored) {
      onAdFreeUnlocked();
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleSandboxSimulate = () => {
    setLocalAdFreeStatus(true);
    onAdFreeUnlocked();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel text-stone-100 tracking-wide">
                REMOVE ADS
              </h2>
              <p className="text-xs text-stone-400">
                Enjoy Time Guesser without interruptions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl text-xs bg-rose-950/50 border border-rose-800/80 text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isAlreadyAdFree ? (
          <div className="space-y-4 py-2">
            <div className="bg-amber-950/20 border border-amber-600/30 rounded-2xl p-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/40 mx-auto flex items-center justify-center text-amber-400">
                <Sparkles className="w-6 h-6 fill-amber-400" />
              </div>
              <h3 className="text-base font-bold text-amber-200 font-cinzel">
                Ads Removed
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Thank you for supporting Time Guesser! All rounds and results are completely ad-free.
              </p>
              {purchaseDate && (
                <p className="text-[11px] text-stone-500 font-mono">
                  Activated on: {purchaseDate}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Continue Playing
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Benefits Checklist */}
            <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-stone-200">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="font-medium">No advertisements</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-200">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="font-medium">Cleaner gameplay</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-200">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="font-medium">Faster game sessions</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-200">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="font-medium">Support the game</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={loading || restoring}
                onClick={handlePurchase}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 active:scale-[0.98] text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Stripe...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-stone-950" />
                    <span>REMOVE ADS — $2.99</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 pt-1 font-mono">
                <span>One-time purchase</span>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={restoring || loading}
                  className="text-stone-400 hover:text-amber-400 underline transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {restoring && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Restore purchases</span>
                </button>
              </div>
            </div>

            {/* Quick Sandbox Toggle for local testing */}
            <div className="pt-2 border-t border-stone-800 text-center">
              <button
                type="button"
                onClick={handleSandboxSimulate}
                className="text-[11px] text-stone-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Instant Unlock (Sandbox Demo)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
