import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LeaderboardScreen } from '../components/LeaderboardScreen.tsx';
import { useGame } from '../context/GameContext.tsx';

interface LeaderboardPageProps {
  currentUserId?: string | null;
  currentDisplayName?: string;
  onOpenRemoveAds?: () => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  currentUserId,
  currentDisplayName,
  onOpenRemoveAds,
}) => {
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
        currentUserId={currentUserId}
        currentDisplayName={currentDisplayName}
        onOpenRemoveAds={onOpenRemoveAds}
      />
    </div>
  );
};
