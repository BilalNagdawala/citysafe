import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';

export interface NearbyLocation {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  phone: string | null;
  operatingHours?: string;
  whySafe?: string;
}

export interface NearbyHelpResult {
  id: string;
  name: string;
  category: string;
  phone?: string;
  address?: string;
  distance?: number;
  lat: number;
  lon: number;
  operatingHours?: string;
  whySafe?: string;
}

function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getSafeExplanation(category: string, name: string): string {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();

  if (lowerCat.includes('police') || lowerName.includes('police') || lowerName.includes('chowky')) {
    return 'Official 24/7 staffed law enforcement facility with active security and emergency assistance.';
  }
  if (lowerCat.includes('hospital') || lowerName.includes('hospital') || lowerName.includes('clinic')) {
    return 'Accredited medical facility with emergency triage, 24/7 staffing, and trained medical personnel.';
  }
  if (lowerCat.includes('fire') || lowerName.includes('fire')) {
    return 'Municipal emergency response station with 24-hour active personnel and first-responder capabilities.';
  }
  if (lowerCat.includes('ngo') || lowerCat.includes('community') || lowerName.includes('shelter')) {
    return 'Verified NGO community assistance center providing crisis support and emergency shelter.';
  }
  return 'Verified public safety facility with 24-hour security and emergency support.';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lng') || searchParams.get('lon');
  const radiusStr = searchParams.get('radius') || '3000';
  const categoryParam = searchParams.get('category') || 'police';
  const providerParam = searchParams.get('provider'); // 'google' | 'osm' | 'auto'

  if (!latStr || !lonStr) {
    return NextResponse.json({ success: false, error: 'Missing lat or lng parameters' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const radius = parseFloat(radiusStr);

  // Strict coordinate validation
  if (
    isNaN(lat) ||
    isNaN(lon) ||
    isNaN(radius) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180 ||
    (lat === 0 && lon === 0)
  ) {
    return NextResponse.json(
      { success: false, error: 'Invalid coordinates. Latitude must be -90 to 90 and Longitude -180 to 180.' },
      { status: 400 }
    );
  }

  // Normalize category
  const validCategories = ['police', 'hospital', 'emergency', 'safe'];
  const category = categoryParam.toLowerCase().trim();
  if (!validCategories.includes(category)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid category '${categoryParam}'. Allowed categories are: ${validCategories.join(', ')}.`,
      },
      { status: 400 }
    );
  }

  // Determine provider
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const isGoogleKeyConfigured = Boolean(
    googleApiKey &&
    googleApiKey.trim() !== '' &&
    googleApiKey !== 'your_places_key_here'
  );

  const configuredEnvProvider = process.env.NEARBY_PROVIDER?.toLowerCase().trim();
  const requestedProvider = providerParam?.toLowerCase().trim() || configuredEnvProvider || 'auto';

  // Handle explicit Google Places request with missing API key
  if (requestedProvider === 'google' && !isGoogleKeyConfigured) {
    return NextResponse.json(
      {
        success: false,
        error: 'Google Places API key is not configured on the server. Please set GOOGLE_PLACES_API_KEY in .env.local to use Google Places.',
        code: 'MISSING_API_KEY',
        provider: 'google',
      },
      { status: 503 }
    );
  }

  // Use Google Places if configured or explicitly requested; otherwise use OpenStreetMap (Nominatim)
  const useGoogle = requestedProvider === 'google' || (requestedProvider === 'auto' && isGoogleKeyConfigured);
  const providerUsed = useGoogle ? 'google' : 'osm';

  const locations: NearbyLocation[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    if (useGoogle) {
      // ---------------------------------------------------------
      // GOOGLE PLACES API (NEW)
      // ---------------------------------------------------------
      const url = 'https://places.googleapis.com/v1/places:searchNearby';
      let includedTypes: string[] = [];

      switch (category) {
        case 'police':
          includedTypes = ['police'];
          break;
        case 'hospital':
          includedTypes = ['hospital'];
          break;
        case 'emergency':
          includedTypes = ['police', 'fire_station', 'hospital'];
          break;
        case 'safe':
          includedTypes = ['police', 'hospital', 'fire_station'];
          break;
        default:
          includedTypes = ['police', 'hospital'];
      }

      const requestBody = {
        includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: Math.min(radius, 50000),
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey!,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.primaryType,places.location,places.regularOpeningHours',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API/Nearby] Google Places API error: ${response.status} ${response.statusText}`, errorText);
        return NextResponse.json(
          { success: false, error: 'Nearby services could not be loaded from Google Places provider.' },
          { status: 502 }
        );
      }

      const data = await response.json();
      for (const place of data.places || []) {
        const elLat = place.location?.latitude;
        const elLon = place.location?.longitude;
        if (typeof elLat !== 'number' || typeof elLon !== 'number') continue;

        const distanceMeters = calculateHaversineMeters(lat, lon, elLat, elLon);
        const name = place.displayName?.text || 'Verified Facility';
        const placeCategory = place.primaryType || category;
        const operatingHours = place.regularOpeningHours?.openNow
          ? 'Open Now'
          : place.regularOpeningHours?.weekdayDescriptions?.[0] || 'Open 24 Hours';

        locations.push({
          id: place.id,
          name,
          category: placeCategory,
          address: place.formattedAddress || `${elLat.toFixed(4)}, ${elLon.toFixed(4)}`,
          latitude: elLat,
          longitude: elLon,
          distanceMeters,
          phone: place.nationalPhoneNumber || null,
          operatingHours,
          whySafe: getSafeExplanation(placeCategory, name),
        });
      }
    } else {
      // ---------------------------------------------------------
      // OPENSTREETMAP (NOMINATIM LIVE SEARCH)
      // ---------------------------------------------------------
      let amenitiesToQuery: string[] = [];

      switch (category) {
        case 'police':
          amenitiesToQuery = ['police'];
          break;
        case 'hospital':
          amenitiesToQuery = ['hospital', 'clinic'];
          break;
        case 'emergency':
          amenitiesToQuery = ['police', 'fire_station', 'hospital'];
          break;
        case 'safe':
          amenitiesToQuery = ['police', 'hospital', 'fire_station', 'social_facility'];
          break;
        default:
          amenitiesToQuery = ['police', 'hospital'];
      }

      // Compute bounding box around user's coordinates in degrees
      const deltaLat = radius / 111320;
      const cosLat = Math.cos((lat * Math.PI) / 180);
      const deltaLon = radius / (111320 * (cosLat === 0 ? 0.0001 : Math.abs(cosLat)));
      const minLat = lat - deltaLat;
      const maxLat = lat + deltaLat;
      const minLon = lon - deltaLon;
      const maxLon = lon + deltaLon;

      const seenIds = new Set<string>();

      // Query Nominatim for each amenity in parallel
      const osmPromises = amenitiesToQuery.map(async (amenity) => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&amenity=${amenity}&bounded=1&viewbox=${minLon},${maxLat},${maxLon},${minLat}&limit=10&addressdetails=1`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'CitySafe-App/1.0 (emergency-safety-app)',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller.signal,
          });

          if (!res.ok) return [];
          const items = await res.json();
          return Array.isArray(items) ? items : [];
        } catch (e: any) {
          if (e.name === 'AbortError') throw e;
          return [];
        }
      });

      const resultsPerAmenity = await Promise.all(osmPromises);
      clearTimeout(timeoutId);

      for (const items of resultsPerAmenity) {
        for (const item of items) {
          const itemLat = parseFloat(item.lat);
          const itemLon = parseFloat(item.lon);
          if (isNaN(itemLat) || isNaN(itemLon)) continue;

          const dist = calculateHaversineMeters(lat, lon, itemLat, itemLon);
          // Filter to requested radius
          if (dist > radius) continue;

          const id = `osm-${item.osm_type || 'node'}-${item.osm_id || Math.random().toString(36).substring(7)}`;
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          const rawName = item.name || item.display_name?.split(',')[0] || 'Verified Facility';
          const itemCategory = item.type || item.class || category;

          // Extract verified phone from OSM tags if present; otherwise strictly null (never guess)
          const phone =
            item.extratags?.phone ||
            item.extratags?.['contact:phone'] ||
            item.address?.phone ||
            null;

          // Format clean address from Nominatim address details
          const addr = item.address;
          const addressParts = [];
          if (addr?.road) addressParts.push(addr.road);
          if (addr?.neighbourhood || addr?.suburb) addressParts.push(addr.neighbourhood || addr.suburb);
          if (addr?.city || addr?.town) addressParts.push(addr.city || addr.town);
          const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : item.display_name;

          const defaultHours =
            itemCategory.includes('police') || itemCategory.includes('fire')
              ? 'Open 24 Hours'
              : itemCategory.includes('hospital')
              ? 'Open 24/7 Emergency'
              : 'Open Daily';

          locations.push({
            id,
            name: rawName,
            category: itemCategory,
            address: formattedAddress,
            latitude: itemLat,
            longitude: itemLon,
            distanceMeters: dist,
            phone: phone || null,
            operatingHours: defaultHours,
            whySafe: getSafeExplanation(itemCategory, rawName),
          });
        }
      }
    }

    // ---------------------------------------------------------
    // LOCAL MONGODB VERIFIED GUARDIAN / SAFE SPOT INTEGRATION
    // ---------------------------------------------------------
    try {
      const db = await getDatabase();
      const verifiedGuardians = await db
        .collection('guardians')
        .find({
          verified: true,
          'location.coordinates': { $exists: true },
        })
        .limit(10)
        .toArray();

      for (const guardian of verifiedGuardians) {
        if (!guardian.location?.coordinates) continue;
        const [gLon, gLat] = guardian.location.coordinates;
        if (typeof gLat !== 'number' || typeof gLon !== 'number') continue;

        const dist = calculateHaversineMeters(lat, lon, gLat, gLon);
        if (dist <= radius) {
          locations.push({
            id: `guardian-${guardian.id || guardian._id}`,
            name: guardian.organization || `${guardian.name} (Verified Help Post)`,
            category: guardian.orgType || 'safe',
            address: guardian.areaOfOperation || 'Verified Community Center',
            latitude: gLat,
            longitude: gLon,
            distanceMeters: dist,
            phone: guardian.phone || null,
            operatingHours: '24/7 Community Support',
            whySafe: 'Verified CitySafe community organization and registered safe shelter.',
          });
        }
      }
    } catch {
      // MongoDB optional if running in isolated or test mode
    }

    // Sort all locations by closest distance first
    locations.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Build backwards-compatible arrays for existing callers (Map.tsx, SOSButton.tsx, explore/page.tsx)
    const results: NearbyHelpResult[] = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      category: loc.category,
      phone: loc.phone || undefined,
      address: loc.address,
      distance: loc.distanceMeters,
      lat: loc.latitude,
      lon: loc.longitude,
      operatingHours: loc.operatingHours,
      whySafe: loc.whySafe,
    }));

    const venues = locations.map((loc) => ({
      name: loc.name,
      type: loc.category,
      lat: loc.latitude,
      lon: loc.longitude,
      distance: loc.distanceMeters,
    }));

    return NextResponse.json({
      success: true,
      category,
      provider: providerUsed,
      locations,
      results,
      venues,
    });
  } catch (error: any) {
    console.error('[API/Nearby] Failure fetching from provider:', error.name, error.message);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Request to nearby services timed out.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Nearby services could not be loaded.' },
      { status: 500 }
    );
  }
}
