import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase.ts';
import { GameProvider, useGame } from './context/GameContext.tsx';
import { Header } from './components/Header.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { ScrollToTop } from './components/ScrollToTop.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { RoundGuessPage } from './pages/RoundGuessPage.tsx';
import { RoundResultPage } from './pages/RoundResultPage.tsx';
import { FinalResultsPage } from './pages/FinalResultsPage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { runningScore, gameMode } = useGame();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Player');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  // Initialize or resume Supabase anonymous session
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

          // Fetch profile display name
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
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
        }
      } catch (err) {
        console.warn('Auth initialization error', err);
      }
    };

    initAuth();
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
      />

      {/* Main Body with Routes */}
      <main className="flex-1 flex flex-col items-center justify-start w-full">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play/:gameId/round/:n" element={<RoundGuessPage />} />
          <Route path="/play/:gameId/result/:n" element={<RoundResultPage />} />
          <Route path="/play/:gameId/final" element={<FinalResultsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
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
