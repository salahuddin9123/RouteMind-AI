import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useApp } from '../context';

function createCustomIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:12px;font-weight:bold;color:white;">${label}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function CampusMap({ routeFrom, routeTo }: { routeFrom: string, routeTo: string }) {
  const { state } = useApp();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{ buildings: L.LayerGroup; facilities: L.LayerGroup; route: L.LayerGroup }>({
    buildings: L.layerGroup(),
    facilities: L.layerGroup(),
    route: L.layerGroup(),
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [22.7335, 88.5529],
      zoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    }).addTo(map);

    layersRef.current.buildings.addTo(map);
    layersRef.current.facilities.addTo(map);
    layersRef.current.route.addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !state.campusData) return;
    const { buildings, facilities } = state.campusData;

    layersRef.current.buildings.clearLayers();
    layersRef.current.facilities.clearLayers();

    buildings.forEach(b => {
      const icon = createCustomIcon('#3b82f6', '🏢');
      L.marker([b.location.lat, b.location.lng], { icon })
        .bindPopup(`
          <div style="padding:8px">
            <strong style="color:white;font-size:14px;">${b.name}</strong><br/>
            <span style="color:#9ca3af;font-size:11px">Building</span>
          </div>
        `)
        .addTo(layersRef.current.buildings);
    });

    facilities.forEach(f => {
      let color = '#22c55e';
      let symbol = '📍';
      if (f.type === 'gate') { color = '#f59e0b'; symbol = '🚪'; }
      if (f.type === 'canteen' || f.type === 'food_court') { color = '#ef4444'; symbol = '🍽️'; }

      const icon = createCustomIcon(color, symbol);
      L.marker([f.location.lat, f.location.lng], { icon })
        .bindPopup(`
          <div style="padding:8px">
            <strong style="color:white;font-size:14px;">${f.name}</strong><br/>
            <span style="color:#9ca3af;font-size:11px">${f.type.toUpperCase()}</span>
          </div>
        `)
        .addTo(layersRef.current.facilities);
    });

  }, [state.campusData]);

  // Handle routing logic directly on the map if routeFrom and routeTo are provided
  useEffect(() => {
    if (!mapRef.current || !state.campusData) return;
    layersRef.current.route.clearLayers();
    
    if (routeFrom && routeTo && routeFrom !== routeTo) {
      const { buildings } = state.campusData;
      const origin = buildings.find(b => b.id === routeFrom);
      const dest = buildings.find(b => b.id === routeTo);
      
      if (origin && dest) {
         // Draw a simple polyline for demo
         L.polyline([
           [origin.location.lat, origin.location.lng],
           [dest.location.lat, dest.location.lng]
         ], {
           color: '#f59e0b',
           weight: 4,
           opacity: 0.8,
           dashArray: '5 5'
         }).addTo(layersRef.current.route);
         
         mapRef.current.fitBounds(L.latLngBounds([
           [origin.location.lat, origin.location.lng],
           [dest.location.lat, dest.location.lng]
         ]), { padding: [50, 50] });
      }
    }
  }, [routeFrom, routeTo, state.campusData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] md:h-full min-h-[400px] rounded-xl overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
      id="campus-map"
      role="application"
    />
  );
}
