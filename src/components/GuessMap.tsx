import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Maximize2, Minimize2, RotateCcw, Compass, Plus, Minus } from 'lucide-react';

interface GuessMapProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
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
      <div style="position:relative; width:48px; height:48px; transform:translate(-50%, -100%); cursor:grab; touch-action:none;" class="touch-manipulation">
        <!-- Radar pulse ring -->
        <div class="map-marker-pulse"></div>

        <!-- Touch target & Pin head -->
        <div style="
          position: absolute;
          top: 2px;
          left: 4px;
          width: 40px;
          height: 40px;
          background: radial-gradient(circle at 35% 35%, #fef3c7 0%, #f59e0b 55%, #b45309 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2.5px solid #fffbeb;
          box-shadow: 0 4px 18px rgba(0,0,0,0.7), 0 0 20px rgba(245, 158, 11, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        ">
          <div style="
            width: 12px;
            height: 12px;
            background: #090d16;
            border: 2px solid #fef3c7;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
  });
};

export const GuessMap: React.FC<GuessMapProps> = ({
  lat,
  lng,
  onChange,
  disabled,
  isExpanded: externalIsExpanded,
  onToggleExpand,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const [activeRegion, setActiveRegion] = useState('World');

  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalFullscreen;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalFullscreen(!internalFullscreen);
    }
  };

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false, // Custom thumb-friendly bottom-right controls used instead
      scrollWheelZoom: false, // Prevents accidental scroll hijacking on page
      touchZoom: true, // Native pinch-to-zoom
      doubleClickZoom: true, // Double tap to zoom in
    });

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
          autoPan: true,
        }).addTo(map);

        const handleMarkerPositionChange = () => {
          const pos = marker.getLatLng();
          let normalizedLng = ((pos.lng + 180) % 360 + 360) % 360 - 180;
          let clampedLat = Math.max(-85, Math.min(85, pos.lat));
          onChange(clampedLat, normalizedLng);
        };

        marker.on('drag', handleMarkerPositionChange);
        marker.on('dragend', handleMarkerPositionChange);

        markerRef.current = marker;
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lng, disabled, onChange]);

  // Handle map size changes on layout resize
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }
    const timeout = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [isExpanded]);

  const handleFlyToRegion = (region: typeof REGIONS[0]) => {
    setActiveRegion(region.name);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(region.center, region.zoom, {
        duration: 0.6,
        easeLinearity: 0.25,
      });
    }
  };

  const handleResetPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([20, 0], 2, { duration: 0.5 });
      setActiveRegion('World');
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const formatCoord = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    return `${Math.abs(val).toFixed(1)}° ${dir}`;
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0b1120] transition-all duration-200 shadow-xl group ${
        internalFullscreen && !onToggleExpand
          ? 'fixed inset-0 z-50 rounded-none w-screen h-[100dvh]'
          : className || 'w-full h-full'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair touch-manipulation" />

      {/* Top Left: Compact Region Navigation Chips Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 pointer-events-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-0.5 bg-[#090d16]/90 backdrop-blur-md border border-slate-800/90 p-1 rounded-xl shadow-lg shrink-0">
          <Compass className="w-3.5 h-3.5 text-cyan-400 ml-1 mr-0.5 shrink-0" />
          <div className="flex items-center gap-0.5 px-0.5">
            {REGIONS.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => handleFlyToRegion(r)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeRegion === r.name
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Left: Coordinates HUD & Status */}
      <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-auto max-w-[calc(100%-140px)]">
        {lat !== null && lng !== null ? (
          <div className="bg-[#090d16]/95 backdrop-blur-md border border-slate-800 px-2.5 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 text-xs animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-mono text-slate-200 text-[10px] xs:text-[11px] font-semibold truncate">
              {formatCoord(lat, true)}, {formatCoord(lng, false)}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">· Drag pin to adjust</span>
          </div>
        ) : (
          <div className="bg-[#090d16]/90 backdrop-blur-md border border-slate-800/90 px-2.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 text-[10px] xs:text-[11px] text-slate-300">
            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">Tap map to pin location</span>
          </div>
        )}
      </div>

      {/* Bottom Right: Thumb-Reachable Action Controls (+, -, Reset, Expand) */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
        {/* Zoom In/Out Buttons (Thumb accessible 40px) */}
        <div className="flex items-center bg-[#090d16]/95 backdrop-blur-md border border-slate-700/80 rounded-xl overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in"
            title="Zoom In"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors border-r border-slate-750 cursor-pointer active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out"
            title="Zoom Out"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer active:scale-90"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Recenter World View */}
        <button
            type="button"
            onClick={handleResetPin}
            title="Reset View to World"
            aria-label="Reset Map View"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#090d16]/95 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white shadow-lg transition-colors flex items-center justify-center cursor-pointer active:scale-90"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Expand / Compact Toggle */}
        <button
          type="button"
          onClick={handleToggleExpand}
          title={isExpanded ? 'Compact Map' : 'Expand Map'}
          aria-label={isExpanded ? 'Compact Map' : 'Expand Map'}
          className={`h-9 sm:h-10 px-2.5 rounded-xl bg-[#090d16]/95 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-400 shadow-lg transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            isExpanded ? 'ring-2 ring-cyan-400 text-cyan-300' : ''
          }`}
        >
          {isExpanded ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Shrink</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Expand</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
