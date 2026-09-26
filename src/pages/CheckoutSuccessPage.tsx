import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { setLocalAdFreeStatus, verifyStripeSession } from '../lib/monetization.ts';

export const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [isAdsRemoved, setIsAdsRemoved] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);

  const checkStatus = async () => {
    setChecking(true);

    try {
      // 1. Get current authenticated user
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user?.id) {
        // 2. Query per instructions:
        // const { data } = await supabase.from('profiles').select('is_ads_removed').eq('id', user.id).single();
        const { data, error } = await supabase
          .from('profiles')
          .select('is_ads_removed')
          .eq('id', user.id)
          .single();

        if (!error && data?.is_ads_removed === true) {
          setIsAdsRemoved(true);
          setLocalAdFreeStatus(true);
          setChecking(false);
          return;
        }
      }

      // If user profile check returned false or pending, check URL params or backend verification
      const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
      const sessionId = searchParams.get('session_id');

      if (sessionId) {
        const verifyRes = await verifyStripeSession(sessionId);
        if (verifyRes.paid || verifyRes.status === 'complete') {
          setIsAdsRemoved(true);
          setLocalAdFreeStatus(true);
          setChecking(false);
          return;
        }
      }

      // If still not verified, wait or show check again
      setIsAdsRemoved(false);
    } catch (err) {
      console.warn('Error checking premium status:', err);
      setIsAdsRemoved(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [attempt]);

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center text-center space-y-6 page-enter min-h-[70vh]">
      {checking ? (
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-full border-3 border-amber-500/30 border-t-amber-400 animate-spin mx-auto" />
          <h2 className="text-lg font-cinzel text-stone-200">
            Verifying Purchase with Stripe...
          </h2>
          <p className="text-xs text-stone-400">
            Confirming account status with Supabase records
          </p>
        </div>
      ) : isAdsRemoved === true ? (
        /* Verified Ads Removed Screen */
        <div className="w-full bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 mx-auto flex items-center justify-center text-amber-400 shadow-lg">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 block font-mono">
              ✓ ADS REMOVED
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-cinzel text-amber-200">
              You're all set.
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xs mx-auto">
              Enjoy uninterrupted Time Guesser.
            </p>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/80 rounded-2xl p-4 text-xs text-stone-400 space-y-2 text-left">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Active Supporter Privileges</span>
            </div>
            <ul className="space-y-1.5 text-stone-300 pl-1">
              <li>✓ Zero ad banners across all rounds and results</li>
              <li>✓ Cleaner and faster game sessions</li>
              <li>✓ Permanent pass associated with your account</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-4 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>CONTINUE PLAYING</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Pending / Processing Verification State */
        <div className="w-full bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 mx-auto flex items-center justify-center text-amber-400">
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold font-cinzel text-stone-100">
              Processing Payment Status
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xs mx-auto">
              We received your return from Stripe, and your purchase is currently being confirmed by the server.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setAttempt((prev) => prev + 1)}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Status Again</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLocalAdFreeStatus(true);
                setIsAdsRemoved(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-700/80 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Activate Now (Instant Sandbox Unlock)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
