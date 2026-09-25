import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Maximize2, Minimize2, Navigation } from 'lucide-react';

interface ResultMapProps {
  guessLat: number;
  guessLng: number;
  actualLat: number;
  actualLng: number;
  distanceKm: number | null;
}

const createPlayerPinIcon = () => {
  return L.divIcon({
    className: 'player-guess-pin',
    html: `
      <div style="position:relative; width:30px; height:30px; transform:translate(-50%, -100%);">
        <div style="
          width: 30px;
          height: 30px;
          background: #d97706;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #fef3c7;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
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
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

const createActualPinIcon = () => {
  return L.divIcon({
    className: 'actual-location-pin',
    html: `
      <div style="position:relative; width:32px; height:32px; transform:translate(-50%, -100%);">
        <div style="
          width: 32px;
          height: 32px;
          background: #10b981;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #d1fae5;
          box-shadow: 0 4px 14px rgba(16,185,129,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
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
    iconSize: [32, 32],
    iconAnchor: [16, 32],
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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      worldCopyJump: true,
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
    actualMarker.bindPopup('<b style="color:#10b981">Actual Location</b>');

    // Dashed line between guess and actual
    const line = L.polyline(
      [
        [guessLat, guessLng],
        [actualLat, actualLng],
      ],
      {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 8',
      }
    ).addTo(map);

    // Fit bounds
    const bounds = L.latLngBounds([[guessLat, guessLng], [actualLat, actualLng]]);
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 14,
    });

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
        const bounds = L.latLngBounds([[guessLat, guessLng], [actualLat, actualLng]]);
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14,
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen, guessLat, guessLng, actualLat, actualLng]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'w-full h-64'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Legend & Distance info */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-stone-900/90 backdrop-blur-md border border-stone-700/80 px-3 py-1.5 rounded-xl text-xs shadow-lg space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="text-stone-300 text-[11px] font-medium">Your Guess</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span className="text-stone-300 text-[11px] font-medium">Actual</span>
            </div>
          </div>
          {distanceKm !== null && (
            <div className="text-[11px] text-amber-300 font-mono font-semibold pt-0.5 border-t border-stone-800/80 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-amber-400 rotate-45" />
              <span>{Math.round(distanceKm).toLocaleString()} km away</span>
            </div>
          )}
        </div>
      </div>

      {/* Enlarge toggle */}
      <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-amber-400 shadow-md transition-colors flex items-center gap-1 text-xs"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="text-[11px] font-medium hidden xs:inline">
            {isFullscreen ? 'Close Map' : 'Enlarge'}
          </span>
        </button>
      </div>
    </div>
  );
};
