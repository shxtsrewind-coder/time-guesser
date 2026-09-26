import React, { useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase.ts';
import { GameProvider, useGame } from './context/GameContext.tsx';
import { Header } from './components/Header.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { WelcomeModal } from './components/WelcomeModal.tsx';
import { RemoveAdsModal } from './components/RemoveAdsModal.tsx';
import { ScrollToTop } from './components/ScrollToTop.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { RoundGuessPage } from './pages/RoundGuessPage.tsx';
import { RoundResultPage } from './pages/RoundResultPage.tsx';
import { FinalResultsPage } from './pages/FinalResultsPage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage.tsx';
import { CheckoutCancelPage } from './pages/CheckoutCancelPage.tsx';
import { getLocalAdFreeStatus, setLocalAdFreeStatus } from './lib/monetization.ts';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { runningScore, gameMode } = useGame();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Player');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isRemoveAdsOpen, setIsRemoveAdsOpen] = useState(false);
  const [, setIsAdFreeState] = useState(getLocalAdFreeStatus);

  // Trigger welcome onboarding modal on initial load if not yet completed
  useEffect(() => {
    const hasCompleted = localStorage.getItem('timeguess_onboarding_completed_v2');
    if (!hasCompleted) {
      setIsWelcomeModalOpen(true);
    }
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

  // Initialize or resume Supabase session & fetch user profile
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let currentSession = sessionData?.session;

        if (!currentSession) {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (!signInError && signInData?.session) {
            currentSession = signInData.session;
          }
        }

        if (currentSession?.user) {
          const user = currentSession.user;
          setUserId(user.id);
          setIsAnonymous(user.is_anonymous ?? true);

          // Fetch profile display name & is_ads_removed status
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, is_ads_removed, is_ad_free')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.display_name) {
            setDisplayName(profile.display_name);
          } else {
            const defaultName = `Historian_${user.id.slice(0, 5)}`;
            setDisplayName(defaultName);
            await supabase.from('profiles').upsert({
              id: user.id,
              display_name: defaultName,
              updated_at: new Date().toISOString(),
            });
          }

          if (profile?.is_ads_removed || profile?.is_ad_free) {
            setLocalAdFreeStatus(true);
            setIsAdFreeState(true);
          }
        }
      } catch (err) {
        console.warn('Auth initialization warning:', err);
      }
    };

    initAuth();
  }, []);

  const handleOpenRemoveAds = useCallback(() => {
    setIsRemoveAdsOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0a09] bg-vignette text-stone-100 flex flex-col font-sans selection:bg-amber-900/50 selection:text-amber-200">
      <ScrollToTop />

      {/* Cinematic Top Header */}
      <Header
        currentScreen={currentScreen}
        gameMode={gameMode}
        currentRound={currentRoundNumber}
        totalScore={runningScore}
        displayName={displayName}
        isPlaying={isPlaying}
        onOpenProfile={() => setIsProfileOpen(true)}
        onGoHome={() => navigate('/')}
        onOpenLeaderboard={() => navigate('/leaderboard')}
        onOpenRemoveAds={handleOpenRemoveAds}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col items-center justify-start w-full">
        <Routes>
          <Route path="/" element={<HomePage onOpenRemoveAds={handleOpenRemoveAds} />} />
          <Route path="/play/:gameId/round/:n" element={<RoundGuessPage />} />
          <Route path="/play/:gameId/result/:n" element={<RoundResultPage onOpenRemoveAds={handleOpenRemoveAds} />} />
          <Route path="/play/:gameId/final" element={<FinalResultsPage onOpenRemoveAds={handleOpenRemoveAds} />} />
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
          {/* Support both /premium/* per prompt instructions and /checkout/* legacy routes */}
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
        onDisplayNameUpdated={(newName) => setDisplayName(newName)}
        onOpenRemoveAds={handleOpenRemoveAds}
      />

      {/* Welcome & Leaderboard Onboarding Pop-up on Game Load */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        userId={userId}
        currentDisplayName={displayName}
        onProfileSaved={(newName) => {
          setDisplayName(newName);
        }}
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
