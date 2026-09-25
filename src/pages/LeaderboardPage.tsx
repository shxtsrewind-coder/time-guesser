import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LeaderboardScreen } from '../components/LeaderboardScreen.tsx';
import { useGame } from '../context/GameContext.tsx';

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { startNewGame, clearGame } = useGame();

  const handleStartClassic = async () => {
    clearGame();
    const result = await startNewGame('classic');
    if (result) {
      navigate(`/play/${result.gameId}/round/${result.startingRound}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="page-enter w-full">
      <LeaderboardScreen
        onBack={() => navigate('/')}
        onStartClassic={handleStartClassic}
      />
    </div>
  );
};
