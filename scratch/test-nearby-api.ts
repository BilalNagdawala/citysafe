import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting /api/nearby verification tests...\n');

  // Test 1: Coordinate Validation
  console.log('Test 1: Validating missing & invalid coordinates...');
  const resMissing = await fetch(`${BASE_URL}/api/nearby`);
  assert.strictEqual(resMissing.status, 400, 'Should return 400 for missing coords');
  const dataMissing = await resMissing.json();
  assert.strictEqual(dataMissing.success, false);
  console.log('  ✓ Missing coordinates rejected with 400');

  const resInvalid = await fetch(`${BASE_URL}/api/nearby?lat=999&lng=999`);
  assert.strictEqual(resInvalid.status, 400, 'Should return 400 for out-of-bounds coords');
  console.log('  ✓ Out-of-bounds coordinates rejected with 400');

  // Test 2: Category Validation
  console.log('\nTest 2: Validating category restrictions...');
  const resBadCat = await fetch(`${BASE_URL}/api/nearby?lat=19.076&lng=72.877&category=cinema`);
  assert.strictEqual(resBadCat.status, 400, 'Should return 400 for invalid category');
  console.log('  ✓ Invalid category rejected with 400');

  // Test 3: Missing API Key handling for Google Provider
  console.log('\nTest 3: Validating missing API key error when Google Places is requested...');
  const resGoogleMissing = await fetch(`${BASE_URL}/api/nearby?lat=19.076&lng=72.877&category=police&provider=google`);
  assert.strictEqual(resGoogleMissing.status, 503, 'Should return 503 for missing Google Places API key');
  const dataGoogleMissing = await resGoogleMissing.json();
  assert.strictEqual(dataGoogleMissing.code, 'MISSING_API_KEY', 'Error code should be MISSING_API_KEY');
  assert.ok(dataGoogleMissing.error.includes('not configured'), 'Error message should clearly state missing key');
  console.log('  ✓ Missing Google Places API key clearly returned with 503 & MISSING_API_KEY code');

  // Test 4: Live OSM Queries across all 4 categories (real coordinates)
  const testCoords = { lat: 19.0760, lng: 72.8777 }; // Real coordinates
  const categories = ['police', 'hospital', 'emergency', 'safe'] as const;

  for (const cat of categories) {
    console.log(`\nTest 4 [Category: ${cat}]: Fetching nearby facilities...`);
    const res = await fetch(`${BASE_URL}/api/nearby?lat=${testCoords.lat}&lng=${testCoords.lng}&category=${cat}&radius=5000&provider=osm`);
    assert.strictEqual(res.status, 200, `Expected 200 for category ${cat}`);
    const data = await res.json();
    
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.category, cat);
    assert.strictEqual(data.provider, 'osm');
    assert.ok(Array.isArray(data.locations), 'locations should be an array');
    assert.ok(Array.isArray(data.results), 'results backwards-compatibility array should be present');

    console.log(`  ✓ Received ${data.locations.length} real locations for ${cat}`);
    if (data.locations.length > 0) {
      const first = data.locations[0];
      assert.ok(first.id, 'Location should have unique id');
      assert.ok(first.name, 'Location should have name');
      assert.ok(typeof first.latitude === 'number', 'Location should have latitude number');
      assert.ok(typeof first.longitude === 'number', 'Location should have longitude number');
      assert.ok(typeof first.distanceMeters === 'number', 'Location should have distanceMeters');
      assert.ok(first.whySafe, 'Location should have whySafe explanation');
      assert.ok('phone' in first, 'Location should explicitly have phone field (null or string)');
      
      console.log(`    Sample: "${first.name}" | Distance: ${first.distanceMeters}m | Phone: ${first.phone || 'Phone number unavailable'}`);
      console.log(`    Why Safe: "${first.whySafe}"`);

      // Verify sorted by distance
      for (let i = 1; i < data.locations.length; i++) {
        assert.ok(data.locations[i].distanceMeters >= data.locations[i - 1].distanceMeters, 'Locations should be sorted by distance ascending');
      }
      console.log('    ✓ Locations correctly sorted by distance');
    }
  }

  console.log('\n🎉 ALL /api/nearby verification tests passed successfully!');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
