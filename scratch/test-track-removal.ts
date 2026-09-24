async function runTests() {
  console.log('--- 1. Testing Route HTTP Statuses ---');
  const pages = ['/home', '/explore', '/route', '/safety-tools', '/track', '/active-journey'];
  for (const page of pages) {
    try {
      const res = await fetch(`http://localhost:3000${page}`);
      console.log(`[HTTP ${res.status}] ${page} (Content length: ${(await res.text()).length})`);
    } catch (e: any) {
      console.error(`[FAIL] ${page}:`, e.message);
    }
  }

  console.log('\n--- 2. Checking HTML for Track Navigation and Dead Links ---');
  const homeRes = await fetch('http://localhost:3000/home');
  const homeHtml = await homeRes.text();

  // Check navigation links
  const hasTrackInNav = homeHtml.includes('href="/track"');
  console.log('Contains href="/track" in Home HTML:', hasTrackInNav ? 'FAIL (Found)' : 'PASS (Not Found)');

  const hasHomeNav = homeHtml.includes('href="/"');
  const hasExploreNav = homeHtml.includes('href="/explore"');
  const hasToolsNav = homeHtml.includes('href="/safety-tools"');
  const hasProfileNav = homeHtml.includes('href="/profile"');
  console.log('Navigation items: Home:', hasHomeNav, 'Explore:', hasExploreNav, 'Tools:', hasToolsNav, 'Profile:', hasProfileNav);

  console.log('\n--- 3. Testing Active Journey API Sync ---');
  const testId = `jny-test-${Date.now()}`;
  const locRes = await fetch(`http://localhost:3000/api/journeys/${testId}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: 19.0544,
      lng: 72.8402,
      status: 'active',
      destination: { lat: 19.0800, lng: 72.8400, address: 'Bandra Station' },
      routeScore: 88
    })
  });
  console.log('POST /api/journeys/[id]/location status:', locRes.status);
  const locData = await locRes.json();
  console.log('POST location response:', locData);

  const patchRes = await fetch(`http://localhost:3000/api/journeys/${testId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' })
  });
  console.log('PATCH /api/journeys/[id] status:', patchRes.status);
  const patchData = await patchRes.json();
  console.log('PATCH response:', patchData);

  console.log('\n=== ALL TESTS COMPLETED ===');
}

runTests();
