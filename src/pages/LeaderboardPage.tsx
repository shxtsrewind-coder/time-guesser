import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
        onOpenRemoveAds={onOpenRemoveAds}
        initialTab={initialTab}
      />
    </div>
  );
};
