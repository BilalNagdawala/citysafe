async function test() {
  const query = `[out:json][timeout:15];
(
  node["amenity"="police"](around:5000,19.076,72.8777);
  way["amenity"="police"](around:5000,19.076,72.8777);
);
out center 5;`;

  try {
    const categories = ['police', 'hospital', 'fire_station', 'social_facility'];
    const lat = 19.0760;
    const lng = 72.8777;
    // Bounding box ~3km
    const delta = 3000 / 111320;
    const minLat = lat - delta;
    const maxLat = lat + delta;
    const minLng = lng - delta;
    const maxLng = lng + delta;

    for (const cat of categories) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&amenity=${cat}&bounded=1&viewbox=${minLng},${maxLat},${maxLng},${minLat}&limit=3`;
      const res = await fetch(url, { headers: { 'User-Agent': 'CitySafe-App/1.0 (emergency-safety-app)' } });
      const data = await res.json();
      console.log(`Cat [${cat}] found:`, data.length);
      if (data[0]) {
        console.log(` -> ${data[0].display_name.split(',')[0]} (${data[0].lat}, ${data[0].lon})`);
      }
    }
  } catch (err) {
    console.error('OSM error:', err);
  }
}
test();
