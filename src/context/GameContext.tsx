import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GameMode, RoundInfo, SubmitGuessResponse, FinishGameResponse } from '../types.ts';
import { supabase, parseSupabaseError } from '../lib/supabase.ts';
import { recordDailyCompletion, getTodayKey } from '../lib/streak.ts';

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

const preloadImageUrl = (url: string, priority: 'high' | 'low' = 'high') => {
  if (!url) return;
  const img = new Image();
  // Background prefetches must not compete with the image the player is
  // actually waiting on right now — without this every preload races the
  // visible round's photo for bandwidth at equal priority, which is why
  // the "current" photo could take forever even though it was the only
  // one the player needed immediately.
  try {
    (img as any).fetchPriority = priority;
  } catch {
    // Older browsers without fetchPriority support just ignore this.
  }
  img.decoding = 'async';
  img.src = url;
};

// Preload the round(s) the player is about to see at full priority, and push
// everything further out to a low-priority prefetch once the browser is idle
// so a 5-photo game doesn't open five equal-priority requests at once and
// starve the very first photo the player is staring at.
const preloadRounds = (allRounds: RoundInfo[], fromRoundNo: number) => {
  const sorted = [...allRounds].sort((a, b) => a.round_no - b.round_no);
  const upcoming = sorted.filter((r) => r.round_no >= fromRoundNo);
  const [immediate, ...rest] = upcoming;
  if (immediate?.image_url) preloadImageUrl(immediate.image_url, 'high');

  const next = rest[0];
  if (next?.image_url) preloadImageUrl(next.image_url, 'high');

  const later = rest.slice(1);
  if (later.length === 0) return;

  const schedule =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 2000 })
      : (cb: () => void) => setTimeout(cb, 300);

  schedule(() => {
    later.forEach((r) => {
      if (r.image_url) preloadImageUrl(r.image_url, 'low');
    });
  });
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameId, setGameId] = useState<string | null>(() => {
    return sessionStorage.getItem('timeguess_active_id');
  });
  const [gameMode, setGameMode] = useState<GameMode>('daily');
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

        // Preload the current and upcoming round images, current round first
        const resumeFrom = (data.rounds || []).find((r) => !data.results?.[r.round_no])?.round_no ?? 1;
        if (data.rounds?.length) preloadRounds(data.rounds, resumeFrom);
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
          body: { mode: 'daily' }, // Backend resumes in-progress games automatically
        });

        if (!error && data && data.game_id === targetGameId && data.rounds) {
          setGameId(data.game_id);
          setGameMode(data.mode || 'daily');
          setRounds(data.rounds);
          const computedMax = data.rounds.reduce(
            (sum: number, r: RoundInfo) => sum + (r.max_score || 5000),
            0
          );
          setMaxTotalScore(computedMax);
          persistState(
            data.game_id,
            data.mode || 'daily',
            data.rounds,
            {},
            null,
            0,
            computedMax,
            false
          );
          const resumeFrom = Math.max(1, Math.min(data.rounds.length, data.current_round || 1));
          preloadRounds(data.rounds, resumeFrom);
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
        // Ensure user has at least an anonymous session before calling start-game function
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          const { error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) {
            console.warn('Anonymous sign in on play error:', anonError);
            setGameError('Could not start game. Please check your internet connection and try again.');
            setIsLoadingGame(false);
            return null;
          }
        }

        const { data, error } = await supabase.functions.invoke('start-game', {
          body: { mode },
        });

        if (error) {
          const parsed = await parseSupabaseError(error);
          if (parsed.includes('daily_already_played')) {
            try {
              localStorage.setItem(`timeguess_daily_completed_${getTodayKey()}`, 'true');
            } catch {
              // ignore
            }
          }
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

        if (newMode === 'daily') {
          try {
            localStorage.setItem('timeguess_today_daily_rounds', JSON.stringify(newRounds));
          } catch {
            // ignore
          }
        }

        let startingRound = 1;
        if (data.resumed && data.current_round) {
          startingRound = Math.max(1, Math.min(newRounds.length, data.current_round));
        }

        // Preload the starting round + the next one at full priority; the rest
        // trickle in at low priority once the browser is idle (see preloadRounds).
        preloadRounds(newRounds, startingRound);

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

        if (gameMode === 'daily') {
          try {
            recordDailyCompletion(finalData.total_score, finalData.max_score);
          } catch (e) {
            console.warn('Failed to record daily streak', e);
          }
        }

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

        if (gameMode === 'daily') {
          try {
            recordDailyCompletion(finalData.total_score, finalData.max_score);
          } catch (e) {
            console.warn('Failed to record daily streak', e);
          }
        }

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
