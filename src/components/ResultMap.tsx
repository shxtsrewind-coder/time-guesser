import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2, Navigation, Target, RotateCcw } from 'lucide-react';

interface ResultMapProps {
  guessLat: number;
  guessLng: number;
  actualLat: number;
  actualLng: number;
  distanceKm: number | null;
}

const createPlayerPinIcon = () => {
  return L.divIcon({
    className: 'player-guess-pin-wrapper',
    html: `
      <div style="position:relative; width:34px; height:34px; transform:translate(-50%, -100%);">
        <div class="map-marker-pulse"></div>
        <div style="
          position: relative;
          width: 34px;
          height: 34px;
          background: radial-gradient(circle at 35% 35%, #fef3c7 0%, #f59e0b 50%, #b45309 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #fffbeb;
          box-shadow: 0 4px 16px rgba(0,0,0,0.7), 0 0 16px rgba(245, 158, 11, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: #fff;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
};

const createActualPinIcon = () => {
  return L.divIcon({
    className: 'actual-location-pin-wrapper',
    html: `
      <div style="position:relative; width:36px; height:36px; transform:translate(-50%, -100%);">
        <div class="map-marker-pulse-green"></div>
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          background: radial-gradient(circle at 35% 35%, #ecfdf5 0%, #10b981 50%, #047857 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ecfdf5;
          box-shadow: 0 4px 18px rgba(0,0,0,0.7), 0 0 20px rgba(16,185,129,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

export const ResultMap: React.FC<ResultMapProps> = ({
  guessLat,
  guessLng,
  actualLat,
  actualLng,
  distanceKm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fitBoundsSmooth = (map: L.Map) => {
    const bounds = L.latLngBounds([[guessLat, guessLng], [actualLat, actualLng]]);
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 14,
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      worldCopyJump: true,
      scrollWheelZoom: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const guessMarker = L.marker([guessLat, guessLng], {
      icon: createPlayerPinIcon(),
      title: 'Your Guess',
    }).addTo(map);
    guessMarker.bindPopup('<b style="color:#d97706">Your Guess</b>');

    const actualMarker = L.marker([actualLat, actualLng], {
      icon: createActualPinIcon(),
      title: 'Actual Location',
    }).addTo(map);
    actualMarker.bindPopup('<b style="color:#10b981">Actual Historic Location</b>');

    // Dashed trajectory line between guess and actual
    L.polyline(
      [
        [guessLat, guessLng],
        [actualLat, actualLng],
      ],
      {
        color: '#f59e0b',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '8, 8',
      }
    ).addTo(map);

    fitBoundsSmooth(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [guessLat, guessLng, actualLat, actualLng]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        fitBoundsSmooth(mapInstanceRef.current);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen, guessLat, guessLng, actualLat, actualLng]);

  const handleRefocus = () => {
    if (mapInstanceRef.current) {
      fitBoundsSmooth(mapInstanceRef.current);
    }
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-stone-800 bg-[#12100e] transition-all shadow-xl ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'w-full h-[320px] sm:h-[360px] md:h-full min-h-[300px]'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left: Legend and Distance badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-[#0c0a09]/95 backdrop-blur-md border border-stone-800 px-3 py-2 rounded-xl text-xs shadow-xl space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
              <span className="text-stone-300 text-[11px] font-medium">Your Pin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
              <span className="text-stone-300 text-[11px] font-medium">Actual</span>
            </div>
          </div>
          {distanceKm !== null && (
            <div className="text-xs text-amber-300 font-mono font-bold pt-1 border-t border-stone-800/80 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400 rotate-45" />
              <span>{Math.round(distanceKm).toLocaleString()} km separation</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Right: Refocus and Fullscreen */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleRefocus}
          title="Refit Markers"
          aria-label="Refit markers in view"
          className="p-2.5 rounded-xl bg-[#0c0a09]/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-white shadow-lg transition-colors cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enlarge Map'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enlarge Map'}
          className="p-2.5 rounded-xl bg-[#0c0a09]/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-amber-400 shadow-lg transition-colors flex items-center gap-1 text-xs cursor-pointer active:scale-95"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="text-[11px] font-medium hidden xs:inline">
            {isFullscreen ? 'Close' : 'Enlarge'}
          </span>
        </button>
      </div>
    </div>
  );
};
