import map from "@/data/ghana-map.json";

export const GHANA_MAP = map as {
  viewBox: string;
  path: string;
  projection: {
    minLon: number;
    maxLat: number;
    lonScale: number;
    scale: number;
    padding: number;
  };
};

/** Places a latitude/longitude on the same projection as the outline path. */
export function project(lat: number, lon: number): { x: number; y: number } {
  const { minLon, maxLat, lonScale, scale, padding } = GHANA_MAP.projection;
  return {
    x: padding + (lon - minLon) * lonScale * scale,
    y: padding + (maxLat - lat) * scale,
  };
}
