import React from 'react';
import { X, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';

interface ScoringInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScoringInfoModal: React.FC<ScoringInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How scoring works"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-200">
              How Scoring Works
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-stone-300">
          {/* Location Scoring */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Location (if asked)</span>
              </div>
              <span className="font-mono text-stone-100">Up to 5,000 pts</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              Points are calculated based on physical distance in kilometers. A pin within a few kilometers earns full points, scaling down smoothly as distance increases.
            </p>
          </div>

          {/* Year Scoring */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Year (always asked)</span>
              </div>
              <span className="font-mono text-stone-100">Up to 5,000 pts</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              An exact year guess awards the full 5,000 points. The closer your estimate, the higher your score, dropping gradually per year of difference.
            </p>
          </div>

          {/* Weekday Scoring */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Day of the Week (if asked)</span>
              </div>
              <span className="font-mono text-stone-100">1,000 pts</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              Guess the exact day of the week (Sun – Sat) the archival photo was captured for a 1,000 point bonus!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
