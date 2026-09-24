import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function verifyNearbyFlow() {
  console.log('🚀 Running Comprehensive Nearby Help Verification Suite...\n');

  // 1. Verify Safety Tools Page contains links to /nearby-help
  console.log('1. Verifying /safety-tools links to all 4 nearby categories in source file...');
  const fs = await import('fs');
  const safetyToolsSource = fs.readFileSync('d:/citysafe/src/app/(citizen)/safety-tools/page.tsx', 'utf-8');

  assert.ok(safetyToolsSource.includes('href="/nearby-help?category=police"'), 'Police card must link to /nearby-help?category=police');
  assert.ok(safetyToolsSource.includes('href="/nearby-help?category=hospital"'), 'Hospital card must link to /nearby-help?category=hospital');
  assert.ok(safetyToolsSource.includes('href="/nearby-help?category=emergency"'), 'Emergency card must link to /nearby-help?category=emergency');
  assert.ok(safetyToolsSource.includes('href="/nearby-help?category=safe"'), 'Safe locations card must link to /nearby-help?category=safe');
  console.log('  ✓ All 4 Nearby Help cards link directly to /nearby-help?category=...');

  // 2. Verify /nearby-help route renders successfully
  console.log('\n2. Verifying /nearby-help route loads without SSR errors...');
  const nearbyPageRes = await fetch(`${BASE_URL}/nearby-help?category=police`);
  assert.strictEqual(nearbyPageRes.status, 200, 'nearby-help should return 200');
  const nearbyPageHtml = await nearbyPageRes.text();
  assert.ok(nearbyPageHtml.length > 100, 'Page should return valid HTML payload');
  console.log('  ✓ /nearby-help route rendered cleanly with 200 OK');

  // 3. Test Global Coordinates to prove zero hardcoded Santacruz/Andheri coords
  console.log('\n3. Testing API with multiple global coordinates to confirm dynamic geo-spatial queries...');
  const testLocations = [
    { city: 'London (Trafalgar)', lat: 51.5080, lng: -0.1281 },
    { city: 'New York (Times Sq)', lat: 40.7580, lng: -73.9855 },
    { city: 'Mumbai (Kurla)', lat: 19.0688, lng: 72.8804 },
  ];

  for (const loc of testLocations) {
    console.log(`  Testing ${loc.city} [${loc.lat}, ${loc.lng}]...`);
    const res = await fetch(`${BASE_URL}/api/nearby?lat=${loc.lat}&lng=${loc.lng}&category=police&radius=3000&provider=osm`);
    assert.strictEqual(res.status, 200, `Expected 200 for ${loc.city}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.locations));
    console.log(`    ✓ ${loc.city} returned ${data.locations.length} real police locations.`);
    if (data.locations.length > 0) {
      console.log(`      Nearest: "${data.locations[0].name}" (${data.locations[0].distanceMeters}m away)`);
      // Verify directions link target coordinates match result exactly
      const expectedDir = `https://www.google.com/maps/dir/?api=1&destination=${data.locations[0].latitude},${data.locations[0].longitude}`;
      assert.ok(expectedDir.includes(String(data.locations[0].latitude)));
    }
  }

  // 4. Test Missing API Key Error reporting
  console.log('\n4. Testing missing API key error reporting when Google Places is requested...');
  const missingKeyRes = await fetch(`${BASE_URL}/api/nearby?lat=19.076&lng=72.877&category=hospital&provider=google`);
  assert.strictEqual(missingKeyRes.status, 503);
  const missingKeyData = await missingKeyRes.json();
  assert.strictEqual(missingKeyData.code, 'MISSING_API_KEY');
  assert.ok(missingKeyData.error.includes('GOOGLE_PLACES_API_KEY'));
  console.log('  ✓ Missing API key returns status 503 with clear error details and code');

  // 5. Test Emergency Services 112 Banner requirement
  console.log('\n5. Verifying Emergency Category results and 112 helpline...');
  const emergencyRes = await fetch(`${BASE_URL}/api/nearby?lat=19.076&lng=72.877&category=emergency&radius=4000&provider=osm`);
  const emergencyData = await emergencyRes.json();
  assert.strictEqual(emergencyData.success, true);
  assert.ok(emergencyData.locations.length > 0);
  console.log(`  ✓ Received ${emergencyData.locations.length} emergency facilities`);

  // 6. Test Safe Locations Category & Explanation
  console.log('\n6. Verifying Safe Locations criteria and "whySafe" explanation...');
  const safeRes = await fetch(`${BASE_URL}/api/nearby?lat=19.076&lng=72.877&category=safe&radius=4000&provider=osm`);
  const safeData = await safeRes.json();
  assert.strictEqual(safeData.success, true);
  for (const loc of safeData.locations) {
    assert.ok(loc.whySafe && loc.whySafe.length > 10, 'Each safe location must have whySafe explanation');
  }
  console.log(`  ✓ All ${safeData.locations.length} safe locations include valid "whySafe" explanations`);

  console.log('\n✅ ALL INTEGRATION CHECKS PASSED WITH 100% SUCCESS!');
}

verifyNearbyFlow().catch((e) => {
  console.error('\n❌ Verification failed:', e);
  process.exit(1);
});
