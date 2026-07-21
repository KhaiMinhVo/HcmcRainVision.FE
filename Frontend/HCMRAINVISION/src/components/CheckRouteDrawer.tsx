import { useEffect, useState } from 'react';
import { checkRoute } from '../services/weatherApi';
import { validate } from '../lib/validation';
import type { CheckRouteRequestDto, RoutePointDto } from '../types/api';
import RoutePreviewMap from './RoutePreviewMap';

interface CheckRouteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type RouteResult = {
  IsSafe: boolean;
  Warnings: Array<{ Lat: number; Lng: number; Message: string }>;
};

type ResolvedAddress = RoutePointDto & { displayName: string };
type AddressSuggestion = ResolvedAddress & { id: string };

const START_EXAMPLE = 'Chợ Bến Thành, Quận 1, TP.HCM';
const END_EXAMPLE = 'Landmark 81, Bình Thạnh, TP.HCM';
const START_POINT: ResolvedAddress = { Lat: 10.77252, Lng: 106.69802, displayName: START_EXAMPLE };
const END_POINT: ResolvedAddress = { Lat: 10.79510, Lng: 106.72180, displayName: END_EXAMPLE };

async function geocodeAddress(address: string): Promise<ResolvedAddress> {
  const query = /hồ chí minh|ho chi minh|tp\.?hcm/i.test(address) ? address : `${address}, TP. Hồ Chí Minh`;
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'vn',
    'accept-language': 'vi',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Dịch vụ tìm địa chỉ đang bận. Vui lòng thử lại.');

  const matches = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
  if (!matches.length) throw new Error(`Không tìm thấy địa chỉ “${address}”. Hãy nhập cụ thể hơn.`);
  return {
    Lat: Number(matches[0].lat),
    Lng: Number(matches[0].lon),
    displayName: matches[0].display_name,
  };
}

async function searchAddresses(address: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: address,
    limit: '5',
    lat: '10.7769',
    lon: '106.7009',
  });
  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const data = await response.json() as {
    features?: Array<{
      properties: { osm_id?: number; name?: string; street?: string; district?: string; city?: string; state?: string; country?: string };
      geometry: { coordinates: [number, number] };
    }>;
  };
  return (data.features ?? []).map((feature, index) => {
    const property = feature.properties;
    const label = [property.name, property.street, property.district, property.city, property.state, property.country]
      .filter((part, position, parts) => part && parts.indexOf(part) === position)
      .join(', ');
    return {
      id: String(property.osm_id ?? `${feature.geometry.coordinates.join('-')}-${index}`),
      Lat: feature.geometry.coordinates[1],
      Lng: feature.geometry.coordinates[0],
      displayName: label,
    };
  });
}

async function buildDrivingRoute(origin: RoutePointDto, destination: RoutePointDto): Promise<RoutePointDto[]> {
  const coordinates = `${origin.Lng},${origin.Lat};${destination.Lng},${destination.Lat}`;
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
  if (!response.ok) throw new Error('Không thể tải đường đi trên bản đồ.');
  const data = await response.json() as { routes?: Array<{ geometry?: { coordinates?: number[][] } }> };
  const route = data.routes?.[0]?.geometry?.coordinates;
  if (!route?.length) throw new Error('Không tìm thấy đường đi giữa hai địa chỉ này.');
  return route.map(([lng, lat]) => ({ Lat: lat, Lng: lng }));
}

export default function CheckRouteDrawer({ isOpen, onClose }: CheckRouteDrawerProps) {
  const [startAddress, setStartAddress] = useState(START_EXAMPLE);
  const [endAddress, setEndAddress] = useState(END_EXAMPLE);
  const [startPoint, setStartPoint] = useState<ResolvedAddress | null>(START_POINT);
  const [endPoint, setEndPoint] = useState<ResolvedAddress | null>(END_POINT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePointDto[]>([]);
  const [startSuggestions, setStartSuggestions] = useState<AddressSuggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (activeInput !== 'start' || startPoint || startAddress.trim().length < 3) {
      setStartSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchAddresses(startAddress.trim(), controller.signal)
        .then(setStartSuggestions)
        .catch((caught) => { if ((caught as Error).name !== 'AbortError') setStartSuggestions([]); });
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeInput, startAddress, startPoint]);

  useEffect(() => {
    if (activeInput !== 'end' || endPoint || endAddress.trim().length < 3) {
      setEndSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchAddresses(endAddress.trim(), controller.signal)
        .then(setEndSuggestions)
        .catch((caught) => { if ((caught as Error).name !== 'AbortError') setEndSuggestions([]); });
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeInput, endAddress, endPoint]);

  const updateAddress = (value: string, isStart: boolean) => {
    if (isStart) {
      setStartAddress(value);
      setStartPoint(null);
    } else {
      setEndAddress(value);
      setEndPoint(null);
    }
    setError(null);
    setResult(null);
    setRoutePoints([]);
  };

  const handleSwap = () => {
    setStartAddress(endAddress);
    setEndAddress(startAddress);
    setStartPoint(endPoint);
    setEndPoint(startPoint);
    setError(null);
    setResult(null);
    setRoutePoints([]);
  };

  const handleCheck = async () => {
    const originText = startAddress.trim();
    const destinationText = endAddress.trim();
    if (!originText || !destinationText) {
      setError('Vui lòng nhập đầy đủ điểm đi và điểm đến.');
      return;
    }
    if (originText.toLocaleLowerCase('vi') === destinationText.toLocaleLowerCase('vi')) {
      setError('Điểm đến cần khác điểm đi.');
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const [origin, destination] = await Promise.all([
        startPoint ?? geocodeAddress(originText),
        endPoint ?? geocodeAddress(destinationText),
      ]);
      setStartPoint(origin);
      setEndPoint(destination);

      const drivingRoute = await buildDrivingRoute(origin, destination);
      setRoutePoints(drivingRoute);
      const payload: CheckRouteRequestDto = {
        OriginLatitude: origin.Lat,
        OriginLongitude: origin.Lng,
        DestinationLatitude: destination.Lat,
        DestinationLongitude: destination.Lng,
        RoutePoints: drivingRoute,
      };
      const validated = validate('checkRoute', payload);
      if (!validated.valid) throw new Error('Tọa độ tìm được không hợp lệ. Vui lòng thử địa chỉ khác.');
      setResult(await checkRoute(validated.data as CheckRouteRequestDto));
    } catch (caught) {
      const message = caught && typeof caught === 'object' && 'message' in caught
        ? String((caught as { message: string }).message)
        : 'Không kiểm tra được lộ trình.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStartAddress(START_EXAMPLE);
    setEndAddress(END_EXAMPLE);
    setStartPoint(START_POINT);
    setEndPoint(END_POINT);
    setError(null);
    setResult(null);
    setRoutePoints([]);
    setStartSuggestions([]);
    setEndSuggestions([]);
    setActiveInput(null);
  };

  if (!isOpen) return null;

  const addressInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    markerClass: string,
    resolved: ResolvedAddress | null,
    suggestions: AddressSuggestion[],
    inputName: 'start' | 'end',
    onSelect: (suggestion: AddressSuggestion) => void,
  ) => (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${markerClass}`}>
          {label === 'Điểm đi' ? 'A' : 'B'}
        </span>
        {label}
      </span>
      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setActiveInput(inputName)}
          placeholder={label === 'Điểm đi' ? 'Nhập địa chỉ xuất phát' : 'Nhập địa chỉ muốn đến'}
          autoComplete="street-address"
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {activeInput === inputName && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(suggestion)}
                  className="flex w-full gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50"
                >
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>
                  <span className="line-clamp-2">{suggestion.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {resolved && <span className="mt-1.5 block truncate text-xs text-green-700">✓ Đã xác định vị trí</span>}
    </label>
  );

  return (
    <>
      <div className="fixed inset-0 z-[2000] bg-black/50" onClick={handleClose} aria-hidden />
      <div className="fixed bottom-0 right-0 top-0 z-[2001] flex w-full max-w-md flex-col overflow-hidden rounded-l-xl bg-white shadow-sm" role="dialog" aria-modal="true" aria-labelledby="check-route-title">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 id="check-route-title" className="text-lg font-semibold text-gray-900">Kiểm tra đường đi</h2>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Đóng">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">Nhập địa chỉ bạn muốn kiểm tra</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">Hai địa chỉ mẫu đã được điền sẵn. Bạn có thể sửa trực tiếp rồi bấm kiểm tra.</p>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            {addressInput('Điểm đi', startAddress, (value) => updateAddress(value, true), 'bg-blue-600', startPoint, startSuggestions, 'start', (suggestion) => {
              setStartAddress(suggestion.displayName); setStartPoint(suggestion); setStartSuggestions([]); setActiveInput(null);
            })}
            <div className="flex justify-center">
              <button type="button" onClick={handleSwap} className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50" aria-label="Đổi điểm đi và điểm đến" title="Đổi chiều lộ trình">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4 4 4m6 0v12m0 0 4-4m-4 4-4-4" /></svg>
              </button>
            </div>
            {addressInput('Điểm đến', endAddress, (value) => updateAddress(value, false), 'bg-red-500', endPoint, endSuggestions, 'end', (suggestion) => {
              setEndAddress(suggestion.displayName); setEndPoint(suggestion); setEndSuggestions([]); setActiveInput(null);
            })}
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}

          <button type="button" onClick={handleCheck} disabled={loading || !startAddress.trim() || !endAddress.trim()} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50">
            {loading ? 'Đang tìm địa chỉ và kiểm tra...' : 'Kiểm tra lộ trình'}
          </button>

          {routePoints.length >= 2 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">Bản đồ hướng dẫn đường đi</h3>
              <RoutePreviewMap points={routePoints} />
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-lg border border-gray-200 p-4" aria-live="polite">
              <h3 className="text-sm font-semibold text-gray-800">Kết quả</h3>
              <p className={result.IsSafe ? 'font-medium text-green-700' : 'font-medium text-red-700'}>{result.IsSafe ? 'Lộ trình an toàn' : 'Lộ trình có thể gặp mưa'}</p>
              {result.Warnings.length > 0 && (
                <div><p className="mb-2 text-sm text-gray-600">Cảnh báo:</p><ul className="list-inside list-disc space-y-1 text-sm text-gray-700">{result.Warnings.map((warning, index) => <li key={index}>{warning.Message}</li>)}</ul></div>
              )}
            </div>
          )}
          <p className="text-center text-xs text-gray-400">Dữ liệu địa chỉ © OpenStreetMap contributors</p>
        </div>
      </div>
    </>
  );
}
