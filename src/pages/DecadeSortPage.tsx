import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Trophy,
  RotateCcw,
  Flame,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ArrowLeft,
  Crown,
  HelpCircle,
  Eye,
  GripVertical,
  Clock,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { supabase, imageUrl, parseSupabaseError } from '../lib/supabase.ts';
import { DecadeSortPhoto, DecadeSortSubmitResponse, DecadeSortCorrectPhoto } from '../types.ts';
import { PhotoLightbox } from '../components/PhotoLightbox.tsx';

interface DecadeSortPageProps {
  onOpenRemoveAds?: () => void;
  isAnonymous?: boolean;
  onOpenSaveProgress?: () => void;
  onOpenLogin?: () => void;
}

export const DecadeSortPage: React.FC<DecadeSortPageProps> = ({
  onOpenSaveProgress,
  onOpenLogin,
}) => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [roundId, setRoundId] = useState<string | null>(null);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [photosMap, setPhotosMap] = useState<Record<string, DecadeSortPhoto>>({});
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  // Result state
  const [result, setResult] = useState<DecadeSortSubmitResponse | null>(null);
  const [activeResultView, setActiveResultView] = useState<'chronological' | 'your_guess'>('chronological');

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt?: string } | null>(null);

  // HTML5 Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 1. Start a new round
  const startRound = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setHasInteracted(false);

    try {
      // Ensure user has at least an anonymous session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        await supabase.auth.signInAnonymously();
      }

      const { data, error } = await supabase.functions.invoke('start-decade-sort', {
        body: {},
      });

      if (error) {
        const parsed = await parseSupabaseError(error);
        throw new Error(parsed);
      }

      if (!data?.round_id || !Array.isArray(data?.photos) || data.photos.length === 0) {
        throw new Error('Unable to initialize Decade Sort challenge. Please try again.');
      }

      const roundDirection: 'asc' | 'desc' = data.direction === 'desc' ? 'desc' : 'asc';
      setDirection(roundDirection);

      const pMap: Record<string, DecadeSortPhoto> = {};
      const ids: string[] = [];

      data.photos.forEach((p: DecadeSortPhoto) => {
        pMap[p.photo_id] = p;
        ids.push(p.photo_id);
      });

      setRoundId(data.round_id);
      setPhotosMap(pMap);
      setOrderedIds(ids);

      // Preload images
      data.photos.forEach((p: DecadeSortPhoto) => {
        const fullUrl = imageUrl(p.image_url);
        if (fullUrl) {
          const img = new Image();
          img.src = fullUrl;
        }
      });
    } catch (err: any) {
      console.error('Failed to start Decade Sort:', err);
      setErrorMsg(err.message || 'Failed to start Decade Sort.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startRound();
  }, [startRound]);

  // 2. Reordering methods
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedIds.length) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setHasInteracted(true);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveItem(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 3. Submit Order
  const handleSubmit = async () => {
    if (!roundId || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke('submit-decade-sort', {
        body: {
          round_id: roundId,
          ordered_photo_ids: orderedIds,
        },
      });

      if (error) {
        const parsed = await parseSupabaseError(error);
        throw new Error(parsed);
      }

      setResult(data);

      if (data?.direction) {
        setDirection(data.direction === 'desc' ? 'desc' : 'asc');
      }

      if (data?.streak !== null && data?.streak !== undefined) {
        window.dispatchEvent(
          new CustomEvent('timeguess_decade_streak_updated', {
            detail: { streak: data.streak },
          })
        );
      }
    } catch (err: any) {
      console.error('Failed to submit Decade Sort:', err);
      setErrorMsg(err.message || 'Failed to submit Decade Sort guess.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAsc = direction === 'asc';
  const finalDirection = result?.direction || direction || 'asc';
  const isFinalAsc = finalDirection === 'asc';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 page-enter">
      {/* Lightbox for zooming photos */}
      {lightboxImage && (
        <PhotoLightbox
          imageUrl={lightboxImage.url}
          altText={lightboxImage.alt || 'Archival photograph'}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-850 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title="Return to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 uppercase tracking-wide">
                Decade Sort
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                5 Photos
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {isAsc
                ? 'Arrange photographs in chronological order: oldest to newest.'
                : 'Arrange photographs in reverse order: newest to oldest.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/leaderboard?tab=decade_sort')}
            className="py-2 px-3.5 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-800 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={startRound}
            className="py-1 px-3 rounded-lg bg-rose-900 hover:bg-rose-850 text-rose-100 font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-stone-200 font-cinzel">Shuffling Archival Photos...</p>
            <p className="text-xs text-stone-500">Preparing your 5-photograph timeline challenge</p>
          </div>
        </div>
      ) : result ? (
        /* ================= RESULTS SCREEN ================= */
        <div className="space-y-6 animate-fade-in">
          {/* Celebratory Banner */}
          <div
            className={`p-6 sm:p-8 rounded-2xl border text-center space-y-3 relative overflow-hidden ${
              result.is_perfect
                ? 'bg-gradient-to-b from-amber-950/50 via-[#181410] to-[#120f0d] border-amber-500/60 shadow-2xl shadow-amber-950/40'
                : 'bg-[#141210] border-stone-800 shadow-xl'
            }`}
          >
            {result.is_perfect && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold text-xs uppercase tracking-widest font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Perfect Sort!</span>
              </div>
            )}

            <h2 className="text-3xl sm:text-4xl font-black font-cinzel text-stone-100 tracking-wide">
              {result.is_perfect ? 'Flawless Chronology!' : 'Decade Sort Complete'}
            </h2>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-750 text-xs font-mono font-semibold text-stone-300">
              <span className="text-amber-400">Target Order:</span>
              <span className="font-bold text-stone-100">
                {isFinalAsc ? 'Oldest → Newest' : 'Newest → Oldest'}
              </span>
            </div>

            <p className="text-sm text-stone-400 max-w-md mx-auto">
              You correctly aligned{' '}
              <strong className="text-amber-400 font-mono">
                {result.correct_pairs}/{result.total_pairs} pairs
              </strong>{' '}
              in their requested order.
            </p>

            {/* Metrics cards row */}
            <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
              {/* Score */}
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl">
                <div className="text-[10px] font-mono uppercase text-stone-500">Score Earned</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-0.5">
                  +{result.score.toLocaleString()}
                </div>
              </div>

              {/* Accuracy */}
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl">
                <div className="text-[10px] font-mono uppercase text-stone-500">Pairs Correct</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-stone-100 mt-0.5">
                  {result.correct_pairs} <span className="text-xs text-stone-500 font-sans">/ 10</span>
                </div>
              </div>

              {/* Streak */}
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono uppercase text-stone-500">Current Streak</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-0.5 flex items-center justify-center gap-1">
                  {result.streak !== null ? (
                    <>
                      <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span>{result.streak}</span>
                    </>
                  ) : (
                    <span className="text-stone-500 text-sm font-sans">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Guest Streak Sign-In Prompt */}
            {result.streak === null && (
              <div className="max-w-md mx-auto mt-4 p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Sign in to track your streak &amp; rank globally!</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenSaveProgress || onOpenLogin}
                  className="py-1 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shrink-0 cursor-pointer active:scale-95"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Results Comparison View */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-cinzel">
                  {isFinalAsc ? 'Chronological Breakdown (Oldest → Newest)' : 'Reverse Chronological Breakdown (Newest → Oldest)'}
                </h3>
                <p className="text-xs text-stone-400">
                  Real years and captions revealed matching the requested order.
                </p>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveResultView('chronological')}
                  className={`py-1 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeResultView === 'chronological'
                      ? 'bg-amber-600 text-stone-950 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Target Order
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultView('your_guess')}
                  className={`py-1 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeResultView === 'your_guess'
                      ? 'bg-amber-600 text-stone-950 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Your Order
                </button>
              </div>
            </div>

            {/* List of cards */}
            <div className="space-y-3">
              {activeResultView === 'chronological' ? (
                // Target chronological order view
                result.correct_order.map((item, idx) => {
                  const pInfo = photosMap[item.photo_id];
                  const fullUrl = pInfo ? imageUrl(pInfo.image_url) : '';
                  const playerPos = result.your_order.indexOf(item.photo_id) + 1;
                  const isExact = playerPos === idx + 1;

                  const stepLabel =
                    idx === 0
                      ? isFinalAsc ? 'Oldest' : 'Newest'
                      : idx === result.correct_order.length - 1
                      ? isFinalAsc ? 'Newest' : 'Oldest'
                      : `Step ${idx + 1}`;

                  return (
                    <div
                      key={item.photo_id}
                      className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isExact
                          ? 'bg-[#141812] border-emerald-800/80 shadow-sm'
                          : 'bg-[#151210] border-stone-800'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {/* Chronological Rank Badge */}
                        <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-750 flex items-center justify-center font-mono font-bold text-amber-400 text-sm shrink-0">
                          #{idx + 1}
                        </div>

                        {/* Thumbnail with zoom click */}
                        <div
                          onClick={() => setLightboxImage({ url: fullUrl, alt: item.caption })}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-stone-750 bg-stone-950 shrink-0 cursor-zoom-in relative group"
                        >
                          <img
                            src={fullUrl}
                            alt={item.caption}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-4 h-4 text-stone-200" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black font-cinzel text-amber-400 tracking-wider">
                              {item.true_year}
                            </span>
                            {isExact ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Exact Position</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-900 border border-stone-750 text-stone-400">
                                You placed #{playerPos}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
                            {item.caption}
                          </p>
                        </div>
                      </div>

                      {/* Right indicator */}
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-stone-500 uppercase block">Timeline Target</span>
                        <span className="text-xs font-semibold text-stone-400">
                          {stepLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Player's submitted order view
                result.your_order.map((photoId, idx) => {
                  const correctItem = result.correct_order.find((c) => c.photo_id === photoId);
                  const pInfo = photosMap[photoId];
                  const fullUrl = pInfo ? imageUrl(pInfo.image_url) : '';
                  const correctPos = result.correct_order.findIndex((c) => c.photo_id === photoId) + 1;
                  const isExact = correctPos === idx + 1;

                  return (
                    <div
                      key={photoId}
                      className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isExact
                          ? 'bg-[#141812] border-emerald-800/80'
                          : 'bg-[#171210] border-amber-900/40'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-750 flex items-center justify-center font-mono font-bold text-stone-300 text-sm shrink-0">
                          #{idx + 1}
                        </div>

                        <div
                          onClick={() => setLightboxImage({ url: fullUrl, alt: correctItem?.caption })}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-stone-750 bg-stone-950 shrink-0 cursor-zoom-in relative group"
                        >
                          <img
                            src={fullUrl}
                            alt={correctItem?.caption || 'Photo'}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-4 h-4 text-stone-200" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black font-cinzel text-amber-400">
                              {correctItem?.true_year}
                            </span>
                            {isExact ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 border border-emerald-700/80 text-emerald-300">
                                Correct spot!
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 border border-amber-800/80 text-amber-300">
                                Should be #{correctPos}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
                            {correctItem?.caption}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-stone-500 uppercase block">Your Guess</span>
                        <span className="text-xs font-semibold text-stone-400">Position #{idx + 1}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 text-xs font-bold transition-all cursor-pointer text-center"
            >
              Back to Home
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/leaderboard?tab=decade_sort')}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-800 text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>View Standings</span>
              </button>

              <button
                type="button"
                onClick={startRound}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/30 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= GAMEPLAY SORTING SCREEN ================= */
        <div className="space-y-6">
          {/* Prominent Direction & Instruction Banner */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
              isAsc
                ? 'bg-gradient-to-r from-amber-950/40 via-[#181410] to-[#141210] border-amber-500/50'
                : 'bg-gradient-to-r from-cyan-950/40 via-[#14161b] to-[#141210] border-cyan-400/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-md ${
                  isAsc
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                }`}
              >
                <ArrowDown className="w-5 h-5 animate-pulse" />
              </div>

              <div>
                <h2
                  className={`text-sm sm:text-base font-bold font-cinzel tracking-wider uppercase ${
                    isAsc ? 'text-amber-300' : 'text-cyan-300'
                  }`}
                >
                  {isAsc ? 'Order: Oldest (Top) → Newest (Bottom)' : 'Order: Newest (Top) → Oldest (Bottom)'}
                </h2>
                <p className="text-xs text-slate-400">
                  Drag cards or tap arrow buttons to arrange into historical timeline order.
                </p>
              </div>
            </div>
          </div>

          {/* Draggable Cards List */}
          <div className="space-y-2.5 sm:space-y-3">
            {orderedIds.map((photoId, index) => {
              const photo = photosMap[photoId];
              const fullUrl = photo ? imageUrl(photo.image_url) : '';
              const isFirst = index === 0;
              const isLast = index === orderedIds.length - 1;
              const isDraggingThis = draggedIndex === index;
              const isOverThis = dragOverIndex === index;

              return (
                <div
                  key={photoId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all duration-150 select-none ${
                    isDraggingThis
                      ? 'opacity-40 border-amber-500/40 bg-slate-900/40 scale-[0.98]'
                      : isOverThis
                      ? isAsc
                        ? 'border-amber-400 bg-amber-950/20 shadow-lg'
                        : 'border-cyan-400 bg-cyan-950/20 shadow-lg'
                      : 'border-slate-800 bg-[#0b1120] hover:border-slate-700 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5 sm:gap-4">
                    {/* Left: Drag grip & Position rank */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                      <div
                        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5 sm:p-1 touch-none"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>

                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-inner ${
                          isFirst
                            ? isAsc
                              ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                              : 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                            : isLast
                            ? isAsc
                              ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                              : 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                            : 'bg-slate-900 border-slate-750 text-slate-300'
                        }`}
                      >
                        #{index + 1}
                      </div>
                    </div>

                    {/* Photo thumbnail */}
                    <div
                      onClick={() => setLightboxImage({ url: fullUrl, alt: 'Photo' })}
                      className="w-16 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden border border-slate-750 bg-slate-950 shrink-0 cursor-zoom-in relative group"
                    >
                      <img
                        src={fullUrl}
                        alt="Historical photograph"
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
                      </div>
                    </div>

                    {/* Middle: Details & Zoom prompt */}
                    <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                      <div className="text-xs font-bold text-slate-200">
                        <span>Photo #{index + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxImage({ url: fullUrl, alt: 'Photo' })}
                        className="mt-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Clues</span>
                      </button>
                    </div>

                    {/* Right: Reorder button controls (Accessible on touch & desktop) */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItem(index, index - 1)}
                        className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95"
                        title={isAsc ? 'Move Up (Toward Oldest)' : 'Move Up (Toward Newest)'}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItem(index, index + 1)}
                        className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95"
                        title={isAsc ? 'Move Down (Toward Newest)' : 'Move Down (Toward Oldest)'}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky/Floating Bottom Submission Bar */}
          <div className="sticky bottom-3 sm:bottom-4 z-30 p-3 sm:p-4 bg-[#0b1120]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-100 block">
                Ready to submit {isAsc ? 'Oldest → Newest' : 'Newest → Oldest'} order?
              </span>
              <p className="text-[11px] text-slate-400">
                Scored on all 10 pairwise comparisons in sequence.
              </p>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className={`py-3 px-6 sm:px-8 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50 text-slate-950 ${
                isAsc
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 shadow-amber-950/40 hover:brightness-110'
                  : 'bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 shadow-cyan-950/40 hover:brightness-110'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Grading Chronology...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Submit Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecadeSortPage;
