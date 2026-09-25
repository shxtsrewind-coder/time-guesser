import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.tsx';
import { RoundScreen } from '../components/RoundScreen.tsx';
import { supabase, parseSupabaseError } from '../lib/supabase.ts';
import { SubmitGuessResponse } from '../types.ts';

export const RoundGuessPage: React.FC = () => {
  const { gameId, n } = useParams<{ gameId: string; n: string }>();
  const navigate = useNavigate();
  const roundNo = parseInt(n || '1', 10);

  const {
    gameId: activeGameId,
    rounds,
    results,
    isGameFinished,
    runningScore,
    ensureGameLoaded,
    saveRoundResult,
  } = useGame();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Ensure game data is loaded
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
        // Unknown game ID or cannot resume
        navigate('/', { replace: true });
        return;
      }

      setIsInitializing(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [gameId, ensureGameLoaded, navigate]);

  // Find round info
  const roundInfo = useMemo(() => {
    return rounds.find((r) => r.round_no === roundNo);
  }, [rounds, roundNo]);

  // 2. Guards: redirect if round is already answered, or game is finished
  useEffect(() => {
    if (isInitializing) return;

    if (isGameFinished) {
      navigate(`/play/${gameId}/final`, { replace: true });
      return;
    }

    // If this round was already answered:
    if (results[roundNo]) {
      navigate(`/play/${gameId}/result/${roundNo}`, { replace: true });
      return;
    }

    // If round doesn't exist (e.g. round 6), redirect to latest or final
    if (rounds.length > 0 && !roundInfo) {
      navigate('/', { replace: true });
    }
  }, [isInitializing, isGameFinished, results, roundNo, gameId, roundInfo, rounds.length, navigate]);

  // 3. Handle Submit Guess
  const handleSubmitGuess = async (guess: {
    year: number;
    lat?: number;
    lng?: number;
    weekday?: number;
  }) => {
    if (!gameId || !roundInfo || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const body: Record<string, any> = {
      game_id: gameId,
      round_no: roundNo,
      guess_year: guess.year,
    };

    if (roundInfo.ask_location && guess.lat !== undefined && guess.lng !== undefined) {
      body.guess_lat = guess.lat;
      body.guess_lng = guess.lng;
    }

    if (roundInfo.ask_weekday && guess.weekday !== undefined) {
      body.guess_weekday = guess.weekday;
    }

    try {
      const { data, error } = await supabase.functions.invoke<SubmitGuessResponse>('submit-guess', {
        body,
      });

      if (error) {
        const parsed = await parseSupabaseError(error);
        setErrorMessage(parsed);
        setIsSubmitting(false);
        return;
      }

      if (!data) {
        setErrorMessage('Did not receive response from temporal archive. Please retry.');
        setIsSubmitting(false);
        return;
      }

      // 1. Save response to state & sessionStorage
      saveRoundResult(roundNo, data);

      // 2. Navigate using replace so user cannot use browser Back to guess again!
      navigate(`/play/${gameId}/result/${roundNo}`, { replace: true });
    } catch (err: any) {
      const parsed = await parseSupabaseError(err);
      setErrorMessage(parsed);
      setIsSubmitting(false);
    }
  };

  if (isInitializing || !roundInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-stone-400">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        <span className="text-xs uppercase font-medium tracking-widest font-serif-display">
          Synchronizing Archival Record...
        </span>
      </div>
    );
  }

  return (
    <div className="page-enter w-full">
      <RoundScreen
        roundNumber={roundNo}
        totalRounds={rounds.length || 5}
        runningScore={runningScore}
        roundInfo={roundInfo}
        onSubmitGuess={handleSubmitGuess}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onRetry={() => setErrorMessage(null)}
      />
    </div>
  );
};
