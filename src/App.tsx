import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { supabase } from './lib/supabase.ts';
import { GameProvider, useGame } from './context/GameContext.tsx';
import { Header } from './components/Header.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { RemoveAdsModal } from './components/RemoveAdsModal.tsx';
import { SaveProgressModal, AuthModalMode } from './components/SaveProgressModal.tsx';
import { ScrollToTop } from './components/ScrollToTop.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { RoundGuessPage } from './pages/RoundGuessPage.tsx';
import { RoundResultPage } from './pages/RoundResultPage.tsx';
import { FinalResultsPage } from './pages/FinalResultsPage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage.tsx';
import { CheckoutCancelPage } from './pages/CheckoutCancelPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { getLocalAdFreeStatus, setLocalAdFreeStatus } from './lib/monetization.ts';
import { setUserCountry } from './lib/countryFlags.ts';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { runningScore, gameMode } = useGame();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Player');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRemoveAdsOpen, setIsRemoveAdsOpen] = useState(false);
  // Pop up "How do you want to play?" immediately when the game loads, overlaying the menu until one is completed
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.location.hash.includes('admin')) return false;
    return sessionStorage.getItem('timeguess_play_choice_completed') !== 'true';
  });
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('choice');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [, setIsAdFreeState] = useState(getLocalAdFreeStatus);

  const showSuccessToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Sync ad free status listener across tabs/components
  useEffect(() => {
    const handleAdFreeChange = () => {
      setIsAdFreeState(getLocalAdFreeStatus());
    };
    window.addEventListener('timeguess_ad_free_changed', handleAdFreeChange);
    return () => {
      window.removeEventListener('timeguess_ad_free_changed', handleAdFreeChange);
    };
  }, []);

  // Determine current screen & playing status from URL
  const pathname = location.pathname;
  const isPlayingRound = pathname.includes('/round/');
  const isPlayingResult = pathname.includes('/result/');
  const isPlaying = isPlayingRound || isPlayingResult;

  let currentRoundNumber: number | undefined;
  const roundMatch = pathname.match(/\/(?:round|result)\/(\d+)/);
  if (roundMatch && roundMatch[1]) {
    currentRoundNumber = parseInt(roundMatch[1], 10);
  }

  let currentScreen = 'home';
  if (isPlayingRound) currentScreen = 'round';
  else if (isPlayingResult) currentScreen = 'round_result';
  else if (pathname.includes('/final')) currentScreen = 'final_results';
  else if (pathname.includes('/leaderboard')) currentScreen = 'leaderboard';
  else if (pathname.includes('/checkout/') || pathname.includes('/premium/')) currentScreen = 'checkout';

  // Synchronize user profile & session
  const syncUserProfile = useCallback(async (uid: string, initialName?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, country_code, is_ads_removed, is_ad_free')
        .eq('id', uid)
        .maybeSingle();

      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      } else {
        const defaultName = initialName || `Player${Math.floor(1000 + Math.random() * 9000)}`;
        setDisplayName(defaultName);
        await supabase.from('profiles').upsert({
          id: uid,
          display_name: defaultName,
        });
      }

      if (profile?.country_code !== undefined) {
        setUserCountry(profile?.country_code || null);
      }

      if (profile?.is_ads_removed || profile?.is_ad_free) {
        setLocalAdFreeStatus(true);
        setIsAdFreeState(true);
      }
    } catch (err) {
      console.warn('Profile sync warning:', err);
    }
  }, []);

  // Initialize or resume Supabase session in the background AFTER Home has already rendered.
  // It never gates, delays, or replaces the Home screen with a loading or error state.
  useEffect(() => {
    let isMounted = true;

    const initAuthInBackground = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let currentSession = sessionData?.session;

        if (!currentSession) {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (!signInError && signInData?.session) {
            currentSession = signInData.session;
          }
        }

        if (isMounted && currentSession?.user) {
          const user = currentSession.user;
          setUserId(user.id);
          setUserEmail(user.email || null);

          // An account is only non-anonymous if confirmed
          const isConfirmed = Boolean(user.email_confirmed_at);
          const isActuallyAnonymous = user.is_anonymous || !isConfirmed;

          setIsAnonymous(isActuallyAnonymous);
          if (!isActuallyAnonymous) {
            sessionStorage.setItem('timeguess_play_choice_completed', 'true');
            setIsAuthModalOpen(false);
          }
          await syncUserProfile(user.id);
        }
      } catch (err) {
        // If auth initialization fails, stay on Home silently without showing an error screen
        console.warn('Background auth initialization failed silently:', err);
      }
    };

    initAuthInBackground();

    return () => {
      isMounted = false;
    };
  }, [syncUserProfile]);

  /*
   * TODO: Google OAuth / linkIdentity will be re-added here later.
   * Google sign-in/linkIdentity logic is intentionally removed for now.
   */
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = session.user;
        setUserId(user.id);
        setUserEmail(user.email || null);

        const isConfirmed = Boolean(user.email_confirmed_at);
        if (isConfirmed) {
          setIsAnonymous(false);
          await syncUserProfile(user.id);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [syncUserProfile]);

  const handleOpenRemoveAds = useCallback(() => {
    setIsRemoveAdsOpen(true);
  }, []);

  const handleOpenAuthModal = useCallback((mode: AuthModalMode = 'choice') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      const { data } = await supabase.auth.signInAnonymously();
      if (data?.session?.user) {
        setUserId(data.session.user.id);
        setUserEmail(null);
        setIsAnonymous(true);
        const defaultName = `Player${Math.floor(1000 + Math.random() * 9000)}`;
        setDisplayName(defaultName);
        setUserCountry(null);
        await supabase.from('profiles').upsert({
          id: data.session.user.id,
          display_name: defaultName,
          country_code: null,
        });
      }
      showSuccessToast('Signed out. Continuing as guest.');
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  }, [showSuccessToast]);

  if (location.pathname === '/admin') {
    return (
      <div className="min-h-screen bg-[#100e0d] text-stone-100 flex flex-col font-sans">
        <ScrollToTop />
        <AdminPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] bg-vignette text-stone-100 flex flex-col font-sans selection:bg-amber-900/50 selection:text-amber-200 relative">
      <ScrollToTop />

      {/* Global Success Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#161412] border border-amber-500/50 text-amber-200 px-5 py-3 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md animate-fade-in pointer-events-auto">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cinematic Top Header */}
      <Header
        currentScreen={currentScreen}
        gameMode={gameMode}
        currentRound={currentRoundNumber}
        totalScore={runningScore}
        displayName={displayName}
        isAnonymous={isAnonymous}
        isPlaying={isPlaying}
        onOpenProfile={() => setIsProfileOpen(true)}
        onGoHome={() => navigate('/')}
        onOpenLeaderboard={() => navigate('/leaderboard')}
        onOpenRemoveAds={handleOpenRemoveAds}
        onOpenSaveProgress={() => handleOpenAuthModal('choice')}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col items-center justify-start w-full">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onOpenRemoveAds={handleOpenRemoveAds}
                isAnonymous={isAnonymous}
                onOpenSaveProgress={() => handleOpenAuthModal('choice')}
                onOpenLogin={() => handleOpenAuthModal('login')}
              />
            }
          />
          <Route path="/play/:gameId/round/:n" element={<RoundGuessPage />} />
          <Route path="/play/:gameId/result/:n" element={<RoundResultPage onOpenRemoveAds={handleOpenRemoveAds} />} />
          <Route
            path="/play/:gameId/final"
            element={
              <FinalResultsPage
                onOpenRemoveAds={handleOpenRemoveAds}
                isAnonymous={isAnonymous}
                onOpenSaveProgress={() => handleOpenAuthModal('choice')}
              />
            }
          />
          <Route
            path="/leaderboard"
            element={
              <LeaderboardPage
                currentUserId={userId}
                currentDisplayName={displayName}
                onOpenRemoveAds={handleOpenRemoveAds}
              />
            }
          />
          {/* Support both /premium/* and /checkout/* routes */}
          <Route path="/premium/success" element={<CheckoutSuccessPage />} />
          <Route path="/premium/cancelled" element={<CheckoutCancelPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Profile & Name Editor Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={userId}
        isAnonymous={isAnonymous}
        currentDisplayName={displayName}
        userEmail={userEmail}
        onDisplayNameUpdated={(newName) => setDisplayName(newName)}
        onOpenRemoveAds={handleOpenRemoveAds}
        onOpenAuthModal={(mode) => handleOpenAuthModal(mode)}
        onSignOut={handleSignOut}
      />

      {/* How do you want to play? Modal */}
      <SaveProgressModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        userId={userId}
        currentDisplayName={displayName}
        isAnonymous={isAnonymous}
        initialMode={authModalMode}
        onDisplayNameUpdated={(newName) => setDisplayName(newName)}
        onAuthResolved={(opts) => {
          if (opts) {
            setIsAnonymous(opts.isAnonymous);
            if (opts.message) showSuccessToast(opts.message);
          }
        }}
        onShowSuccessToast={showSuccessToast}
      />

      {/* Remove Ads Upgrade Modal */}
      <RemoveAdsModal
        isOpen={isRemoveAdsOpen}
        onClose={() => setIsRemoveAdsOpen(false)}
        userId={userId}
        onAdFreeUnlocked={() => {
          setLocalAdFreeStatus(true);
          setIsAdFreeState(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <GameProvider>
        <AppLayout />
      </GameProvider>
    </HashRouter>
  );
}
