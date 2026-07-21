/**
 * Friendly route checker. Users select landmarks while the API continues to
 * receive the latitude/longitude pairs it expects.
 */
import { useMemo, useState } from 'react';
import { checkRoute } from '../services/weatherApi';
import { validate } from '../lib/validation';
import type { RoutePointDto } from '../types/api';

interface CheckRouteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type RouteResult = {
  IsSafe: boolean;
  Warnings: Array<{ Lat: number; Lng: number; Message: string }>;
};

type LocationOption = RoutePointDto & {
  id: string;
  name: string;
  address: string;
};

const LOCATIONS: LocationOption[] = [
  { id: 'ben-thanh', name: 'Chợ Bến Thành', address: 'Quận 1', Lat: 10.77252, Lng: 106.69802 },
  { id: 'landmark-81', name: 'Landmark 81', address: 'Bình Thạnh', Lat: 10.79510, Lng: 106.72180 },
  { id: 'tan-son-nhat', name: 'Sân bay Tân Sơn Nhất', address: 'Tân Bình', Lat: 10.81880, Lng: 106.65190 },
  { id: 'nha-tho-duc-ba', name: 'Nhà thờ Đức Bà', address: 'Quận 1', Lat: 10.77978, Lng: 106.69902 },
  { id: 'dai-hoc-quoc-gia', name: 'Đại học Quốc gia TP.HCM', address: 'TP. Thủ Đức', Lat: 10.87630, Lng: 106.80020 },
  { id: 'ben-xe-mien-tay', name: 'Bến xe Miền Tây', address: 'Bình Tân', Lat: 10.74060, Lng: 106.61820 },
];

const DEFAULT_START = LOCATIONS[0].id;
const DEFAULT_END = LOCATIONS[1].id;

export default function CheckRouteDrawer({ isOpen, onClose }: CheckRouteDrawerProps) {
  const [startId, setStartId] = useState(DEFAULT_START);
  const [endId, setEndId] = useState(DEFAULT_END);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);

  const start = useMemo(() => LOCATIONS.find((location) => location.id === startId), [startId]);
  const end = useMemo(() => LOCATIONS.find((location) => location.id === endId), [endId]);

  const selectLocation = (setter: (id: string) => void, id: string) => {
    setter(id);
    setError(null);
    setResult(null);
  };

  const handleSwap = () => {
    setStartId(endId);
    setEndId(startId);
    setError(null);
    setResult(null);
  };

  const handleCheck = async () => {
    if (!start || !end) {
      setError('Vui lòng chọn đầy đủ điểm đi và điểm đến.');
      return;
    }
    if (start.id === end.id) {
      setError('Điểm đến cần khác điểm đi.');
      return;
    }

    const payload: RoutePointDto[] = [
      { Lat: start.Lat, Lng: start.Lng },
      { Lat: end.Lat, Lng: end.Lng },
    ];
    const validated = validate('checkRoute', payload);
    if (!validated.valid) {
      setError(validated.firstMessage ?? 'Dữ liệu lộ trình không hợp lệ.');
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);
    try {
      setResult(await checkRoute(validated.data as RoutePointDto[]));
    } catch (e) {
      const message = e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : 'Không kiểm tra được lộ trình.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStartId(DEFAULT_START);
    setEndId(DEFAULT_END);
    setError(null);
    setResult(null);
  };

  if (!isOpen) return null;

  const locationSelect = (
    label: string,
    value: string,
    onChange: (id: string) => void,
    markerClass: string,
  ) => (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${markerClass}`}>
          {label === 'Điểm đi' ? 'A' : 'B'}
        </span>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {LOCATIONS.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name} — {location.address}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <div className="fixed inset-0 z-[2000] bg-black/50" onClick={handleClose} aria-hidden />
      <div
        className="fixed bottom-0 right-0 top-0 z-[2001] flex w-full max-w-md flex-col overflow-hidden rounded-l-xl bg-white shadow-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="check-route-title"
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 id="check-route-title" className="text-lg font-semibold text-gray-900">Kiểm tra đường đi</h2>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Đóng">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">Tuyến mẫu đã được chọn sẵn</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">Chợ Bến Thành → Landmark 81. Bấm kiểm tra để demo ngay hoặc chọn địa điểm khác.</p>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            {locationSelect('Điểm đi', startId, (id) => selectLocation(setStartId, id), 'bg-blue-600')}
            <div className="flex justify-center">
              <button type="button" onClick={handleSwap} className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50" aria-label="Đổi điểm đi và điểm đến" title="Đổi chiều lộ trình">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4 4 4m6 0v12m0 0 4-4m-4 4-4-4" />
                </svg>
              </button>
            </div>
            {locationSelect('Điểm đến', endId, (id) => selectLocation(setEndId, id), 'bg-red-500')}
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <button
            type="button"
            onClick={handleCheck}
            disabled={loading || !start || !end || startId === endId}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? 'Đang kiểm tra...' : 'Kiểm tra lộ trình'}
          </button>

          {result && (
            <div className="space-y-2 rounded-lg border border-gray-200 p-4" aria-live="polite">
              <h3 className="text-sm font-semibold text-gray-800">Kết quả</h3>
              <p className={result.IsSafe ? 'font-medium text-green-700' : 'font-medium text-red-700'}>
                {result.IsSafe ? 'Lộ trình an toàn' : 'Lộ trình có thể gặp mưa'}
              </p>
              {result.Warnings.length > 0 && (
                <div>
                  <p className="mb-2 text-sm text-gray-600">Cảnh báo:</p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                    {result.Warnings.map((warning, index) => <li key={index}>{warning.Message}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
