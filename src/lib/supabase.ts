import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = "https://pfxmswdwosimghjaggsk.supabase.co";
export const SUPABASE_KEY = "sb_publishable_J1IBEEAqyhz76BYFb1dimw_3AVmfL2J";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface ApiErrorPayload {
  error?: string;
  code?: string;
  message?: string;
}

export async function parseSupabaseError(error: any): Promise<string> {
  if (!error) return 'An unexpected error occurred.';

  // Attempt to read context JSON from Edge Function error response
  let code = '';
  let message = '';

  try {
    if (error.context && typeof error.context.json === 'function') {
      const errorJson = await error.context.json();
      code = errorJson.code || errorJson.error || '';
      message = errorJson.message || errorJson.error || '';
    }
  } catch {
    // If context parsing fails, fallback to standard error properties
  }

  const rawCode = (code || error.message || error.code || '').toLowerCase();

  if (rawCode.includes('daily_already_played')) {
    return "daily_already_played: You've already completed today's Daily Challenge! Classic mode is ready for you.";
  }
  if (rawCode.includes('rate_limited')) {
    return "Too many requests. Please catch your breath and try again in a few moments.";
  }
  if (rawCode.includes('not_enough_photos')) {
    return "Not enough archival photos available right now. Please try again shortly.";
  }
  if (rawCode.includes('no_daily_challenge')) {
    return "Today's daily challenge is not available yet. Try Classic mode in the meantime!";
  }
  if (rawCode.includes('already_answered')) {
    return "This round has already been answered.";
  }
  if (rawCode.includes('location_required')) {
    return "Please drop a pin on the map to guess where this photo was taken.";
  }
  if (rawCode.includes('weekday_required')) {
    return "Please select the day of the week this photo was taken.";
  }

  return message || error.message || 'Network request failed. Please check your connection.';
}
