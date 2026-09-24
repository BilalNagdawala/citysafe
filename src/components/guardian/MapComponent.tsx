'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="w-full flex items-center justify-center bg-slate-100" style={{ height: '400px' }}>
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
});

interface MapComponentProps {
  center: { lat: number, lng: number };
  zoom?: number;
  height?: string;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    type: 'report' | 'ngo' | 'guardian' | 'alert';
    label?: string;
  }>;
}

export function MapComponent({ center, zoom = 14, height = '400px', markers = [] }: MapComponentProps) {
  // Convert our custom markers format to the incidents format expected by Map
  const incidents = markers.map(m => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    category: m.label || m.type,
    description: m.type,
    timestamp: new Date().toISOString(),
    severity: m.type === 'alert' ? 'high' : 'medium'
  }));

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[--glass-border] z-0" style={{ height }}>
      <Map 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        incidents={incidents}
      />
    </div>
  );
}
