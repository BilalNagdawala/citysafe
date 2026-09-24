import assert from 'assert';
import { isValidLatLng, parseLatLng } from '../src/lib/geo-utils';

const BASE_URL = 'http://localhost:3000';

async function runGuardianMapLatLngTests() {
  console.log('🛡️ Testing Guardian Map LatLng validation & data normalization...\n');

  // ----------------------------------------------------
  // Test 1: Unit testing isValidLatLng validator
  // ----------------------------------------------------
  console.log('Test 1: Testing isValidLatLng validator...');
  assert.strictEqual(isValidLatLng({ lat: 19.076, lng: 72.877 }), true, 'Valid lat/lng should be true');
  assert.strictEqual(isValidLatLng({ lat: -90, lng: -180 }), true, 'Boundary lat/lng should be true');
  assert.strictEqual(isValidLatLng({ lat: 90, lng: 180 }), true, 'Boundary lat/lng should be true');

  // Invalid cases:
  assert.strictEqual(isValidLatLng(null), false, 'null must be false');
  assert.strictEqual(isValidLatLng(undefined), false, 'undefined must be false');
  assert.strictEqual(isValidLatLng({}), false, 'empty object must be false');
  assert.strictEqual(isValidLatLng({ lat: undefined, lng: undefined }), false, '{lat: undefined, lng: undefined} must be false');
  assert.strictEqual(isValidLatLng({ lat: 19.076 }), false, 'missing lng must be false');
  assert.strictEqual(isValidLatLng({ lng: 72.877 }), false, 'missing lat must be false');
  assert.strictEqual(isValidLatLng({ lat: 91, lng: 72.877 }), false, 'lat > 90 must be false');
  assert.strictEqual(isValidLatLng({ lat: -91, lng: 72.877 }), false, 'lat < -90 must be false');
  assert.strictEqual(isValidLatLng({ lat: 19.076, lng: 181 }), false, 'lng > 180 must be false');
  assert.strictEqual(isValidLatLng({ lat: 19.076, lng: -181 }), false, 'lng < -180 must be false');
  assert.strictEqual(isValidLatLng({ lat: NaN, lng: 72.877 }), false, 'NaN must be false');
  assert.strictEqual(isValidLatLng({ lat: Infinity, lng: 72.877 }), false, 'Infinity must be false');
  assert.strictEqual(isValidLatLng({ lat: '19.076', lng: '72.877' }), false, 'string coordinates must be false for isValidLatLng');
  console.log('  ✓ isValidLatLng strictly validates coordinates and rejects invalid/undefined/NaN');

  // ----------------------------------------------------
  // Test 2: Unit testing parseLatLng normalizer
  // ----------------------------------------------------
  console.log('\nTest 2: Testing parseLatLng normalizer across all formats...');

  // GeoJSON Point: [longitude, latitude]
  const geoJsonPoint = { type: 'Point', coordinates: [72.8777, 19.0760] };
  const parsedGeo = parseLatLng(geoJsonPoint);
  assert.ok(parsedGeo !== null, 'GeoJSON should parse');
  assert.strictEqual(parsedGeo.lat, 19.0760, 'lat should be coordinates[1]');
  assert.strictEqual(parsedGeo.lng, 72.8777, 'lng should be coordinates[0]');
  console.log('  ✓ GeoJSON [longitude, latitude] correctly converted to { lat: coordinates[1], lng: coordinates[0] }');

  // Standard { lat, lng }
  const standard = { lat: 19.1136, lng: 72.8697 };
  const parsedStd = parseLatLng(standard);
  assert.ok(parsedStd !== null);
  assert.strictEqual(parsedStd.lat, 19.1136);
  assert.strictEqual(parsedStd.lng, 72.8697);
  console.log('  ✓ Standard { lat, lng } correctly normalized');

  // Alternate { latitude, longitude }
  const altFormat = { latitude: 18.9690, longitude: 72.8193 };
  const parsedAlt = parseLatLng(altFormat);
  assert.ok(parsedAlt !== null);
  assert.strictEqual(parsedAlt.lat, 18.9690);
  assert.strictEqual(parsedAlt.lng, 72.8193);
  console.log('  ✓ Alternate { latitude, longitude } correctly normalized');

  // String coordinates
  const strFormat = { lat: '19.076', lng: '72.877' };
  const parsedStr = parseLatLng(strFormat);
  assert.ok(parsedStr !== null);
  assert.strictEqual(typeof parsedStr.lat, 'number');
  assert.strictEqual(parsedStr.lat, 19.076);
  console.log('  ✓ String numeric coordinates safely parsed to numbers');

  // Missing / null / invalid
  assert.strictEqual(parseLatLng(null), null);
  assert.strictEqual(parseLatLng({}), null);
  assert.strictEqual(parseLatLng({ coordinates: ['invalid', 'invalid'] }), null);
  assert.strictEqual(parseLatLng({ lat: 200, lng: 10 }), null);
  console.log('  ✓ Invalid/missing coordinates safely returned as null (no fake coordinates created)');

  // ----------------------------------------------------
  // Test 3: Multiple journeys filtering test
  // ----------------------------------------------------
  console.log('\nTest 3: Testing filtering of mixed valid and invalid journeys...');
  const mockJourneys = [
    { id: 'j1', userName: 'Valid User 1', currentLocation: { lat: 19.076, lng: 72.877 } },
    { id: 'j2', userName: 'Invalid Coords', currentLocation: { lat: undefined, lng: undefined } },
    { id: 'j3', userName: 'Waiting for Location', currentLocation: null },
    { id: 'j4', userName: 'GeoJSON User', currentLocation: { type: 'Point', coordinates: [72.88, 19.08] } },
    { id: 'j5', userName: 'Out of bounds', currentLocation: { lat: 95, lng: 72.88 } },
  ];

  // Apply normalization as done in API / Provider
  const normalizedJourneys = mockJourneys.map(j => ({
    ...j,
    currentLocation: parseLatLng(j.currentLocation),
  }));

  // Filter with isValidLatLng as done in GuardianMap.tsx
  const validRenderable = normalizedJourneys.filter(j => isValidLatLng(j.currentLocation));
  assert.strictEqual(validRenderable.length, 2, 'Only 2 valid journeys should be renderable (j1 and j4)');
  assert.strictEqual(validRenderable[0].id, 'j1');
  assert.strictEqual(validRenderable[1].id, 'j4');
  console.log('  ✓ Successfully skipped j2, j3, and j5 without throwing any LatLng error');

  // ----------------------------------------------------
  // Test 4: Live API endpoint /api/guardian/map-data
  // ----------------------------------------------------
  console.log('\nTest 4: Verifying /api/guardian/map-data normalized schema...');
  const mapDataRes = await fetch(`${BASE_URL}/api/guardian/map-data`);
  assert.strictEqual(mapDataRes.status, 200, 'map-data API should return 200');
  const mapData = await mapDataRes.json();
  assert.ok(Array.isArray(mapData.journeys), 'journeys should be an array');
  assert.ok(Array.isArray(mapData.incidents), 'incidents should be an array');
  assert.ok(Array.isArray(mapData.alerts), 'alerts should be an array');

  for (const j of mapData.journeys) {
    if (j.currentLocation !== null) {
      assert.strictEqual(typeof j.currentLocation.lat, 'number', 'lat must be a number if present');
      assert.strictEqual(typeof j.currentLocation.lng, 'number', 'lng must be a number if present');
      assert.ok(!isNaN(j.currentLocation.lat), 'lat must not be NaN');
      assert.ok(!isNaN(j.currentLocation.lng), 'lng must not be NaN');
      assert.ok(isValidLatLng(j.currentLocation), 'currentLocation must pass isValidLatLng');
    }
  }
  console.log(`  ✓ All ${mapData.journeys.length} journeys from /api/guardian/map-data strictly comply with { lat, lng } | null`);

  // ----------------------------------------------------
  // Test 5: Live API endpoint /api/journeys/[id]/location
  // ----------------------------------------------------
  console.log('\nTest 5: Testing location updates and invalid coordinate rejection...');
  const testJourneyId = `test-jny-${Date.now()}`;
  
  // Rejects invalid coordinates
  const rejectRes = await fetch(`${BASE_URL}/api/journeys/${testJourneyId}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 999, lng: 999 }),
  });
  assert.strictEqual(rejectRes.status, 400, 'Invalid coordinates must be rejected with 400');
  console.log('  ✓ Invalid coordinates (lat: 999) rejected with 400 Bad Request');

  // Accepts valid coordinates and initializes journey
  const acceptRes = await fetch(`${BASE_URL}/api/journeys/${testJourneyId}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 19.0760, lng: 72.8777, status: 'active' }),
  });
  assert.strictEqual(acceptRes.status, 200, 'Valid location update should return 200');
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptData.success, true);
  assert.ok(acceptData.journey !== null);
  assert.ok(isValidLatLng(acceptData.journey.currentLocation), 'Returned journey currentLocation must be valid LatLng');
  assert.strictEqual(acceptData.journey.currentLocation.lat, 19.0760);
  assert.strictEqual(acceptData.journey.currentLocation.lng, 72.8777);
  console.log('  ✓ Valid GPS location created journey and returned normalized { lat, lng, updatedAt }');

  console.log('\n🎉 ALL GUARDIAN MAP LATLNG TESTS PASSED WITH 100% SUCCESS!');
}

runGuardianMapLatLngTests().catch(err => {
  console.error('\n❌ Guardian Map LatLng test failed:', err);
  process.exit(1);
});
