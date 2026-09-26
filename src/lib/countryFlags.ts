export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

export const POPULAR_COUNTRIES: CountryInfo[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
];

const USER_COUNTRY_STORAGE_KEY = 'timeguess_user_country';

/**
 * Convert 2-letter ISO country code into Unicode emoji flag
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Detect user's country code from browser locale or timezone
 */
export function detectUserCountry(): string {
  try {
    if (typeof window !== 'undefined' && window.navigator) {
      // 1. Check navigator.language (e.g. "en-US", "fr-FR", "pt-BR")
      const language = window.navigator.language || '';
      const parts = language.split('-');
      if (parts.length > 1 && parts[1].length === 2) {
        return parts[1].toUpperCase();
      }

      // 2. Check timezone mapping
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (timeZone.startsWith('America/New_York') || timeZone.startsWith('America/Los_Angeles') || timeZone.startsWith('America/Chicago')) return 'US';
      if (timeZone.startsWith('Europe/London')) return 'GB';
      if (timeZone.startsWith('Europe/Paris')) return 'FR';
      if (timeZone.startsWith('Europe/Berlin')) return 'DE';
      if (timeZone.startsWith('Asia/Tokyo')) return 'JP';
      if (timeZone.startsWith('Australia/')) return 'AU';
      if (timeZone.startsWith('America/Toronto')) return 'CA';
      if (timeZone.startsWith('America/Sao_Paulo')) return 'BR';
      if (timeZone.startsWith('Europe/Madrid')) return 'ES';
      if (timeZone.startsWith('Europe/Rome')) return 'IT';
    }
  } catch {
    // fallback
  }
  return 'US';
}

/**
 * Get the current user's configured or detected country
 */
export function getUserCountry(): CountryInfo {
  if (typeof window === 'undefined') {
    return { code: 'US', name: 'United States', flag: '🇺🇸' };
  }

  const stored = localStorage.getItem(USER_COUNTRY_STORAGE_KEY);
  if (stored) {
    const found = POPULAR_COUNTRIES.find((c) => c.code === stored.toUpperCase());
    if (found) return found;
    return {
      code: stored.toUpperCase(),
      name: stored.toUpperCase(),
      flag: getFlagEmoji(stored),
    };
  }

  const detectedCode = detectUserCountry();
  const matched = POPULAR_COUNTRIES.find((c) => c.code === detectedCode);
  if (matched) return matched;

  return {
    code: detectedCode,
    name: detectedCode,
    flag: getFlagEmoji(detectedCode),
  };
}

/**
 * Set user country preference
 */
export function setUserCountry(countryCode: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_COUNTRY_STORAGE_KEY, countryCode.toUpperCase());
  window.dispatchEvent(new CustomEvent('timeguess_country_changed', { detail: { code: countryCode } }));
}

/**
 * Deterministically assign a country to an opponent / leaderboard user
 * so their flag remains consistent across renders.
 */
export function getCountryForUser(displayName: string, explicitCode?: string): CountryInfo {
  if (explicitCode) {
    const matched = POPULAR_COUNTRIES.find((c) => c.code === explicitCode.toUpperCase());
    if (matched) return matched;
    return {
      code: explicitCode.toUpperCase(),
      name: explicitCode.toUpperCase(),
      flag: getFlagEmoji(explicitCode),
    };
  }

  // Hash the displayName to pick a country from POPULAR_COUNTRIES
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash << 5) - hash + displayName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % POPULAR_COUNTRIES.length;
  return POPULAR_COUNTRIES[index];
}
