import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.tsx';
import { HomeScreen } from '../components/HomeScreen.tsx';
import { GameMode } from '../types.ts';
import { isDailyCompletedToday } from '../lib/streak.ts';

interface HomePageProps {
  onOpenRemoveAds?: () => void;
  isAnonymous?: boolean;
  onOpenSaveProgress?: () => void;
  onOpenLogin?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenRemoveAds,
  isAnonymous,
  onOpenSaveProgress,
  onOpenLogin,
}) => {
  const navigate = useNavigate();
  const { startNewGame, isLoadingGame, gameError, setGameError } = useGame();
  const [loadingMode, setLoadingMode] = useState<GameMode | null>(null);
  const [dailyPlayedNotice, setDailyPlayedNotice] = useState(false);

  const handleStartGame = async (mode: GameMode) => {
    if (mode === 'daily' && isDailyCompletedToday()) {
      setDailyPlayedNotice(true);
      return;
    }

    setLoadingMode(mode);
    setDailyPlayedNotice(false);
    setGameError(null);

    const result = await startNewGame(mode);
    setLoadingMode(null);

    if (result) {
      navigate(`/play/${result.gameId}/round/${result.startingRound}`);
    } else if (mode === 'daily' && isDailyCompletedToday()) {
      // Only show the "already played" lock screen when that's actually why
      // it failed (GameContext sets this flag specifically for that error).
      // Any other failure — a network blip, rate limiting — should surface
      // the real error banner below instead, so the player can retry.
      setDailyPlayedNotice(true);
    }
  };

  return (
    <div className="page-enter w-full">
      <HomeScreen
        onStartGame={handleStartGame}
        onOpenDecadeSort={() => navigate('/decade-sort')}
        onOpenLeaderboard={() => navigate('/leaderboard')}
        onOpenRemoveAds={onOpenRemoveAds}
        isAnonymous={isAnonymous}
        onOpenSaveProgress={onOpenSaveProgress}
        onOpenLogin={onOpenLogin}
        isLoading={isLoadingGame}
        loadingMode={loadingMode}
        errorMessage={gameError}
        onClearError={() => setGameError(null)}
        dailyPlayedNotice={dailyPlayedNotice}
      />
    </div>
  );
};
