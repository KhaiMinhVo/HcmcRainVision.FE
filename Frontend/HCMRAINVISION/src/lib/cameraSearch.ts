import type { CameraInfo } from '../types';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();
}

function matchScore(camera: CameraInfo, normalizedQuery: string): number {
  if (!normalizedQuery) return 0;
  const name = normalizeSearchText(camera.name);
  const address = normalizeSearchText(camera.address);
  const ward = normalizeSearchText(camera.ward);
  const district = normalizeSearchText(camera.district);

  if (name === normalizedQuery) return 0;
  if (name.startsWith(normalizedQuery)) return 1;
  if (name.includes(normalizedQuery)) return 2;
  if (address.startsWith(normalizedQuery)) return 3;
  if (address.includes(normalizedQuery)) return 4;
  if (ward.startsWith(normalizedQuery)) return 5;
  if (ward.includes(normalizedQuery)) return 6;
  if (district.includes(normalizedQuery)) return 7;
  return 8;
}

/** Keeps every camera visible and moves the best search matches to the top. */
export function rankCamerasBySearch(cameras: CameraInfo[], query: string): CameraInfo[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return cameras;

  return cameras
    .map((camera, index) => ({ camera, index, score: matchScore(camera, normalizedQuery) }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ camera }) => camera);
}
