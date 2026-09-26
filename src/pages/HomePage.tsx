import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.tsx';
import { HomeScreen } from '../components/HomeScreen.tsx';
import { GameMode } from '../types.ts';

interface HomePageProps {
  onOpenRemoveAds?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenRemoveAds }) => {
  const navigate = useNavigate();
  const { startNewGame, isLoadingGame, gameError, setGameError } = useGame();
  const [loadingMode, setLoadingMode] = useState<GameMode | null>(null);
  const [dailyPlayedNotice, setDailyPlayedNotice] = useState(false);

  const handleStartGame = async (mode: GameMode) => {
    setLoadingMode(mode);
    setDailyPlayedNotice(false);
    setGameError(null);

    const result = await startNewGame(mode);
    setLoadingMode(null);

    if (result) {
      navigate(`/play/${result.gameId}/round/${result.startingRound}`);
    } else if (mode === 'daily') {
      setDailyPlayedNotice(true);
    }
  };

  return (
    <div className="page-enter w-full">
      <HomeScreen
        onStartGame={handleStartGame}
        onOpenLeaderboard={() => navigate('/leaderboard')}
        onOpenRemoveAds={onOpenRemoveAds}
        isLoading={isLoadingGame}
        loadingMode={loadingMode}
        errorMessage={gameError}
        onClearError={() => setGameError(null)}
        dailyPlayedNotice={dailyPlayedNotice}
      />
    </div>
  );
};
