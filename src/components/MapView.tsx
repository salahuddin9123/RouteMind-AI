import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../context';
import { getRiskCircleColor, fetchLiveRoadInfo, fetchLiveFloodZones, fetchLiveClosures, fetchLiveWeather } from '../services';
import { RefreshCw, Radio } from 'lucide-react';

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
      border:3px solid white;box-shadow:0 4px 15px rgba(0,0,0,0.5);
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
      width:30px;height:30px;border-radius:50%;
      background:${color}33;border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,0.4);
    ">${symbol}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

export function MapView() {
  const { state, dispatch } = useApp();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const layersRef = useRef<{ routes: L.LayerGroup; flood: L.LayerGroup; closures: L.LayerGroup; markers: L.LayerGroup }>({
    routes: L.layerGroup(),
    flood: L.layerGroup(),
    closures: L.layerGroup(),
    markers: L.layerGroup(),
  });

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize Leaflet Map instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [22.7335, 88.5529], // Center default on Kolkata / Brainware University region
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    tileGroupRef.current.addTo(map);
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

  // Update Basemap Tiles based on mapStyle preference
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    tileGroupRef.current.clearLayers();
    const style = state.preferences.mapStyle || 'dark';

    if (style === 'streets') {
      // Crisp OpenStreetMap Standard Tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(tileGroupRef.current);
    } else if (style === 'satellite') {
      // Esri Satellite with CartoDB Voyager road & street labels overlay for high contrast
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
        maxZoom: 19,
      }).addTo(tileGroupRef.current);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB',
        maxZoom: 19,
      }).addTo(tileGroupRef.current);
    } else {
      // Dark Mode / Navigation Tiles (CartoDB Dark Matter with clear contrast)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(tileGroupRef.current);
    }
  }, [state.preferences.mapStyle]);

  // Seconds counter for live freshness display
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastRefreshed.getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshed]);

  // Auto-polling for live layer freshness (every 60 seconds)
  const refreshLiveLayers = async () => {
    setIsRefreshing(true);
    try {
      const center = state.originPlace?.location || { lat: 22.7335, lng: 88.5529 };
      const [floodZones, closures, weather] = await Promise.all([
        fetchLiveFloodZones(center, state.demoMode),
        fetchLiveClosures(center),
        fetchLiveWeather(center.lat, center.lng)
      ]);
      dispatch({ type: 'SET_FLOOD_ZONES', payload: floodZones });
      dispatch({ type: 'SET_ROAD_CLOSURES', payload: closures });
      dispatch({ type: 'SET_WEATHER_DATA', payload: weather });
      setLastRefreshed(new Date());
    } catch (e) {
      console.warn('Auto-refresh failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const pollInterval = setInterval(() => {
      refreshLiveLayers();
    }, 60000);
    return () => clearInterval(pollInterval);
  }, [state.originPlace, state.demoMode]);

  // Update routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.routes.clearLayers();
    layersRef.current.markers.clearLayers();

    const { routeComparison, selectedRouteType, originPlace, destinationPlace } = state;

    if (!routeComparison) {
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

    const routes = routeComparison.all.filter((r) => r.coordinates && r.coordinates.length > 0);

    // Draw non-selected routes first (dimmed background paths)
    routes.forEach((route) => {
      if (route.id === selectedRouteType || route.type === selectedRouteType) return;
      L.polyline(route.coordinates, {
        color: route.color,
        weight: 4,
        opacity: 0.35,
        dashArray: '6 6',
      }).addTo(layersRef.current.routes);
    });

    // Draw selected route on top with distinct traffic flow styling
    const selectedRoute = routes.find((r) => r.id === selectedRouteType || r.type === selectedRouteType);
    if (selectedRoute) {
      if (selectedRoute.segments && selectedRoute.segments.some(s => s.coordinates && s.coordinates.length > 0)) {
        selectedRoute.segments.forEach(segment => {
          if (!segment.coordinates || segment.coordinates.length === 0) return;
          const color = segment.trafficLevel === 'critical' ? '#ef4444'
                      : segment.trafficLevel === 'high' ? '#f97316'
                      : segment.trafficLevel === 'moderate' ? '#eab308'
                      : selectedRoute.color;

          // Glowing underlay
          L.polyline(segment.coordinates, {
            color,
            weight: 12,
            opacity: 0.2,
          }).addTo(layersRef.current.routes);

          // Solid line
          L.polyline(segment.coordinates, {
            color,
            weight: 5,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(layersRef.current.routes);
        });
      } else {
        // Fallback solid colored line
        L.polyline(selectedRoute.coordinates, {
          color: selectedRoute.color,
          weight: 12,
          opacity: 0.25,
        }).addTo(layersRef.current.routes);

        L.polyline(selectedRoute.coordinates, {
          color: selectedRoute.color,
          weight: 5,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layersRef.current.routes);
      }

      // Fit map view to route bounds
      if (selectedRoute.coordinates.length > 1) {
        map.fitBounds(L.latLngBounds(selectedRoute.coordinates), { padding: [50, 50] });
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

    const icon = createCustomIcon('#f59e0b', '📍');
    const marker = L.marker([state.searchedPlace.location.lat, state.searchedPlace.location.lng], { icon })
      .bindPopup(`<div style="padding:8px"><strong style="color:white">${state.searchedPlace.name}</strong><br/><span style="color:#9ca3af;font-size:11px">${state.searchedPlace.displayName}</span></div>`)
      .addTo(map);

    map.flyTo([state.searchedPlace.location.lat, state.searchedPlace.location.lng], 15, {
      animate: true,
      duration: 1.5
    });

    return () => {
      marker.remove();
    };
  }, [state.searchedPlace]);

  // Handle Campus Focus
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (state.activePage === 'campus') {
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
        fillOpacity: 0.22,
        weight: 2,
        opacity: 0.6,
      })
        .bindPopup(`
          <div style="padding:8px;min-width:200px">
            <strong style="color:white">${zone.name}</strong>
            <p style="color:#9ca3af;font-size:12px;margin:4px 0">${zone.description}</p>
            <span style="color:${color};font-weight:600;font-size:12px">● ${zone.riskLevel.toUpperCase()} RISK</span>
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
      L.marker([closure.location.lat, closure.location.lng], { icon })
        .bindPopup(`
          <div style="padding:8px;min-width:220px">
            <strong style="color:white">${closure.road}</strong>
            <p style="color:#ef4444;font-size:12px;font-weight:600">🚧 Reported Closure</p>
            <p style="color:#9ca3af;font-size:12px;margin:4px 0">${closure.description}</p>
            <p style="color:#6b7280;font-size:10px;margin-top:4px">Source: ${closure.source}</p>
          </div>
        `)
        .addTo(layersRef.current.closures);
    });
  }, [state.roadClosures, state.showClosureLayer]);

  // Click map for road intelligence
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
  }, [dispatch]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Live Freshness & Layer Polling Status Pill */}
      <div className="absolute top-4 right-4 z-[400] flex items-center gap-2">
        <div className="glass-card px-3 py-1.5 bg-surface-900/90 backdrop-blur-md shadow-xl border border-white/10 flex items-center gap-2 text-[11px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white">Live Layers</span>
          <span className="text-gray-400">
            • {secondsAgo === 0 ? 'Just now' : `${secondsAgo}s ago`}
          </span>
          <button
            onClick={refreshLiveLayers}
            disabled={isRefreshing}
            className="text-gray-400 hover:text-white transition-colors ml-1 p-0.5"
            title="Refresh live layers now"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-brand-400' : ''} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full"
        id="main-map"
        role="application"
        aria-label="Interactive route map"
      />
    </div>
  );
}
