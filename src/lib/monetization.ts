import { supabase } from './supabase.ts';

const AD_FREE_STORAGE_KEY = 'timeguess_ad_free_status';
const AD_FREE_DATE_KEY = 'timeguess_ad_free_date';

export interface StripeConfig {
  configured: boolean;
  productName: string;
  priceUsd: number;
  priceCents: number;
  currency: string;
}

export function getLocalAdFreeStatus(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AD_FREE_STORAGE_KEY) === 'true';
}

export function setLocalAdFreeStatus(status: boolean, purchasedDate?: string): void {
  if (typeof window === 'undefined') return;
  if (status) {
    localStorage.setItem(AD_FREE_STORAGE_KEY, 'true');
    localStorage.setItem(AD_FREE_DATE_KEY, purchasedDate || new Date().toLocaleDateString());
  } else {
    localStorage.removeItem(AD_FREE_STORAGE_KEY);
    localStorage.removeItem(AD_FREE_DATE_KEY);
  }
  window.dispatchEvent(new CustomEvent('timeguess_ad_free_changed', { detail: { isAdFree: status } }));
}

export function getAdFreePurchaseDate(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AD_FREE_DATE_KEY);
}

/**
 * Fetch product pricing & config from backend or default
 */
export async function fetchStripeConfig(): Promise<StripeConfig> {
  try {
    const res = await fetch('/api/stripe/config');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return {
    configured: true,
    productName: 'TimeGuess Ad-Free Pass',
    priceUsd: 2.99,
    priceCents: 299,
    currency: 'USD',
  };
}

/**
 * Invoke Supabase create-checkout-session Edge Function
 */
export async function createCheckoutSession(): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: {} });
    if (error) {
      // In development sandbox, if the Edge function is not configured, fallback to backend or test redirect
      console.warn('supabase create-checkout-session invoke returned error:', error);
      try {
        const fallbackRes = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            successUrl: `${window.location.origin}/#/premium/success`,
            cancelUrl: `${window.location.origin}/#/premium/cancelled`,
          }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.url) return { url: fallbackData.url };
        }
      } catch {
        // continue
      }
      return { error: error.message || 'Failed to initialize checkout session' };
    }

    if (data?.url) {
      return { url: data.url };
    }
    return { error: 'No checkout URL returned from payment server.' };
  } catch (err: any) {
    return { error: err.message || 'Payment service unreachable' };
  }
}

/**
 * Verify a completed session with server
 */
export async function verifyStripeSession(sessionId: string): Promise<{
  paid: boolean;
  status?: string;
  mode?: string;
}> {
  try {
    const res = await fetch(`/api/stripe/verify-session?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error('Verification failed');
    return await res.json();
  } catch {
    return { paid: false };
  }
}

/**
 * Check user's verified is_ads_removed status directly from Supabase
 */
export async function verifyUserAdsRemoved(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_ads_removed')
      .eq('id', userId)
      .single();

    if (!error && data?.is_ads_removed === true) {
      setLocalAdFreeStatus(true);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error checking is_ads_removed status:', err);
    return false;
  }
}

/**
 * Restore purchases from Supabase profile or local records
 */
export async function restorePurchases(userId?: string | null): Promise<{
  restored: boolean;
  message: string;
}> {
  if (userId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_ads_removed, is_ad_free')
        .eq('id', userId)
        .maybeSingle();

      if (profile && (profile.is_ads_removed === true || profile.is_ad_free === true)) {
        setLocalAdFreeStatus(true);
        return {
          restored: true,
          message: 'Found active Supporter Pass linked to your account! Ads removed.',
        };
      }
    } catch {
      // Continue to check local
    }
  }

  if (getLocalAdFreeStatus()) {
    return {
      restored: true,
      message: 'Active Ad-Free status verified on this device.',
    };
  }

  return {
    restored: false,
    message: 'No active purchase found. Tap "Remove Ads" to unlock.',
  };
}
