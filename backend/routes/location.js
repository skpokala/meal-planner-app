const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Simple in-memory cache with TTL
const cache = new Map(); // key -> { expiresAt, data }
const setCache = (key, data, ttlMs = 5 * 60 * 1000) => {
  cache.set(key, { expiresAt: Date.now() + ttlMs, data });
};
const getCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

// Basic rate limiter to protect the endpoint
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});

router.use(limiter);

// Normalize Google Geocoding result to app schema
function normalizeGeocodeResult(result) {
  const byType = (t) => result.address_components?.find(c => c.types?.includes(t))?.long_name || '';
  const shortByType = (t) => result.address_components?.find(c => c.types?.includes(t))?.short_name || '';
  const location = result.geometry?.location || {};
  return {
    address: {
      street: [byType('street_number'), byType('route')].filter(Boolean).join(' ').trim(),
      city: byType('locality') || byType('postal_town') || byType('sublocality') || '',
      state: shortByType('administrative_area_level_1') || byType('administrative_area_level_1') || '',
      zipCode: byType('postal_code') || '',
      country: byType('country') || ''
    },
    coordinates: {
      latitude: location.lat,
      longitude: location.lng
    }
  };
}

// GET /api/location/reverse-geocode?lat=..&lng=..
router.get('/reverse-geocode', async (req, res) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) return res.status(500).json({ success: false, message: 'Google API key not configured' });
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng are required' });

    const cacheKey = `rev:${lat},${lng}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ success: true, location: cached });

    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const { data } = await axios.get(url, { params: { latlng: `${lat},${lng}`, key: GOOGLE_MAPS_API_KEY } });
    const result = data.results?.[0];
    if (!result) return res.json({ success: true, location: null });
    const normalized = normalizeGeocodeResult(result);
    setCache(cacheKey, normalized);
    return res.json({ success: true, location: normalized });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Reverse geocoding failed' });
  }
});

// GET /api/location/search?q=...
// Returns suggestions formatted for AddressAutocomplete (pre-normalized)
router.get('/search', async (req, res) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) return res.status(500).json({ success: false, message: 'Google API key not configured' });
    const { q } = req.query;
    if (!q || q.length < 3) return res.json({ success: true, suggestions: [] });

    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ success: true, suggestions: cached });

    // Use Geocoding API for forward geocoding (autocomplete would require Places API)
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const { data } = await axios.get(url, { params: { address: q, key: GOOGLE_MAPS_API_KEY, region: 'us' } });
    const results = Array.isArray(data.results) ? data.results : [];
    const suggestions = results.slice(0, 5).map((r, idx) => {
      const norm = normalizeGeocodeResult(r);
      return {
        id: r.place_id || String(idx),
        displayName: r.formatted_address,
        address: norm.address,
        lat: norm.coordinates.latitude,
        lon: norm.coordinates.longitude
      };
    });
    setCache(cacheKey, suggestions);
    return res.json({ success: true, suggestions });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Address search failed' });
  }
});

module.exports = router;


