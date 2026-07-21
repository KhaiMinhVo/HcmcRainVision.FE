import { describe, expect, it } from 'vitest';
import type { CameraInfo } from '../types';
import { rankCamerasBySearch } from './cameraSearch';

const cameras: CameraInfo[] = [
  { id: '1', name: 'Võ Văn Kiệt', address: 'Quận 1', ward: 'Bến Thành', district: 'Khu trung tâm', lat: 0, lng: 0 },
  { id: '2', name: 'Camera sân bay', address: 'Trường Sơn', ward: 'Tân Sơn Nhất', district: 'Tân Bình', lat: 0, lng: 0 },
  { id: '3', name: 'Bến Thành', address: 'Lê Lợi', ward: 'Bến Thành', district: 'Khu trung tâm', lat: 0, lng: 0 },
];

describe('rankCamerasBySearch', () => {
  it('moves a camera name match to the top without hiding other cameras', () => {
    const result = rankCamerasBySearch(cameras, 'camera san bay');
    expect(result.map((camera) => camera.id)).toEqual(['2', '1', '3']);
  });

  it('prioritizes a name match over an address or ward match', () => {
    const result = rankCamerasBySearch(cameras, 'Ben Thanh');
    expect(result[0].id).toBe('3');
    expect(result).toHaveLength(cameras.length);
  });
});
