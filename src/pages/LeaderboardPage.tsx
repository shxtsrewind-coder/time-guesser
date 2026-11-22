import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LeaderboardScreen } from '../components/LeaderboardScreen.tsx';
import { useGame } from '../context/GameContext.tsx';

interface LeaderboardPageProps {
  currentUserId?: string | null;
  currentDisplayName?: string;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  currentUserId,
  currentDisplayName,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'decade_sort' || tabParam === 'alltime' ? tabParam : 'daily';

  return (
    <div className="page-enter w-full">
      <LeaderboardScreen
        onBack={() => navigate('/')}
        currentUserId={currentUserId}
        currentDisplayName={currentDisplayName}
        initialTab={initialTab}
      />
    </div>
  );
};
