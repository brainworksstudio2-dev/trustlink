import { haversineDistanceKm, formatDistanceKm, createCircleGeoJSON } from '../geo';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm(5.6, -0.2, 5.6, -0.2)).toBe(0);
  });

  it('matches a known real-world distance (Accra to Kumasi, ~200km)', () => {
    const distance = haversineDistanceKm(5.6037, -0.187, 6.6885, -1.6244);
    expect(distance).toBeGreaterThan(180);
    expect(distance).toBeLessThan(220);
  });

  it('is symmetric regardless of point order', () => {
    const a = haversineDistanceKm(5.6, -0.2, 6.7, -1.6);
    const b = haversineDistanceKm(6.7, -1.6, 5.6, -0.2);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe('formatDistanceKm', () => {
  it('formats sub-kilometer distances in meters', () => {
    expect(formatDistanceKm(0.45)).toBe('450 m away');
  });

  it('formats kilometer-plus distances with one decimal', () => {
    expect(formatDistanceKm(2.456)).toBe('2.5 km away');
  });

  it('rounds meters to the nearest whole number', () => {
    expect(formatDistanceKm(0.999)).toBe('999 m away');
  });
});

describe('createCircleGeoJSON', () => {
  it('produces a closed polygon (first and last points match)', () => {
    const feature = createCircleGeoJSON({ latitude: 5.6, longitude: -0.2 }, 1000, 16);
    const coords = feature.geometry.coordinates[0];
    expect(coords[0]).toEqual(coords[coords.length - 1]);
  });

  it('produces the requested number of ring points plus the closing point', () => {
    const feature = createCircleGeoJSON({ latitude: 5.6, longitude: -0.2 }, 500, 32);
    expect(feature.geometry.coordinates[0]).toHaveLength(33);
  });

  it('every point sits roughly radiusMeters away from the center', () => {
    const center = { latitude: 5.6, longitude: -0.2 };
    const radiusMeters = 2000;
    const feature = createCircleGeoJSON(center, radiusMeters, 24);
    for (const [lng, lat] of feature.geometry.coordinates[0]) {
      const distanceKm = haversineDistanceKm(center.latitude, center.longitude, lat, lng);
      expect(distanceKm * 1000).toBeCloseTo(radiusMeters, -2); // within ~100m
    }
  });
});
