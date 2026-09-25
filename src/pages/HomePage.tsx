import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.tsx';
import { HomeScreen } from '../components/HomeScreen.tsx';
import { GameMode } from '../types.ts';

export const HomePage: React.FC = () => {
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
    } else if (gameError && gameError.includes('daily_already_played')) {
      setDailyPlayedNotice(true);
    }
  };

  return (
    <div className="page-enter w-full">
      <HomeScreen
        onStartGame={handleStartGame}
        onOpenLeaderboard={() => navigate('/leaderboard')}
        isLoading={isLoadingGame}
        loadingMode={loadingMode}
        errorMessage={gameError}
        onClearError={() => setGameError(null)}
        dailyPlayedNotice={dailyPlayedNotice}
      />
    </div>
  );
};
