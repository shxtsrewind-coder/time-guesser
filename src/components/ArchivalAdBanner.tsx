import React, { useState } from 'react';
import { ExternalLink, Zap, Compass, Camera, BookOpen } from 'lucide-react';
import { getLocalAdFreeStatus } from '../lib/monetization.ts';

interface ArchivalAdBannerProps {
  onOpenRemoveAds: () => void;
  className?: string;
}

const SPONSORS = [
  {
    tag: 'SPONSORED ARCHIVE',
    title: 'The Cartographic Heritage Trust',
    desc: 'Exploring 400 years of hand-drawn globes, nautical charts, and antique atlas collections.',
    cta: 'Browse Atlas',
    icon: Compass,
    accent: 'border-amber-900/40 bg-amber-950/20 text-amber-400',
  },
  {
    tag: 'SPONSORED ARCHIVE',
    title: 'Vintage Horology & Chronometer Guild',
    desc: 'Restoring mechanical pocket watches and marine chronometers from the 1800s to 1950s.',
    cta: 'View Timepieces',
    icon: Camera,
    accent: 'border-stone-800 bg-stone-950/40 text-stone-300',
  },
  {
    tag: 'SPONSORED ARCHIVE',
    title: 'Historical Photographic Journal',
    desc: 'Quarterly archival prints and daguerreotype restorations delivered to your doorstep.',
    cta: 'Learn More',
    icon: BookOpen,
    accent: 'border-amber-900/40 bg-amber-950/20 text-amber-300',
  },
];

export const ArchivalAdBanner: React.FC<ArchivalAdBannerProps> = ({
  onOpenRemoveAds,
  className = '',
}) => {
  const isAdFree = getLocalAdFreeStatus();
  const [sponsorIndex] = useState(() => Math.floor(Math.random() * SPONSORS.length));

  if (isAdFree) return null;

  const currentSponsor = SPONSORS[sponsorIndex];
  const IconComponent = currentSponsor.icon;

  return (
    <div
      className={`w-full rounded-2xl border ${currentSponsor.accent} p-3 sm:p-3.5 shadow-sm relative transition-all ${className}`}
    >
      <div className="flex items-center justify-between text-[10px] tracking-wider uppercase pb-1.5 border-b border-stone-800/60 text-stone-500 font-mono">
        <span className="flex items-center gap-1 font-semibold text-stone-400">
          <IconComponent className="w-3 h-3 text-amber-500" />
          {currentSponsor.tag}
        </span>
        <button
          type="button"
          onClick={onOpenRemoveAds}
          className="text-amber-500/80 hover:text-amber-400 flex items-center gap-0.5 hover:underline transition-colors lowercase"
        >
          <Zap className="w-2.5 h-2.5" />
          <span>remove ads</span>
        </button>
      </div>

      <div className="pt-2 flex items-center justify-between gap-3">
        <div className="space-y-0.5 max-w-[80%]">
          <h4 className="text-xs font-bold text-stone-200 truncate font-cinzel">
            {currentSponsor.title}
          </h4>
          <p className="text-[11px] text-stone-400 line-clamp-1 leading-snug">
            {currentSponsor.desc}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenRemoveAds}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-700/70 text-stone-300 hover:text-amber-300 text-[11px] font-medium transition-colors flex items-center gap-1"
        >
          <span>{currentSponsor.cta}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};
