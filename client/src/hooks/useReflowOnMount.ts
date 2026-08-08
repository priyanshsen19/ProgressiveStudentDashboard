import { useEffect } from "react";

// Recharts' ResponsiveContainer measures its parent via a ResizeObserver. On first paint
// (especially under React 18 StrictMode's double-mount) it can latch onto stale dimensions,
// leaving charts mis-positioned until the next resize. Nudging a resize on the frame after
// mount forces a correct re-measure. Harmless if the size was already correct.
export function useReflowOnMount() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => cancelAnimationFrame(id);
  }, []);
}
