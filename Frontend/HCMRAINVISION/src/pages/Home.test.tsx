import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';

vi.mock('../hooks/useCamerasAndWeather', () => ({
  useCamerasAndWeather: () => ({
    cameras: [
      {
        id: 'camera-1',
        name: 'Camera 1',
        address: '1 Test Street',
        ward: 'Test Ward',
        district: 'Test District',
        lat: 10.76649,
        lng: 106.6824818,
      },
    ],
    rainData: [
      {
        id: 'camera-1',
        lat: 10.76649,
        lng: 106.6824818,
        rainLevel: 0,
        timestamp: '2026-07-21T03:25:00.000Z',
      },
    ],
    heatmapPoints: [],
    districts: ['Test District'],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('../components/MapView', () => ({
  default: ({
    cameras,
    selectedCameraId,
    panTrigger,
  }: {
    cameras: Array<{ id: string }>;
    selectedCameraId: string | null;
    panTrigger?: number;
  }) => (
    <div
      data-testid="map-view"
      data-camera-ids={cameras.map((camera) => camera.id).join(',')}
      data-selected-camera-id={selectedCameraId ?? ''}
      data-pan-trigger={panTrigger ?? 0}
    />
  ),
}));

vi.mock('../components/CameraList', () => ({
  default: ({
    cameras,
    onCameraSelect,
  }: {
    cameras: Array<{ id: string }>;
    onCameraSelect: (cameraId: string) => void;
  }) => (
    <button type="button" onClick={() => onCameraSelect(cameras[0].id)}>
      Select camera
    </button>
  ),
}));

vi.mock('../components/CameraDetailPanel', () => ({
  default: ({
    cameraId,
    isOpen,
    onViewOnMap,
  }: {
    cameraId: string | null;
    isOpen: boolean;
    onViewOnMap: () => void;
  }) =>
    isOpen ? (
      <section data-testid="camera-detail" data-camera-id={cameraId ?? ''}>
        <button type="button" onClick={onViewOnMap}>
          View on Map
        </button>
      </section>
    ) : null,
}));

vi.mock('../components/Header', () => ({ default: () => <header /> }));
vi.mock('../components/TimeSlider', () => ({ default: () => <div /> }));
vi.mock('../components/Legend', () => ({ default: () => <div /> }));
vi.mock('../components/FavoritesSection', () => ({ default: () => null }));
vi.mock('../components/CheckRouteDrawer', () => ({ default: () => null }));
vi.mock('../components/HomeLoadingSkeleton', () => ({ default: () => <div /> }));
vi.mock('../components/ui', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

afterEach(() => {
  cleanup();
});

describe('Home map layout and focus wiring', () => {
  it('bounds the page and main flex row to the viewport', () => {
    const { container } = render(<Home />);
    const root = container.firstElementChild;
    const main = container.querySelector('main');

    expect(root).not.toBeNull();
    expect(root?.classList.contains('h-screen')).toBe(true);
    expect(root?.classList.contains('h-dvh')).toBe(true);
    expect(root?.classList.contains('overflow-hidden')).toBe(true);

    expect(main).not.toBeNull();
    expect(main?.classList.contains('flex-1')).toBe(true);
    expect(main?.classList.contains('min-h-0')).toBe(true);
    expect(main?.classList.contains('overflow-hidden')).toBe(true);
  });

  it('keeps the selected camera and requests a fresh pan when View on Map closes the detail panel', () => {
    render(<Home />);
    const map = screen.getByTestId('map-view');

    expect(map.dataset.selectedCameraId).toBe('');
    expect(map.dataset.panTrigger).toBe('0');

    fireEvent.click(screen.getAllByRole('button', { name: 'Select camera' })[0]);

    expect(map.dataset.selectedCameraId).toBe('camera-1');
    expect(map.dataset.panTrigger).toBe('1');
    expect(screen.getByTestId('camera-detail').dataset.cameraId).toBe('camera-1');

    fireEvent.click(screen.getByRole('button', { name: 'View on Map' }));

    expect(screen.queryByTestId('camera-detail')).toBeNull();
    expect(map.dataset.selectedCameraId).toBe('camera-1');
    expect(map.dataset.panTrigger).toBe('2');
  });
});
