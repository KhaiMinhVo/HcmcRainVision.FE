import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CameraInfo, RainDataPoint } from '../types';
import MapView from './MapView';

const leafletMocks = vi.hoisted(() => {
  const mapInstance = {
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    getZoom: vi.fn(() => 12),
    setView: vi.fn(),
    removeLayer: vi.fn(),
    closePopup: vi.fn(),
  };

  return {
    mapInstance,
    map: vi.fn(),
    tileLayer: vi.fn(),
    layerGroup: vi.fn(),
    circleMarker: vi.fn(),
    marker: vi.fn(),
    popup: vi.fn(),
    mergeIconOptions: vi.fn(),
  };
});

vi.mock('leaflet', () => {
  const makeFluentObject = (methods: string[]) => {
    const object: Record<string, ReturnType<typeof vi.fn>> = {};
    methods.forEach((method) => {
      object[method] = vi.fn(() => object);
    });
    return object;
  };

  leafletMocks.map.mockReturnValue(leafletMocks.mapInstance);
  leafletMocks.tileLayer.mockImplementation(() => makeFluentObject(['addTo']));
  leafletMocks.layerGroup.mockImplementation(() => makeFluentObject(['addTo']));
  leafletMocks.circleMarker.mockImplementation(() =>
    makeFluentObject(['on', 'bindPopup', 'setStyle', 'openPopup', 'addTo'])
  );
  leafletMocks.marker.mockImplementation(() => makeFluentObject(['on', 'addTo']));
  leafletMocks.popup.mockImplementation(() => makeFluentObject(['setContent']));

  return {
    default: {
      map: leafletMocks.map,
      tileLayer: leafletMocks.tileLayer,
      layerGroup: leafletMocks.layerGroup,
      circleMarker: leafletMocks.circleMarker,
      marker: leafletMocks.marker,
      popup: leafletMocks.popup,
      Icon: {
        Default: {
          prototype: { _getIconUrl: 'legacy-icon-url' },
          mergeOptions: leafletMocks.mergeIconOptions,
        },
      },
    },
  };
});

vi.mock('@linkurious/leaflet-heat', () => ({
  heatLayer: vi.fn(),
}));

const cameraA: CameraInfo = {
  id: 'camera-a',
  name: 'Nguyen Thi Minh Khai - Nguyen Thien Thuat',
  address: 'Nguyen Thi Minh Khai, Ho Chi Minh City',
  ward: 'Hoa Hung',
  district: 'Cluster 1',
  lat: 10.76649,
  lng: 106.682482,
};

const cameraB: CameraInfo = {
  id: 'camera-b',
  name: 'Vo Van Tan - Cach Mang Thang Tam',
  address: 'Vo Van Tan, Ho Chi Minh City',
  ward: 'Ban Co',
  district: 'Cluster 1',
  lat: 10.775321,
  lng: 106.688765,
};

const cameras = [cameraA, cameraB];

// These coordinates intentionally differ from CameraInfo. Camera positioning
// must use the camera coordinates, not weather/rain coordinates with the same ID.
const rainData: RainDataPoint[] = [
  {
    id: cameraA.id,
    lat: 10.912345,
    lng: 106.812345,
    rainLevel: 1,
    timestamp: '2026-07-21T03:25:00Z',
  },
  {
    id: cameraB.id,
    lat: 10.923456,
    lng: 106.823456,
    rainLevel: 0,
    timestamp: '2026-07-21T03:25:00Z',
  },
];

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
});

beforeEach(() => {
  vi.clearAllMocks();
  leafletMocks.mapInstance.getZoom.mockReturnValue(12);
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('MapView selected-camera centering', () => {
  it('uses the selected camera exact [lat, lng] for setView and both marker types', () => {
    render(
      <MapView
        rainData={rainData}
        cameras={cameras}
        selectedCameraId={cameraA.id}
        onCameraClick={vi.fn()}
      />
    );

    expect(leafletMocks.mapInstance.invalidateSize).toHaveBeenCalledWith({ animate: false });
    expect(leafletMocks.mapInstance.getZoom).toHaveBeenCalledTimes(1);
    expect(leafletMocks.mapInstance.setView).toHaveBeenCalledTimes(1);
    expect(leafletMocks.mapInstance.setView).toHaveBeenCalledWith(
      [cameraA.lat, cameraA.lng],
      14,
      { animate: false }
    );

    expect(leafletMocks.circleMarker).toHaveBeenNthCalledWith(
      1,
      [cameraA.lat, cameraA.lng],
      expect.objectContaining({ color: '#3b82f6', weight: 4 })
    );
    expect(leafletMocks.marker).toHaveBeenCalledTimes(1);
    expect(leafletMocks.marker).toHaveBeenCalledWith(
      [cameraA.lat, cameraA.lng],
      { zIndexOffset: 1000, title: cameraA.name }
    );
  });

  it('does not re-pan when only the cameras array is refreshed', () => {
    const onCameraClick = vi.fn();
    const { rerender } = render(
      <MapView
        rainData={rainData}
        cameras={cameras}
        selectedCameraId={cameraA.id}
        onCameraClick={onCameraClick}
        panTrigger={0}
      />
    );

    const refreshedCameras = cameras.map((camera) => ({
      ...camera,
      name: `${camera.name} refreshed`,
    }));

    rerender(
      <MapView
        rainData={rainData}
        cameras={refreshedCameras}
        selectedCameraId={cameraA.id}
        onCameraClick={onCameraClick}
        panTrigger={0}
      />
    );

    expect(leafletMocks.mapInstance.setView).toHaveBeenCalledTimes(1);
    expect(leafletMocks.mapInstance.setView).toHaveBeenLastCalledWith(
      [cameraA.lat, cameraA.lng],
      14,
      { animate: false }
    );
  });

  it('re-focuses the same selected camera when panTrigger changes', () => {
    const onCameraClick = vi.fn();
    const { rerender } = render(
      <MapView
        rainData={rainData}
        cameras={cameras}
        selectedCameraId={cameraA.id}
        onCameraClick={onCameraClick}
        panTrigger={0}
      />
    );

    rerender(
      <MapView
        rainData={rainData}
        cameras={cameras}
        selectedCameraId={cameraA.id}
        onCameraClick={onCameraClick}
        panTrigger={1}
      />
    );

    expect(leafletMocks.mapInstance.setView.mock.calls).toEqual([
      [[cameraA.lat, cameraA.lng], 14, { animate: false }],
      [[cameraA.lat, cameraA.lng], 14, { animate: false }],
    ]);
  });
});
