# MapView Rewrite Plan

## User Feedback
1. "mỗi lần phóng to thì lại đưa về một địa chỉ khác" (Map snaps to a different location when zooming)
2. "thêm ghim gắm trên map để bt ở đâu" (Need a clear pin/marker for the selected camera)

## Root Causes
1. **Snapping issue:** The map panning `useEffect` depends on `cameras`. If the `cameras` array reference changes (e.g., due to a data refetch or rain data update triggering the `useMemo` in `Home.tsx`), the `useEffect` re-runs. If a camera is currently selected, it forcefully calls `map.setView` and undoes whatever manual zoom/pan the user just did.
2. **Missing Pin:** We currently only use `L.circleMarker` for all cameras. When selected, we just make the border thicker and blue. This is not prominent enough. The user wants a standard Map Pin icon (thêm ghim gắm).

## Proposed Changes
1. **Fix Panning Logic:** Remove `cameras` from the panning `useEffect` dependency array, or use a `ref` to store the latest camera data so we don't re-trigger the effect when data updates. Panning should ONLY happen when `selectedCameraId` or `panTrigger` changes.
2. **Add Standard Pin Marker:** For the `selectedCameraId`, instead of (or in addition to) the `circleMarker`, we will add a standard `L.marker` (with a pin icon) so it's clearly visible.
3. **Refactor Map Component:** I will clean up the `addMarkers` logic to make it robust and ensure it correctly handles the selected pin.

## Verification
- Click a camera -> map pans to it and shows a pin.
- Zoom out or drag map -> map stays where you left it (does not snap back randomly).
- Select another camera -> map pans to new camera and moves the pin.
