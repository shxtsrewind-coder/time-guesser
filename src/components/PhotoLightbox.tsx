import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface PhotoLightboxProps {
  imageUrl: string;
  altText?: string;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ imageUrl, altText, onClose }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => (prev === 1 ? 2 : 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged photo view"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-between z-10 max-w-xl mx-auto pt-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleZoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900/80 border border-stone-700 text-stone-300 text-xs hover:text-white transition-colors"
            title={scale === 1 ? "Zoom In" : "Zoom Out"}
          >
            {scale === 1 ? <ZoomIn className="w-4 h-4 text-amber-400" /> : <ZoomOut className="w-4 h-4 text-amber-400" />}
            <span>{scale === 1 ? "Zoom 2x" : "Reset Zoom"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-white transition-colors"
          aria-label="Close zoomed photo"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main image container */}
      <div 
        className="flex-1 w-full max-w-3xl flex items-center justify-center overflow-auto py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={altText || 'Historical archival photograph'}
          referrerPolicy="no-referrer"
          onClick={toggleZoom}
          style={{ transform: `scale(${scale})` }}
          className={`max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200 select-none cursor-pointer ${scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        />
      </div>

      {/* Hint footer */}
      <div className="text-stone-500 text-xs pb-1 tracking-wide" onClick={(e) => e.stopPropagation()}>
        Tap photo or button to toggle zoom · Tap background or ✕ to close
      </div>
    </div>
  );
};
