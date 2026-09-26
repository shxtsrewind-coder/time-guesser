import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.tsx';
import { FinalResultsScreen } from '../components/FinalResultsScreen.tsx';

interface FinalResultsPageProps {
  onOpenRemoveAds?: () => void;
  isAnonymous?: boolean;
  onOpenSaveProgress?: () => void;
}

export const FinalResultsPage: React.FC<FinalResultsPageProps> = ({
  onOpenRemoveAds,
  isAnonymous,
  onOpenSaveProgress,
}) => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const {
    finishData,
    gameMode,
    runningScore,
    maxTotalScore,
    results,
    ensureGameLoaded,
    finishCurrentGame,
    startNewGame,
    clearGame,
  } = useGame();

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!gameId) {
        navigate('/', { replace: true });
        return;
      }

      const loaded = await ensureGameLoaded(gameId);
      if (!isMounted) return;

      if (!loaded) {
        navigate('/', { replace: true });
        return;
      }

      if (!finishData) {
        // Attempt to finish game if rounds completed
        await finishCurrentGame(gameId);
      }

      setIsInitializing(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [gameId, ensureGameLoaded, finishData, finishCurrentGame, navigate]);

  const handlePlayAgain = async () => {
    clearGame();
    const result = await startNewGame('classic');
    if (result) {
      navigate(`/play/${result.gameId}/round/${result.startingRound}`);
    } else {
      navigate('/');
    }
  };

  const handleOpenLeaderboard = () => {
    navigate('/leaderboard');
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-stone-400">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        <span className="text-xs uppercase font-medium tracking-widest font-serif-display">
          Calculating Archival Standing...
        </span>
      </div>
    );
  }

  const effectiveFinishData = finishData || {
    total_score: runningScore,
    max_score: maxTotalScore,
    round_scores: Object.entries(results).map(([numStr, res]) => ({
      round_no: parseInt(numStr, 10),
      score: res.score,
      max_score: res.round_max,
      year_score: res.year_score,
      location_score: res.location_score ?? undefined,
      weekday_score: res.weekday_score ?? undefined,
    })),
  };

  return (
    <div className="page-enter w-full">
      <FinalResultsScreen
        mode={gameMode}
        finishData={effectiveFinishData}
        onPlayAgain={handlePlayAgain}
        onOpenLeaderboard={handleOpenLeaderboard}
        onOpenRemoveAds={onOpenRemoveAds}
        isAnonymous={isAnonymous}
        onOpenSaveProgress={onOpenSaveProgress}
      />
    </div>
  );
};
