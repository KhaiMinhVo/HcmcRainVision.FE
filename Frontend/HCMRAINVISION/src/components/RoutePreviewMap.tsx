import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RoutePointDto } from '../types/api';

interface RoutePreviewMapProps {
  points: RoutePointDto[];
}

function letterIcon(letter: string, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid white;box-shadow:0 2px 6px #0005">${letter}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export default function RoutePreviewMap({ points }: RoutePreviewMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return;

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const latLngs = points.map((point) => L.latLng(point.Lat, point.Lng));
    L.polyline(latLngs, { color: '#2563eb', weight: 6, opacity: 0.85 }).addTo(map);
    L.marker(latLngs[0], { icon: letterIcon('A', '#2563eb'), title: 'Điểm đi' }).addTo(map);
    L.marker(latLngs[latLngs.length - 1], { icon: letterIcon('B', '#ef4444'), title: 'Điểm đến' }).addTo(map);
    map.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28] });

    map.whenReady(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points]);

  return <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-lg border border-gray-200" aria-label="Bản đồ hướng dẫn đường đi" />;
}
