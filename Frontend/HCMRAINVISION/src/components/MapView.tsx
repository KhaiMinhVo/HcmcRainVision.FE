/**
 * MapView Component
 * Displays an interactive map with camera markers and rain data visualization.
 * Uses imperative Leaflet API (ref + useEffect) to avoid "Map container is
 * already initialized" when React Strict Mode or routing causes remount.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { heatLayer } from '@linkurious/leaflet-heat';
import type { RainDataPoint, CameraInfo } from '../types';
import type { HeatmapPoint } from '../hooks/useCamerasAndWeather';
import { HCMC_CENTER, HEATMAP_CONFIG, MAP_CONFIG, RAIN_LEVEL_CONFIG } from '../constants';
import type { UserLocation } from '../types/location';

interface MapViewProps {
  rainData: RainDataPoint[];
  cameras: CameraInfo[];
  selectedCameraId: string | null;
  onCameraClick: (cameraId: string) => void;
  heatmapPoints?: HeatmapPoint[];
  showHeatmap?: boolean;
  panTrigger?: number;
  userLocation?: UserLocation | null;
  locationLoading?: boolean;
  locationError?: string | null;
  onRequestLocation?: () => void;
}

/**
 * Fix for default marker icons (icon paths broken in bundlers).
 */
if (typeof window !== 'undefined') {
  const iconProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete iconProto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

const MARKER_COLORS = {
  [RAIN_LEVEL_CONFIG.NO_RAIN]: '#9ca3af',
  [RAIN_LEVEL_CONFIG.LIGHT_RAIN]: '#eab308',
  [RAIN_LEVEL_CONFIG.HEAVY_RAIN]: '#ef4444',
  SELECTED: '#3b82f6',
} as const;

const MARKER_RADIUS = {
  [RAIN_LEVEL_CONFIG.NO_RAIN]: 6,
  [RAIN_LEVEL_CONFIG.LIGHT_RAIN]: 10,
  [RAIN_LEVEL_CONFIG.HEAVY_RAIN]: 14,
} as const;

function addMarkers(
  map: L.Map,
  rainData: RainDataPoint[],
  cameras: CameraInfo[],
  selectedCameraId: string | null,
  onCameraClick: (cameraId: string) => void
): L.LayerGroup {
  const layerGroup = L.layerGroup();
  const rainDataMap = new Map<string, RainDataPoint>();
  rainData.forEach((p) => rainDataMap.set(p.id, p));

  cameras.forEach((camera) => {
    const rainPoint = rainDataMap.get(camera.id);
    const rainLevel = rainPoint?.rainLevel ?? RAIN_LEVEL_CONFIG.NO_RAIN;
    const hasWeatherData = rainPoint != null;
    const isSelected = selectedCameraId === camera.id;
    const color = MARKER_COLORS[rainLevel];
    const radius = MARKER_RADIUS[rainLevel];

    // Add circle marker for all cameras
    const circle = L.circleMarker([camera.lat, camera.lng], {
      radius,
      fillColor: color,
      color: isSelected ? MARKER_COLORS.SELECTED : color,
      weight: isSelected ? 4 : 2,
      opacity: 0.9,
      fillOpacity: 0.7,
      className: 'cursor-pointer transition-all',
    });

    circle.on('click', () => onCameraClick(camera.id));

    // If selected, add a prominent standard PIN marker
    if (isSelected) {
      const pin = L.marker([camera.lat, camera.lng], {
        zIndexOffset: 1000,
        title: camera.name
      });
      pin.on('click', () => onCameraClick(camera.id));
      pin.addTo(layerGroup);
    }

    const rainStatusClass =
      !hasWeatherData
        ? 'bg-slate-100 text-slate-500'
        : rainLevel === RAIN_LEVEL_CONFIG.NO_RAIN
        ? 'bg-gray-200 text-gray-700'
        : rainLevel === RAIN_LEVEL_CONFIG.LIGHT_RAIN
        ? 'bg-yellow-400 text-yellow-900'
        : 'bg-red-500 text-white';
    const rainStatusText =
      !hasWeatherData
        ? 'No data'
        : rainLevel === RAIN_LEVEL_CONFIG.NO_RAIN
        ? 'No Rain'
        : rainLevel === RAIN_LEVEL_CONFIG.LIGHT_RAIN
        ? 'Light Rain'
        : 'Heavy Rain';

    const popupContent = document.createElement('div');
    popupContent.className = 'p-2';
    popupContent.innerHTML = `
      <h3 class="font-semibold text-sm mb-1">${camera.name}</h3>
      <p class="text-xs text-gray-600 mb-2">${camera.ward}, ${camera.district}</p>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded text-xs ${rainStatusClass}">${rainStatusText}</span>
      </div>
      <button class="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium view-details-btn">View Details →</button>
    `;
    const viewDetailsBtn = popupContent.querySelector('.view-details-btn');
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onCameraClick(camera.id);
        map.closePopup();
      });
    }

    const popup = L.popup({ className: 'custom-popup', maxWidth: 250 }).setContent(popupContent);
    circle.bindPopup(popup);

    circle.on('mouseover', () => {
      circle.setStyle({ weight: 4, fillOpacity: 0.9 });
      circle.openPopup();
    });
    circle.on('mouseout', () => {
      if (!isSelected) circle.setStyle({ weight: 2, fillOpacity: 0.7 });
    });

    circle.addTo(layerGroup);
  });

  return layerGroup;
}

export default function MapView({
  rainData,
  cameras,
  selectedCameraId,
  onCameraClick,
  heatmapPoints = [],
  showHeatmap = false,
  panTrigger = 0,
  userLocation = null,
  locationLoading = false,
  locationError = null,
  onRequestLocation = () => undefined,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const camerasRef = useRef(cameras);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Keep latest cameras in ref so we don't trigger panning when cameras update
  useEffect(() => {
    camerasRef.current = cameras;
  }, [cameras]);

  // Create map once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if ((container as unknown as { _leaflet_id?: number })._leaflet_id != null) return;

    const map = L.map(container, {
      center: [HCMC_CENTER.lat, HCMC_CENTER.lng],
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ResizeObserver: fix Leaflet tile misalignment when container size changes
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, []);

  // Pan to selected camera (ONLY when selectedCameraId or panTrigger changes)
  // We use camerasRef.current so we don't snap back when rainData/cameras fetch completes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCameraId) return;

    const selected = camerasRef.current.find((c) => c.id === selectedCameraId);
    if (!selected) return;

    map.invalidateSize({ animate: false });

    const targetZoom = Math.max(map.getZoom(), MAP_CONFIG.MIN_ZOOM_ON_SELECT);
    // Focus immediately. A queued Leaflet pan/zoom animation can otherwise
    // leave the pin between two cameras when selections happen quickly.
    map.setView([selected.lat, selected.lng], targetZoom, { animate: false });
  }, [selectedCameraId, panTrigger]);

  // Update markers (pins and circles)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markersLayer = addMarkers(map, rainData, cameras, selectedCameraId, onCameraClick);
    markersLayer.addTo(map);

    return () => {
      map.removeLayer(markersLayer);
    };
  }, [rainData, cameras, selectedCameraId, onCameraClick]);

  // Heatmap layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeatmap && heatmapPoints.length > 0) {
      const layer = heatLayer(heatmapPoints, {
        radius: HEATMAP_CONFIG.RADIUS,
        blur: HEATMAP_CONFIG.BLUR,
        max: HEATMAP_CONFIG.MAX,
      });
      layer.addTo(map);
      heatLayerRef.current = layer;
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [showHeatmap, heatmapPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocationLayerRef.current) {
      map.removeLayer(userLocationLayerRef.current);
      userLocationLayerRef.current = null;
    }
    if (!userLocation) return;

    const location = L.latLng(userLocation.lat, userLocation.lng);
    const layer = L.layerGroup([
      L.circle(location, {
        radius: userLocation.accuracy,
        color: '#2563eb',
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
        weight: 1,
      }),
      L.circleMarker(location, {
        radius: 8,
        color: '#ffffff',
        fillColor: '#2563eb',
        fillOpacity: 1,
        weight: 3,
      }).bindPopup('<strong>Vị trí của tôi</strong>'),
    ]).addTo(map);
    userLocationLayerRef.current = layer;
    map.setView(location, Math.max(map.getZoom(), 15), { animate: true });

    return () => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
      if (userLocationLayerRef.current === layer) userLocationLayerRef.current = null;
    };
  }, [userLocation]);

  return (
    <div className="w-full h-full relative z-0 bg-gray-100" style={{ minHeight: 300 }}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute right-3 top-3 z-[500] flex max-w-64 flex-col items-end gap-2">
        <button
          type="button"
          onClick={onRequestLocation}
          disabled={locationLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md hover:bg-gray-50 disabled:opacity-60"
          title="Hiển thị vị trí hiện tại"
        >
          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5m0 0 3 2m-3-2-3 2" /></svg>
          {locationLoading ? 'Đang định vị...' : userLocation ? 'Vị trí của tôi' : 'Tìm vị trí của tôi'}
        </button>
        {locationError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 shadow" role="alert">{locationError}</p>}
      </div>
    </div>
  );
}
