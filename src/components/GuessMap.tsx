import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface GuessMapProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

const createPinIcon = () => {
  return L.divIcon({
    className: 'custom-guess-pin',
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
            width: 10px;
            height: 10px;
            background: #fef08a;
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

export const GuessMap: React.FC<GuessMapProps> = ({ lat, lng, onChange, disabled }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [25, 10],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false,
    });

    // Custom positioned zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      // Normalize lng to -180..180
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

  // Update marker when lat/lng change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (lat !== null && lng !== null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: createPinIcon(),
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

  // Recalculate size when fullscreen toggles
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [isFullscreen]);

  const handleResetPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([25, 10], 2);
    }
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'w-full h-56'
      }`}
    >
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Overlay controls */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
        <div className="bg-stone-900/90 backdrop-blur-md border border-stone-700/80 px-2.5 py-1 rounded-lg text-[11px] font-medium text-stone-200 flex items-center gap-1.5 shadow-md">
          <MapPin className={`w-3.5 h-3.5 ${lat !== null ? 'text-amber-400 fill-amber-400' : 'text-stone-400'}`} />
          <span>
            {lat !== null && lng !== null
              ? 'Pin placed · Tap map to move'
              : 'Tap map to drop pin'}
          </span>
        </div>
      </div>

      {/* Action buttons (Fullscreen & Center) */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleResetPin}
          title="Reset map view"
          className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-white shadow-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enlarge Map'}
          className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-amber-400 shadow-md transition-colors flex items-center gap-1 text-xs"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="text-[11px] font-medium hidden xs:inline">
            {isFullscreen ? 'Close Map' : 'Expand'}
          </span>
        </button>
      </div>
    </div>
  );
};
