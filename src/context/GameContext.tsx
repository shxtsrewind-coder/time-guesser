import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GameMode, RoundInfo, SubmitGuessResponse, FinishGameResponse } from '../types.ts';
import { supabase, parseSupabaseError } from '../lib/supabase.ts';

interface SerializedGame {
  gameId: string;
  mode: GameMode;
  rounds: RoundInfo[];
  results: Record<number, SubmitGuessResponse>;
  finishData: FinishGameResponse | null;
  runningScore: number;
  maxTotalScore: number;
  isGameFinished: boolean;
}

interface GameContextType {
  gameId: string | null;
  gameMode: GameMode;
  rounds: RoundInfo[];
  results: Record<number, SubmitGuessResponse>;
  finishData: FinishGameResponse | null;
  runningScore: number;
  maxTotalScore: number;
  isGameFinished: boolean;
  isLoadingGame: boolean;
  gameError: string | null;
  setGameError: (msg: string | null) => void;
  startNewGame: (mode: GameMode) => Promise<{ gameId: string; startingRound: number } | null>;
  ensureGameLoaded: (targetGameId: string) => Promise<boolean>;
  saveRoundResult: (roundNo: number, result: SubmitGuessResponse) => void;
  finishCurrentGame: (targetGameId?: string) => Promise<FinishGameResponse | null>;
  clearGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_PREFIX = 'timeguess_game_';

const preloadImageUrl = (url: string) => {
  if (!url) return;
  const img = new Image();
  img.src = url;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameId, setGameId] = useState<string | null>(() => {
    return sessionStorage.getItem('timeguess_active_id');
  });
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [results, setResults] = useState<Record<number, SubmitGuessResponse>>({});
  const [finishData, setFinishData] = useState<FinishGameResponse | null>(null);
  const [runningScore, setRunningScore] = useState<number>(0);
  const [maxTotalScore, setMaxTotalScore] = useState<number>(25000);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [isLoadingGame, setIsLoadingGame] = useState<boolean>(false);
  const [gameError, setGameError] = useState<string | null>(null);

  // Synchronize state with sessionStorage
  const persistState = useCallback(
    (
      gId: string,
      mode: GameMode,
      rnds: RoundInfo[],
      res: Record<number, SubmitGuessResponse>,
      fData: FinishGameResponse | null,
      score: number,
      maxScore: number,
      finished: boolean
    ) => {
      try {
        const payload: SerializedGame = {
          gameId: gId,
          mode,
          rounds: rnds,
          results: res,
          finishData: fData,
          runningScore: score,
          maxTotalScore: maxScore,
          isGameFinished: finished,
        };
        sessionStorage.setItem(`${STORAGE_PREFIX}${gId}`, JSON.stringify(payload));
        sessionStorage.setItem('timeguess_active_id', gId);
      } catch (e) {
        console.warn('Failed to persist game state to sessionStorage', e);
      }
    },
    []
  );

  // Restore state from sessionStorage if available
  const loadFromStorage = useCallback((targetGameId: string): boolean => {
    try {
      const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${targetGameId}`);
      if (!raw) return false;
      const data: SerializedGame = JSON.parse(raw);
      if (data.gameId === targetGameId) {
        setGameId(data.gameId);
        setGameMode(data.mode);
        setRounds(data.rounds || []);
        setResults(data.results || {});
        setFinishData(data.finishData || null);
        setRunningScore(data.runningScore || 0);
        setMaxTotalScore(data.maxTotalScore || 25000);
        setIsGameFinished(Boolean(data.isGameFinished));

        // Preload all round images immediately
        data.rounds?.forEach((r) => preloadImageUrl(r.image_url));
        return true;
      }
    } catch (e) {
      console.warn('Failed to parse stored game state', e);
    }
    return false;
  }, []);

  // Ensure game is loaded (from memory, session storage, or resume API)
  const ensureGameLoaded = useCallback(
    async (targetGameId: string): Promise<boolean> => {
      if (gameId === targetGameId && rounds.length > 0) {
        return true;
      }

      // Try sessionStorage
      if (loadFromStorage(targetGameId)) {
        return true;
      }

      // Try backend resume via start-game
      setIsLoadingGame(true);
      try {
        const { data, error } = await supabase.functions.invoke('start-game', {
          body: { mode: 'classic' }, // Backend resumes in-progress games automatically
        });

        if (!error && data && data.game_id === targetGameId && data.rounds) {
          setGameId(data.game_id);
          setGameMode(data.mode || 'classic');
          setRounds(data.rounds);
          const computedMax = data.rounds.reduce(
            (sum: number, r: RoundInfo) => sum + (r.max_score || 5000),
            0
          );
          setMaxTotalScore(computedMax);
          persistState(
            data.game_id,
            data.mode || 'classic',
            data.rounds,
            {},
            null,
            0,
            computedMax,
            false
          );
          data.rounds.forEach((r: RoundInfo) => preloadImageUrl(r.image_url));
          return true;
        }
      } catch (err) {
        console.warn('Failed to resume game from backend', err);
      } finally {
        setIsLoadingGame(false);
      }

      return false;
    },
    [gameId, rounds.length, loadFromStorage, persistState]
  );

  // Start a brand new game
  const startNewGame = useCallback(
    async (mode: GameMode): Promise<{ gameId: string; startingRound: number } | null> => {
      setIsLoadingGame(true);
      setGameError(null);

      try {
        const { data, error } = await supabase.functions.invoke('start-game', {
          body: { mode },
        });

        if (error) {
          const parsed = await parseSupabaseError(error);
          setGameError(parsed);
          return null;
        }

        if (!data || !data.game_id || !data.rounds) {
          setGameError('Failed to initialize archival session. Please retry.');
          return null;
        }

        const newGameId = data.game_id;
        const newMode = data.mode || mode;
        const newRounds: RoundInfo[] = data.rounds;

        // Preload all round photographs in background
        newRounds.forEach((r) => preloadImageUrl(r.image_url));

        let startingRound = 1;
        if (data.resumed && data.current_round) {
          startingRound = Math.max(1, Math.min(newRounds.length, data.current_round));
        }

        const computedMax = newRounds.reduce((sum, r) => sum + (r.max_score || 5000), 0);

        setGameId(newGameId);
        setGameMode(newMode);
        setRounds(newRounds);
        setResults({});
        setFinishData(null);
        setRunningScore(0);
        setMaxTotalScore(computedMax);
        setIsGameFinished(false);

        persistState(newGameId, newMode, newRounds, {}, null, 0, computedMax, false);

        return { gameId: newGameId, startingRound };
      } catch (err: any) {
        const parsed = await parseSupabaseError(err);
        setGameError(parsed);
        return null;
      } finally {
        setIsLoadingGame(false);
      }
    },
    [persistState]
  );

  // Save the result of a round
  const saveRoundResult = useCallback(
    (roundNo: number, result: SubmitGuessResponse) => {
      setResults((prev) => {
        const updated = { ...prev, [roundNo]: result };
        const newTotal = result.total_score;
        setRunningScore(newTotal);
        if (result.max_total) {
          setMaxTotalScore(result.max_total);
        }

        // Preload next round photo if roundNo < 5
        const nextRound = rounds.find((r) => r.round_no === roundNo + 1);
        if (nextRound?.image_url) {
          preloadImageUrl(nextRound.image_url);
        }

        if (gameId) {
          persistState(
            gameId,
            gameMode,
            rounds,
            updated,
            finishData,
            newTotal,
            result.max_total || maxTotalScore,
            isGameFinished
          );
        }
        return updated;
      });
    },
    [gameId, gameMode, rounds, finishData, maxTotalScore, isGameFinished, persistState]
  );

  // Finish current game
  const finishCurrentGame = useCallback(
    async (targetGameId?: string): Promise<FinishGameResponse | null> => {
      const gId = targetGameId || gameId;
      if (!gId) return null;

      try {
        const { data, error } = await supabase.functions.invoke<FinishGameResponse>('finish-game', {
          body: { game_id: gId },
        });

        const fallbackRoundScores = Object.entries(results).map(([numStr, res]) => ({
          round_no: parseInt(numStr, 10),
          score: res.score,
          max_score: res.round_max,
          year_score: res.year_score,
          location_score: res.location_score ?? undefined,
          weekday_score: res.weekday_score ?? undefined,
        }));

        const finalData: FinishGameResponse = data || {
          total_score: runningScore,
          max_score: maxTotalScore,
          round_scores: fallbackRoundScores,
        };

        setFinishData(finalData);
        setIsGameFinished(true);

        persistState(
          gId,
          gameMode,
          rounds,
          results,
          finalData,
          finalData.total_score,
          finalData.max_score,
          true
        );

        return finalData;
      } catch (err) {
        console.warn('finish-game failed, using local accumulator', err);
        const fallbackRoundScores = Object.entries(results).map(([numStr, res]) => ({
          round_no: parseInt(numStr, 10),
          score: res.score,
          max_score: res.round_max,
          year_score: res.year_score,
          location_score: res.location_score ?? undefined,
          weekday_score: res.weekday_score ?? undefined,
        }));

        const finalData: FinishGameResponse = {
          total_score: runningScore,
          max_score: maxTotalScore,
          round_scores: fallbackRoundScores,
        };

        setFinishData(finalData);
        setIsGameFinished(true);

        persistState(
          gId,
          gameMode,
          rounds,
          results,
          finalData,
          runningScore,
          maxTotalScore,
          true
        );

        return finalData;
      }
    },
    [gameId, results, runningScore, maxTotalScore, gameMode, rounds, persistState]
  );

  const clearGame = useCallback(() => {
    if (gameId) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
    }
    sessionStorage.removeItem('timeguess_active_id');
    setGameId(null);
    setRounds([]);
    setResults({});
    setFinishData(null);
    setRunningScore(0);
    setIsGameFinished(false);
  }, [gameId]);

  return (
    <GameContext.Provider
      value={{
        gameId,
        gameMode,
        rounds,
        results,
        finishData,
        runningScore,
        maxTotalScore,
        isGameFinished,
        isLoadingGame,
        gameError,
        setGameError,
        startNewGame,
        ensureGameLoaded,
        saveRoundResult,
        finishCurrentGame,
        clearGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
