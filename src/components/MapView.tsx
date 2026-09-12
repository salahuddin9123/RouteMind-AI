import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useApp } from '../context';
import { getRiskCircleColor, fetchLiveRoadInfo } from '../services';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createCustomIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 4px 15px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:12px;font-weight:bold;color:white;">${label}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function createHazardIcon(color: string, symbol: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color}33;border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function MapView() {
  const { state, dispatch } = useApp();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{ routes: L.LayerGroup; flood: L.LayerGroup; closures: L.LayerGroup; markers: L.LayerGroup }>({
    routes: L.layerGroup(),
    flood: L.layerGroup(),
    closures: L.layerGroup(),
    markers: L.layerGroup(),
  });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19,
    }).addTo(map);

    // Add layer groups
    layersRef.current.routes.addTo(map);
    layersRef.current.markers.addTo(map);
    layersRef.current.flood.addTo(map);
    layersRef.current.closures.addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.routes.clearLayers();
    layersRef.current.markers.clearLayers();

    const { routeComparison, selectedRouteType, originPlace, destinationPlace } = state;

    if (!routeComparison) {
      // Show origin/destination if set
      if (originPlace) {
        const icon = createCustomIcon('#6366f1', 'A');
        L.marker([originPlace.location.lat, originPlace.location.lng], { icon })
          .bindPopup(`<div class="p-2"><strong class="text-white">${originPlace.name}</strong><br/><span class="text-gray-400 text-xs">Origin</span></div>`)
          .addTo(layersRef.current.markers);
      }
      if (destinationPlace) {
        const icon = createCustomIcon('#ef4444', 'B');
        L.marker([destinationPlace.location.lat, destinationPlace.location.lng], { icon })
          .bindPopup(`<div class="p-2"><strong class="text-white">${destinationPlace.name}</strong><br/><span class="text-gray-400 text-xs">Destination</span></div>`)
          .addTo(layersRef.current.markers);
      }
      return;
    }

    const routes = routeComparison.all.filter((r) => r.coordinates.length > 0);

    // Draw non-selected routes first (dimmed)
    routes.forEach((route) => {
      if (route.id === selectedRouteType || route.type === selectedRouteType) return;
      L.polyline(route.coordinates, {
        color: route.color,
        weight: 4,
        opacity: 0.3,
        dashArray: '6 4',
      }).addTo(layersRef.current.routes);
    });

    // Draw selected route on top
    const selectedRoute = routes.find((r) => r.id === selectedRouteType || r.type === selectedRouteType);
    if (selectedRoute) {
      // Draw segments if they have coordinate data for traffic visualization
      if (selectedRoute.segments && selectedRoute.segments.some(s => s.coordinates && s.coordinates.length > 0)) {
        selectedRoute.segments.forEach(segment => {
          if (!segment.coordinates || segment.coordinates.length === 0) return;
          const color = segment.trafficLevel === 'critical' ? '#ef4444' // red
                      : segment.trafficLevel === 'high' ? '#f97316' // orange
                      : segment.trafficLevel === 'moderate' ? '#eab308' // yellow
                      : '#32cd32'; // lime green for fast traffic
          
          L.polyline(segment.coordinates, {
            color,
            weight: 12,
            opacity: 0.15,
          }).addTo(layersRef.current.routes);

          L.polyline(segment.coordinates, {
            color,
            weight: 5,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(layersRef.current.routes);
        });
      } else {
        // Fallback single color
        L.polyline(selectedRoute.coordinates, {
          color: selectedRoute.color,
          weight: 12,
          opacity: 0.15,
        }).addTo(layersRef.current.routes);

        L.polyline(selectedRoute.coordinates, {
          color: selectedRoute.color,
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layersRef.current.routes);
      }

      // Fit map to selected route
      if (selectedRoute.coordinates.length > 1) {
        map.fitBounds(L.latLngBounds(selectedRoute.coordinates), { padding: [40, 40] });
      }
    }

    // Origin marker
    if (originPlace) {
      const icon = createCustomIcon('#6366f1', 'A');
      L.marker([originPlace.location.lat, originPlace.location.lng], { icon })
        .bindPopup(`<div style="padding:8px"><strong style="color:white">${originPlace.name}</strong><br/><span style="color:#9ca3af;font-size:11px">Origin</span></div>`)
        .addTo(layersRef.current.markers);
    }

    // Destination marker
    if (destinationPlace) {
      const icon = createCustomIcon('#ef4444', 'B');
      L.marker([destinationPlace.location.lat, destinationPlace.location.lng], { icon })
        .bindPopup(`<div style="padding:8px"><strong style="color:white">${destinationPlace.name}</strong><br/><span style="color:#9ca3af;font-size:11px">Destination</span></div>`)
        .addTo(layersRef.current.markers);
    }
  }, [state.routeComparison, state.selectedRouteType, state.originPlace, state.destinationPlace]);

  // Handle Searched Place
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !state.searchedPlace) return;

    // Clear previous search markers? Wait, the main markers effect handles origin/destination. 
    // We should draw a special marker for searchedPlace if it exists.
    // However, if we just want to jump to it, we can use flyTo and add a temporary marker.
    // Let's add it to layersRef.current.markers, but we need to ensure it doesn't conflict. 
    // Actually, creating a separate effect to just add the marker and fly to it is cleaner.
    const icon = createCustomIcon('#f59e0b', '📍'); // Amber color for search
    const marker = L.marker([state.searchedPlace.location.lat, state.searchedPlace.location.lng], { icon })
      .bindPopup(`<div style="padding:8px"><strong style="color:white">${state.searchedPlace.name}</strong><br/><span style="color:#9ca3af;font-size:11px">${state.searchedPlace.displayName}</span></div>`)
      .addTo(map);

    map.flyTo([state.searchedPlace.location.lat, state.searchedPlace.location.lng], 14, {
      animate: true,
      duration: 1.5
    });

    return () => {
      marker.remove();
    };
  }, [state.searchedPlace]);

  // Handle Campus Page Focus
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    if (state.activePage === 'campus') {
      // Zoom into Brainware University, Barasat
      map.flyTo([22.7335, 88.5529], 17, {
        animate: true,
        duration: 1.5
      });
    }
  }, [state.activePage]);

  // Flood zones layer
  useEffect(() => {
    layersRef.current.flood.clearLayers();
    if (!state.showFloodLayer) return;

    state.floodZones.forEach((zone) => {
      const color = getRiskCircleColor(zone.riskLevel);
      L.circle([zone.center.lat, zone.center.lng], {
        radius: zone.radius,
        color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
        opacity: 0.5,
      })
        .bindPopup(`
          <div style="padding:8px;min-width:200px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <strong style="color:white">${zone.name}</strong>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-bottom:4px">${zone.description}</p>
            <div style="display:flex;align-items:center;gap:4px">
              <span style="color:${color};font-weight:600;font-size:12px">● ${zone.riskLevel.toUpperCase()} RISK</span>
            </div>
            <p style="color:#6b7280;font-size:10px;margin-top:4px">Source: ${zone.source}</p>
          </div>
        `)
        .addTo(layersRef.current.flood);
    });
  }, [state.floodZones, state.showFloodLayer]);

  // Road closures layer
  useEffect(() => {
    layersRef.current.closures.clearLayers();
    if (!state.showClosureLayer) return;

    state.roadClosures.forEach((closure) => {
      const icon = createHazardIcon('#ef4444', '🚧');
      const reasonLabels: Record<string, string> = {
        flooding: 'Flooding', construction: 'Construction',
        accident: 'Accident', maintenance: 'Maintenance', other: 'Other',
      };
      L.marker([closure.location.lat, closure.location.lng], { icon })
        .bindPopup(`
          <div style="padding:8px;min-width:220px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <strong style="color:white">${closure.road}</strong>
            </div>
            <p style="color:#ef4444;font-size:12px;font-weight:600">🚧 ${reasonLabels[closure.reason] || 'Closure'}</p>
            <p style="color:#9ca3af;font-size:12px;margin:4px 0">${closure.description}</p>
            ${closure.expectedReopening ? `<p style="color:#6b7280;font-size:11px">Expected: ${closure.expectedReopening}</p>` : ''}
            <p style="color:#6b7280;font-size:10px;margin-top:4px">Source: ${closure.source}</p>
          </div>
        `)
        .addTo(layersRef.current.closures);
    });
  }, [state.roadClosures, state.showClosureLayer]);

  // Map click for road info
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      fetchLiveRoadInfo(e.latlng.lat, e.latlng.lng).then(info => {
        if (info) dispatch({ type: 'SET_SELECTED_ROAD', payload: info });
      });
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [state.demoMode, dispatch]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px]"
      id="main-map"
      role="application"
      aria-label="Interactive route map"
    />
  );
}
