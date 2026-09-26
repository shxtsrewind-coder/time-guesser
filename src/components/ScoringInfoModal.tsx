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
        className="w-full max-w-sm bg-[#141210] border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-200 font-mono">
              Scoring Mechanics
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-stone-300">
          {/* Location Scoring */}
          <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Geographic Location</span>
              </div>
              <span className="font-mono text-stone-100">Up to 5,000 pts</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              Calculated using true geodesic distance in kilometers. A pin within a few kilometers earns maximum points, tapering smoothly as separation increases.
            </p>
          </div>

          {/* Year Scoring */}
          <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Chronological Year</span>
              </div>
              <span className="font-mono text-stone-100">Up to 5,000 pts</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              An exact year guess awards 5,000 points. The closer your deduction, the higher your score, scaling down gradually per year of difference.
            </p>
          </div>

          {/* Weekday Scoring */}
          <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Day of the Week</span>
              </div>
              <span className="font-mono text-stone-100">1,000 pts</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              When requested, correctly identify Sunday through Saturday for a 1,000 point calendar intuition bonus!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
