import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Maximize2, Minimize2, RotateCcw, Globe, Compass, X } from 'lucide-react';

interface GuessMapProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

const REGIONS = [
  { name: 'World', center: [20, 0] as [number, number], zoom: 2 },
  { name: 'Europe', center: [50, 15] as [number, number], zoom: 4 },
  { name: 'N. America', center: [40, -98] as [number, number], zoom: 3 },
  { name: 'Asia', center: [34, 100] as [number, number], zoom: 3 },
  { name: 'Africa', center: [2, 22] as [number, number], zoom: 3 },
  { name: 'S. America', center: [-15, -60] as [number, number], zoom: 3 },
  { name: 'Oceania', center: [-25, 135] as [number, number], zoom: 4 },
];

const createAnimatedPinIcon = () => {
  return L.divIcon({
    className: 'custom-guess-pin-wrapper',
    html: `
      <div style="position:relative; width:34px; height:34px; transform:translate(-50%, -100%);">
        <!-- Radar pulse ring -->
        <div class="map-marker-pulse"></div>

        <!-- Pin head -->
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
            width: 10px;
            height: 10px;
            background: #171513;
            border: 2px solid #fef3c7;
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

export const GuessMap: React.FC<GuessMapProps> = ({ lat, lng, onChange, disabled }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeRegion, setActiveRegion] = useState('World');

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false,
      scrollWheelZoom: false, // Prevents accidental scroll hijacking on page
    });

    // Custom positioned zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      let normalizedLng = ((e.latlng.lng + 180) % 360 + 360) % 360 - 180;
      let clampedLat = Math.max(-85, Math.min(85, e.latlng.lat));
      onChange(clampedLat, normalizedLng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync marker when lat/lng change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (lat !== null && lng !== null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: createAnimatedPinIcon(),
          draggable: !disabled,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          let normalizedLng = ((pos.lng + 180) % 360 + 360) % 360 - 180;
          let clampedLat = Math.max(-85, Math.min(85, pos.lat));
          onChange(clampedLat, normalizedLng);
        });

        markerRef.current = marker;
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lng, disabled, onChange]);

  // Handle map size changes on fullscreen or layout resize
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 120);
    return () => clearTimeout(timeout);
  }, [isFullscreen]);

  const handleFlyToRegion = (region: typeof REGIONS[0]) => {
    setActiveRegion(region.name);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(region.center, region.zoom, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  };

  const handleResetPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([20, 0], 2, { duration: 0.6 });
      setActiveRegion('World');
    }
  };

  const formatCoord = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    return `${Math.abs(val).toFixed(1)}° ${dir}`;
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-stone-800 bg-[#12100e] transition-all shadow-xl group ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'w-full h-[320px] sm:h-[360px] md:h-full min-h-[300px]'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Top Left: Region Navigation Chips Bar */}
      <div className="absolute top-3 left-3 right-14 z-10 pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 bg-[#0c0a09]/90 backdrop-blur-md border border-stone-800/90 p-1 rounded-xl shadow-lg shrink-0">
          <Compass className="w-3.5 h-3.5 text-amber-500 ml-1.5 shrink-0" />
          <div className="flex items-center gap-1 px-1">
            {REGIONS.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => handleFlyToRegion(r)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeRegion === r.name
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Left: Coordinates HUD & Status */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-auto max-w-[calc(100%-80px)]">
        {lat !== null && lng !== null ? (
          <div className="bg-[#0c0a09]/95 backdrop-blur-md border border-stone-800 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="font-mono text-stone-200 text-[11px] font-semibold truncate">
              {formatCoord(lat, true)}, {formatCoord(lng, false)}
            </span>
            <span className="text-[10px] text-stone-500 hidden sm:inline">· Drag marker to adjust</span>
          </div>
        ) : (
          <div className="bg-[#0c0a09]/90 backdrop-blur-md border border-stone-800/90 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 text-[11px] text-stone-300">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Click or tap map to drop your guess pin</span>
          </div>
        )}
      </div>

      {/* Bottom Right: Action Controls (Reset & Fullscreen) */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleResetPin}
          title="Reset View to World"
          aria-label="Reset Map View"
          className="p-2.5 rounded-xl bg-[#0c0a09]/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-white shadow-lg transition-colors cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Map'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Map'}
          className="p-2.5 rounded-xl bg-[#0c0a09]/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-amber-400 shadow-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
