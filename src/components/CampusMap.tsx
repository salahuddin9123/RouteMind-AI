import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useApp } from '../context';

function createCustomIcon(color: string, label: string, isHighlighted = false): L.DivIcon {
  const border = isHighlighted ? '2px solid #38bdf8' : '2px solid white';
  const scale = isHighlighted ? 'scale(1.12)' : 'scale(1)';
  const shadow = isHighlighted ? '0 0 12px rgba(56,189,248,0.7)' : '0 2px 10px rgba(0,0,0,0.4)';
  
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg) ${scale};
      border:${border};box-shadow:${shadow};
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
    "><span style="transform:rotate(45deg);font-size:11px;font-weight:800;color:white;letter-spacing:-0.5px;">${label}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

interface CampusMapProps {
  routeFrom: string;
  routeTo: string;
  onSelectOrigin?: (id: string) => void;
  onSelectDest?: (id: string) => void;
  selectedBuildingId?: string | null;
}

export function CampusMap({
  routeFrom,
  routeTo,
  onSelectOrigin,
  onSelectDest,
  selectedBuildingId
}: CampusMapProps) {
  const { state } = useApp();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{ buildings: L.LayerGroup; facilities: L.LayerGroup; route: L.LayerGroup }>({
    buildings: L.layerGroup(),
    facilities: L.layerGroup(),
    route: L.layerGroup(),
  });

  // Bind global helpers so inline popup HTML buttons can trigger React state
  useEffect(() => {
    (window as any).__campusSetOrigin = (id: string) => onSelectOrigin?.(id);
    (window as any).__campusSetDest = (id: string) => onSelectDest?.(id);

    return () => {
      delete (window as any).__campusSetOrigin;
      delete (window as any).__campusSetDest;
    };
  }, [onSelectOrigin, onSelectDest]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if ((containerRef.current as any)._leaflet_id) {
      delete (containerRef.current as any)._leaflet_id;
    }

    const map = L.map(containerRef.current, {
      center: [22.7335, 88.5529],
      zoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
    }).addTo(map);

    layersRef.current.buildings.addTo(map);
    layersRef.current.facilities.addTo(map);
    layersRef.current.route.addTo(map);

    mapRef.current = map;

    return () => {
      try {
        if (layersRef.current) {
          layersRef.current.buildings.clearLayers();
          layersRef.current.facilities.clearLayers();
          layersRef.current.route.clearLayers();
        }
        map.remove();
      } catch (err) {
        console.warn('CampusMap remove warning:', err);
      }
      mapRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current || !state.campusData) return;
    const { buildings, facilities } = state.campusData;

    layersRef.current.buildings.clearLayers();
    layersRef.current.facilities.clearLayers();

    buildings.forEach(b => {
      const isSelected = selectedBuildingId === b.id || routeFrom === b.id || routeTo === b.id;
      const markerColor = isSelected ? '#0284c7' : '#2563eb';
      const icon = createCustomIcon(markerColor, b.romanNumber || String(b.number), isSelected);

      const popupContent = `
        <div style="padding:10px;min-width:190px;font-family:inherit;color:#f8fafc;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="background:#2563eb;color:#ffffff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">
              Building ${b.romanNumber}
            </span>
            <span style="color:#94a3b8;font-size:10px;font-weight:600;">(No. ${b.number})</span>
          </div>
          <strong style="color:#ffffff;font-size:13px;display:block;margin-bottom:4px;line-height:1.3;">
            ${b.bhavanName || b.name}
          </strong>
          <div style="font-size:11px;color:#cbd5e1;line-height:1.4;margin-bottom:8px;">
            <div>Nearest: <span style="color:#38bdf8;font-weight:500;">${b.nearestGate}</span></div>
            <div>Crowd: <span style="color:#34d399;font-weight:500;">${b.crowdLevel} (${b.occupancy ?? 50}%)</span></div>
          </div>
          <div style="display:flex;gap:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.15);">
            <button
              onclick="window.__campusSetOrigin && window.__campusSetOrigin('${b.id}')"
              style="flex:1;background:#2563eb;color:white;border:none;padding:5px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;"
            >
              Route From
            </button>
            <button
              onclick="window.__campusSetDest && window.__campusSetDest('${b.id}')"
              style="flex:1;background:#334155;color:white;border:none;padding:5px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;"
            >
              Route To
            </button>
          </div>
        </div>
      `;

      L.marker([b.location.lat, b.location.lng], { icon })
        .bindPopup(popupContent)
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
          <div style="padding:8px;font-family:inherit;color:#f8fafc;">
            <strong style="color:white;font-size:13px;">${f.name}</strong><br/>
            <span style="color:#9ca3af;font-size:11px">${f.type.toUpperCase()}</span>
            <div style="font-size:10px;color:#cbd5e1;margin-top:4px;">Status: <strong>${f.status}</strong></div>
          </div>
        `)
        .addTo(layersRef.current.facilities);
    });

  }, [state.campusData, selectedBuildingId, routeFrom, routeTo]);

  // Pan to selected building if specified
  useEffect(() => {
    if (!mapRef.current || !state.campusData || !selectedBuildingId) return;
    const target = state.campusData.buildings.find(b => b.id === selectedBuildingId);
    if (target) {
      mapRef.current.setView([target.location.lat, target.location.lng], 18, { animate: true });
    }
  }, [selectedBuildingId, state.campusData]);

  // Handle routing logic directly on the map if routeFrom and routeTo are provided
  useEffect(() => {
    if (!mapRef.current || !state.campusData) return;
    layersRef.current.route.clearLayers();
    
    if (routeFrom && routeTo && routeFrom !== routeTo) {
      const { buildings } = state.campusData;
      const origin = buildings.find(b => b.id === routeFrom);
      const dest = buildings.find(b => b.id === routeTo);
      
      if (origin && dest) {
        L.polyline([
          [origin.location.lat, origin.location.lng],
          [dest.location.lat, dest.location.lng]
        ], {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.9,
          dashArray: '6 6'
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

