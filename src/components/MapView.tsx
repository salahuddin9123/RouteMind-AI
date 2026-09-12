import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../context';
import {
  getRiskCircleColor, fetchLiveRoadInfo, fetchLiveFloodZones,
  fetchLiveClosures, fetchLiveWeather, loadGoogleMapsScript,
  isGoogleMapsAuthFailed
} from '../services';
import { RefreshCw, Radio, AlertTriangle, Check, Layers, Eye, Compass, Info, MapPin } from 'lucide-react';
import { StreetViewModal } from './StreetViewModal';

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

// Google Maps Dark Theme Styling
const darkGoogleMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#181b26" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#181b26" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4338ca" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#312e81" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] }
];

export function MapView() {
  const { state, dispatch } = useApp();

  // Mode & Key State
  const configuredApiKey = state.apiConfig.googleMapsApiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [useGoogleMaps, setUseGoogleMaps] = useState<boolean>(Boolean(configuredApiKey && state.mapEngine === 'google'));
  const [googleLoadFailed, setGoogleLoadFailed] = useState<boolean>(false);
  const [googleLoadErrorMsg, setGoogleLoadErrorMsg] = useState<string>('');

  // Leaflet references
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const tileGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const leafletLayersRef = useRef<{ routes: L.LayerGroup; flood: L.LayerGroup; closures: L.LayerGroup; markers: L.LayerGroup }>({
    routes: L.layerGroup(),
    flood: L.layerGroup(),
    closures: L.layerGroup(),
    markers: L.layerGroup(),
  });

  // Google Maps references
  const googleMapRef = useRef<any>(null);
  const googleContainerRef = useRef<HTMLDivElement>(null);
  const googleTrafficLayerRef = useRef<any>(null);
  const googleOverlaysRef = useRef<{ polylines: any[]; markers: any[]; circles: any[] }>({
    polylines: [],
    markers: [],
    circles: []
  });

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize Google Maps if API key provided
  useEffect(() => {
    if (!configuredApiKey || state.mapEngine !== 'google') {
      setUseGoogleMaps(false);
      return;
    }

    let isMounted = true;
    loadGoogleMapsScript(configuredApiKey)
      .then((loaded) => {
        if (!isMounted) return;
        if (loaded && !isGoogleMapsAuthFailed()) {
          setUseGoogleMaps(true);
          setGoogleLoadFailed(false);
        } else {
          setUseGoogleMaps(false);
          setGoogleLoadFailed(true);
          setGoogleLoadErrorMsg('Google Maps key failed validation or referrer check. Fallen back to OpenStreetMap.');
          dispatch({ type: 'SET_MAP_ENGINE', payload: 'leaflet' });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setUseGoogleMaps(false);
        setGoogleLoadFailed(true);
        setGoogleLoadErrorMsg('Network error connecting to Google Maps.');
        dispatch({ type: 'SET_MAP_ENGINE', payload: 'leaflet' });
      });

    return () => {
      isMounted = false;
    };
  }, [configuredApiKey, state.mapEngine]);

  // ==================== 1. GOOGLE MAPS ENGINE ====================
  useEffect(() => {
    if (!useGoogleMaps || !googleContainerRef.current) return;
    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    if (!googleMapRef.current) {
      const gMap = new gmaps.Map(googleContainerRef.current, {
        center: { lat: 22.7335, lng: 88.5529 },
        zoom: 12,
        styles: state.preferences.mapStyle === 'streets' ? [] : darkGoogleMapStyles,
        mapTypeId: state.preferences.mapStyle === 'satellite' ? gmaps.MapTypeId.HYBRID : gmaps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        mapTypeControl: false,
      });

      // Initialize Traffic Layer
      const trafficLayer = new gmaps.TrafficLayer();
      if (state.showTrafficLayer) {
        trafficLayer.setMap(gMap);
      }
      googleTrafficLayerRef.current = trafficLayer;

      // Click to inspect road & street view
      gMap.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        fetchLiveRoadInfo(lat, lng).then((info) => {
          if (info) dispatch({ type: 'SET_SELECTED_ROAD', payload: info });
        });
      });

      googleMapRef.current = gMap;
    } else {
      // Update styling / map type
      const gMap = googleMapRef.current;
      gMap.setOptions({
        styles: state.preferences.mapStyle === 'streets' ? [] : darkGoogleMapStyles,
        mapTypeId: state.preferences.mapStyle === 'satellite' ? gmaps.MapTypeId.HYBRID : gmaps.MapTypeId.ROADMAP,
      });
    }
  }, [useGoogleMaps, state.preferences.mapStyle]);

  // Toggle Google Traffic Layer
  useEffect(() => {
    if (!googleTrafficLayerRef.current) return;
    if (state.showTrafficLayer) {
      googleTrafficLayerRef.current.setMap(googleMapRef.current);
    } else {
      googleTrafficLayerRef.current.setMap(null);
    }
  }, [state.showTrafficLayer, useGoogleMaps]);

  // Update Google Maps Overlays (Routes, Markers, Flood, Closures)
  useEffect(() => {
    if (!useGoogleMaps || !googleMapRef.current) return;
    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    const gMap = googleMapRef.current;

    // Clear previous Google overlays
    googleOverlaysRef.current.polylines.forEach(p => p.setMap(null));
    googleOverlaysRef.current.markers.forEach(m => m.setMap(null));
    googleOverlaysRef.current.circles.forEach(c => c.setMap(null));
    googleOverlaysRef.current = { polylines: [], markers: [], circles: [] };

    // 1. Draw Routes
    const { routeComparison, selectedRouteType, originPlace, destinationPlace } = state;
    if (routeComparison && routeComparison.all?.length > 0) {
      const bounds = new gmaps.LatLngBounds();

      routeComparison.all.forEach((route) => {
        const isSelected = route.id === selectedRouteType || route.type === selectedRouteType;
        const path = (route.coordinates || []).map(([lat, lng]) => {
          const pt = new gmaps.LatLng(lat, lng);
          if (isSelected) bounds.extend(pt);
          return pt;
        });

        if (path.length > 0) {
          const polyline = new gmaps.Polyline({
            path,
            geodesic: true,
            strokeColor: route.color || '#3b82f6',
            strokeOpacity: isSelected ? 0.95 : 0.35,
            strokeWeight: isSelected ? 6 : 3,
            zIndex: isSelected ? 50 : 10,
            map: gMap,
          });

          // Clicking polyline opens Street View at that point
          polyline.addListener('click', (e: any) => {
            dispatch({
              type: 'SET_STREET_VIEW_LOCATION',
              payload: {
                lat: e.latLng.lat(),
                lng: e.latLng.lng(),
                title: `${route.label} — Street View 360°`
              }
            });
          });

          googleOverlaysRef.current.polylines.push(polyline);
        }
      });

      if (!bounds.isEmpty()) {
        gMap.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      }
    }

    // 2. Draw Origin & Destination Markers
    if (originPlace) {
      const markerA = new gmaps.Marker({
        position: { lat: originPlace.location.lat, lng: originPlace.location.lng },
        map: gMap,
        title: `Origin: ${originPlace.name}`,
        label: { text: 'A', color: 'white', fontWeight: 'bold' },
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#4f46e5',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      markerA.addListener('click', () => {
        dispatch({
          type: 'SET_STREET_VIEW_LOCATION',
          payload: {
            lat: originPlace.location.lat,
            lng: originPlace.location.lng,
            title: `Origin: ${originPlace.name}`
          }
        });
      });
      googleOverlaysRef.current.markers.push(markerA);
    }

    if (destinationPlace) {
      const markerB = new gmaps.Marker({
        position: { lat: destinationPlace.location.lat, lng: destinationPlace.location.lng },
        map: gMap,
        title: `Destination: ${destinationPlace.name}`,
        label: { text: 'B', color: 'white', fontWeight: 'bold' },
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      markerB.addListener('click', () => {
        dispatch({
          type: 'SET_STREET_VIEW_LOCATION',
          payload: {
            lat: destinationPlace.location.lat,
            lng: destinationPlace.location.lng,
            title: `Destination: ${destinationPlace.name}`
          }
        });
      });
      googleOverlaysRef.current.markers.push(markerB);
    }

    // 3. Draw Flood Circles
    if (state.showFloodLayer) {
      state.floodZones.forEach((zone) => {
        const color = getRiskCircleColor(zone.riskLevel);
        const circle = new gmaps.Circle({
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.25,
          map: gMap,
          center: { lat: zone.center.lat, lng: zone.center.lng },
          radius: zone.radius,
        });
        googleOverlaysRef.current.circles.push(circle);
      });
    }

    // 4. Draw Road Closures
    if (state.showClosureLayer) {
      state.roadClosures.forEach((closure) => {
        const closureMarker = new gmaps.Marker({
          position: { lat: closure.location.lat, lng: closure.location.lng },
          map: gMap,
          title: `🚧 ${closure.road}: ${closure.description}`,
          label: { text: '!', color: 'white', fontWeight: 'bold' },
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: '#ea580c',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });
        googleOverlaysRef.current.markers.push(closureMarker);
      });
    }
  }, [useGoogleMaps, state.routeComparison, state.selectedRouteType, state.originPlace, state.destinationPlace, state.floodZones, state.roadClosures, state.showFloodLayer, state.showClosureLayer]);


  // ==================== 2. LEAFLET ENGINE (FALLBACK / DEFAULT) ====================
  useEffect(() => {
    if (useGoogleMaps) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      return;
    }

    if (!leafletContainerRef.current || leafletMapRef.current) return;

    const map = L.map(leafletContainerRef.current, {
      center: [22.7335, 88.5529],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    tileGroupRef.current.addTo(map);
    leafletLayersRef.current.routes.addTo(map);
    leafletLayersRef.current.markers.addTo(map);
    leafletLayersRef.current.flood.addTo(map);
    leafletLayersRef.current.closures.addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [useGoogleMaps]);

  // Leaflet Basemap Tiles
  useEffect(() => {
    if (useGoogleMaps) return;
    const map = leafletMapRef.current;
    if (!map) return;

    tileGroupRef.current.clearLayers();
    const style = state.preferences.mapStyle || 'dark';

    if (style === 'streets') {
      // 100% Free OpenStreetMap Standard Tiles (No API key, No watermarks)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(tileGroupRef.current);
    } else if (style === 'satellite') {
      // 100% Free Esri World Imagery (No API key, No watermarks)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
        maxZoom: 19,
      }).addTo(tileGroupRef.current);

      // 100% Free Esri Reference Boundaries & Transportation Labels (No CARTO, No API key, No watermarks)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Labels &copy; Esri',
        maxZoom: 19,
      }).addTo(tileGroupRef.current);
    } else {
      // 100% Free Dark Theme Navigation Tiles (No CARTO, No API key, No watermarks)
      // OpenStreetMap with high-contrast night styling class
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'map-tiles-dark',
      }).addTo(tileGroupRef.current);
    }
  }, [useGoogleMaps, state.preferences.mapStyle]);

  // Leaflet Routes & Markers
  useEffect(() => {
    if (useGoogleMaps) return;
    const map = leafletMapRef.current;
    if (!map) return;

    leafletLayersRef.current.routes.clearLayers();
    leafletLayersRef.current.markers.clearLayers();

    const { routeComparison, selectedRouteType, originPlace, destinationPlace } = state;

    if (!routeComparison) {
      if (originPlace) {
        const icon = createCustomIcon('#6366f1', 'A');
        L.marker([originPlace.location.lat, originPlace.location.lng], { icon })
          .bindPopup(`<div class="p-2"><strong class="text-white">${originPlace.name}</strong><br/><span class="text-gray-400 text-xs">Origin</span></div>`)
          .addTo(leafletLayersRef.current.markers);
      }
      if (destinationPlace) {
        const icon = createCustomIcon('#ef4444', 'B');
        L.marker([destinationPlace.location.lat, destinationPlace.location.lng], { icon })
          .bindPopup(`<div class="p-2"><strong class="text-white">${destinationPlace.name}</strong><br/><span class="text-gray-400 text-xs">Destination</span></div>`)
          .addTo(leafletLayersRef.current.markers);
      }
      return;
    }

    const routes = routeComparison.all.filter((r) => r.coordinates && r.coordinates.length > 0);

    // Draw background routes
    routes.forEach((route) => {
      if (route.id === selectedRouteType || route.type === selectedRouteType) return;
      L.polyline(route.coordinates, {
        color: route.color,
        weight: 4,
        opacity: 0.35,
        dashArray: '6 6',
      }).addTo(leafletLayersRef.current.routes);
    });

    // Draw selected route
    const selectedRoute = routes.find((r) => r.id === selectedRouteType || r.type === selectedRouteType);
    if (selectedRoute) {
      if (selectedRoute.segments && selectedRoute.segments.some(s => s.coordinates && s.coordinates.length > 0)) {
        selectedRoute.segments.forEach(segment => {
          if (!segment.coordinates || segment.coordinates.length === 0) return;
          const color = segment.trafficLevel === 'critical' ? '#ef4444'
                      : segment.trafficLevel === 'high' ? '#f97316'
                      : segment.trafficLevel === 'moderate' ? '#eab308'
                      : selectedRoute.color;

          const poly = L.polyline(segment.coordinates, {
            color,
            weight: 6,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(leafletLayersRef.current.routes);

          poly.on('click', (e) => {
            dispatch({
              type: 'SET_STREET_VIEW_LOCATION',
              payload: { lat: e.latlng.lat, lng: e.latlng.lng, title: `${segment.name} — Street View` }
            });
          });
        });
      } else {
        const poly = L.polyline(selectedRoute.coordinates, {
          color: selectedRoute.color,
          weight: 6,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(leafletLayersRef.current.routes);

        poly.on('click', (e) => {
          dispatch({
            type: 'SET_STREET_VIEW_LOCATION',
            payload: { lat: e.latlng.lat, lng: e.latlng.lng, title: 'Route Street View' }
          });
        });
      }

      if (selectedRoute.coordinates.length > 1) {
        map.fitBounds(L.latLngBounds(selectedRoute.coordinates), { padding: [50, 50] });
      }
    }

    // Origin Marker
    if (originPlace) {
      const icon = createCustomIcon('#6366f1', 'A');
      const m = L.marker([originPlace.location.lat, originPlace.location.lng], { icon })
        .bindPopup(`
          <div style="padding:8px">
            <strong style="color:white">${originPlace.name}</strong><br/>
            <span style="color:#9ca3af;font-size:11px">Origin Point</span>
          </div>
        `)
        .addTo(leafletLayersRef.current.markers);

      m.on('click', () => {
        dispatch({
          type: 'SET_STREET_VIEW_LOCATION',
          payload: { lat: originPlace.location.lat, lng: originPlace.location.lng, title: `Origin: ${originPlace.name}` }
        });
      });
    }

    // Destination Marker
    if (destinationPlace) {
      const icon = createCustomIcon('#ef4444', 'B');
      const m = L.marker([destinationPlace.location.lat, destinationPlace.location.lng], { icon })
        .bindPopup(`
          <div style="padding:8px">
            <strong style="color:white">${destinationPlace.name}</strong><br/>
            <span style="color:#9ca3af;font-size:11px">Destination Point</span>
          </div>
        `)
        .addTo(leafletLayersRef.current.markers);

      m.on('click', () => {
        dispatch({
          type: 'SET_STREET_VIEW_LOCATION',
          payload: { lat: destinationPlace.location.lat, lng: destinationPlace.location.lng, title: `Destination: ${destinationPlace.name}` }
        });
      });
    }
  }, [useGoogleMaps, state.routeComparison, state.selectedRouteType, state.originPlace, state.destinationPlace]);

  // Leaflet Flood & Closure Overlays
  useEffect(() => {
    if (useGoogleMaps) return;
    leafletLayersRef.current.flood.clearLayers();
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
      }).addTo(leafletLayersRef.current.flood);
    });
  }, [useGoogleMaps, state.floodZones, state.showFloodLayer]);

  useEffect(() => {
    if (useGoogleMaps) return;
    leafletLayersRef.current.closures.clearLayers();
    if (!state.showClosureLayer) return;

    state.roadClosures.forEach((closure) => {
      const icon = createHazardIcon('#ef4444', '🚧');
      L.marker([closure.location.lat, closure.location.lng], { icon }).addTo(leafletLayersRef.current.closures);
    });
  }, [useGoogleMaps, state.roadClosures, state.showClosureLayer]);

  // Leaflet map click listener
  useEffect(() => {
    if (useGoogleMaps) return;
    const map = leafletMapRef.current;
    if (!map) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      fetchLiveRoadInfo(e.latlng.lat, e.latlng.lng).then(info => {
        if (info) dispatch({ type: 'SET_SELECTED_ROAD', payload: info });
      });
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [useGoogleMaps, dispatch]);

  // Seconds counter for live freshness display
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastRefreshed.getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshed]);

  // Live layer refresh
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

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Engine and Freshness Status Header Bar */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2 pointer-events-auto">
        <div className="glass-card px-3 py-1.5 bg-surface-900/90 backdrop-blur-md shadow-xl border border-white/10 flex items-center gap-2 text-[11px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white">
            {useGoogleMaps ? 'Google Maps (Traffic Live)' : 'Leaflet + OpenStreetMap'}
          </span>
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

        {/* Traffic Layer Status Pill */}
        {state.showTrafficLayer && (
          <div className="glass-card px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Traffic Flow Active
          </div>
        )}
      </div>

      {/* Google Maps Key / Error Notification Banner */}
      {googleLoadFailed && (
        <div className="absolute top-4 left-4 z-[400] max-w-sm pointer-events-auto animate-slide-down">
          <div className="glass-card p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl shadow-2xl flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <strong className="text-white block font-semibold">Google Maps Key Notice</strong>
              <p className="text-[11px] text-amber-200/90 leading-tight">
                {googleLoadErrorMsg}
              </p>
              <p className="text-[10px] text-gray-400 pt-1">
                Active: OpenStreetMap & GloFAS river hydrological models.
              </p>
            </div>
            <button
              onClick={() => setGoogleLoadFailed(false)}
              className="text-amber-400 hover:text-white p-0.5 ml-auto text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Primary Map Containers */}
      {useGoogleMaps ? (
        <div
          ref={googleContainerRef}
          className="w-full h-full"
          id="google-map"
          role="application"
          aria-label="Google interactive route map with live traffic"
        />
      ) : (
        <div
          ref={leafletContainerRef}
          className="w-full h-full"
          id="leaflet-map"
          role="application"
          aria-label="OpenStreetMap interactive route map"
        />
      )}

      {/* 360° Street View Modal */}
      <StreetViewModal />
    </div>
  );
}
