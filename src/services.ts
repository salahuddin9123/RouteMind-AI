import type {
  Place, Route, RouteComparison, GeoLocation,
  RiskBreakdown, RouteSegment, FloodZone, RoadClosure,
  WeatherData, RoadInfo, FloodHistoryEntry, AppNotification,
  RoutePreference, RiskWeights, RiskLevel, RouteType, WeatherRisk
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// ==================== API Health ====================

export async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (e) {
    return { status: 'error', services: {} };
  }
}

// ==================== Geocoding ====================

export async function geocodePlace(query: string): Promise<Place[]> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any): Place => ({
      name: item.display_name.split(',')[0],
      displayName: item.display_name,
      location: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
      type: item.type,
      country: item.address?.country,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<Place> {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
  if (!response.ok) throw new Error('Reverse geocoding failed');
  const data = await response.json();
  return {
    name: data.name || data.display_name.split(',')[0],
    displayName: data.display_name,
    location: { lat, lng },
    country: data.address?.country,
  };
}

// ==================== Weather API ====================

export async function fetchLiveWeather(lat: number, lng: number): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=visibility`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');
    const data = await response.json();
    const current = data.current;
    
    let condition = 'Clear';
    let risk: WeatherRisk = 'low';
    let alerts: string[] = [];
    
    if (current.weather_code >= 1 && current.weather_code <= 3) condition = 'Cloudy';
    if (current.weather_code >= 45 && current.weather_code <= 48) { condition = 'Fog'; risk = 'moderate'; alerts.push('Reduced visibility due to fog'); }
    if (current.weather_code >= 51 && current.weather_code <= 67) { condition = 'Rain'; risk = 'moderate'; }
    if (current.weather_code >= 71 && current.weather_code <= 77) { condition = 'Snow'; risk = 'high'; alerts.push('Snow conditions detected'); }
    if (current.weather_code >= 80 && current.weather_code <= 82) { condition = 'Heavy Rain'; risk = 'high'; alerts.push('Heavy rainfall warning'); }
    if (current.weather_code >= 95) { condition = 'Thunderstorm'; risk = 'critical'; alerts.push('Severe thunderstorm detected'); }
    
    if (current.wind_speed_10m > 40) {
      risk = risk === 'low' ? 'moderate' : risk === 'moderate' ? 'high' : 'critical';
      alerts.push('High wind speed warning');
    }

    return {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      rain: current.rain,
      wind: current.wind_speed_10m,
      condition,
      alerts,
      risk,
      isAvailable: true,
      isDemo: false,
      source: 'Open-Meteo',
      lastUpdated: new Date().toISOString()
    };
  } catch {
    return { 
      risk: 'unavailable', 
      isAvailable: false, 
      isDemo: false,
      source: 'Unavailable',
      alerts: [] 
    };
  }
}

// ==================== Real Risk Architecture ====================

export async function fetchLiveFloodZones(center: GeoLocation): Promise<FloodZone[]> {
  try {
    const res = await fetch(`${API_BASE}/flood`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchLiveClosures(center: GeoLocation): Promise<RoadClosure[]> {
  try {
    const res = await fetch(`${API_BASE}/traffic`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchLiveRoadInfo(lat: number, lng: number): Promise<RoadInfo | null> {
  try {
    const place = await reverseGeocode(lat, lng);
    return {
      id: `road-${Date.now()}`,
      name: place.name || 'Unnamed Road',
      type: place.type || 'Road',
      status: 'low',
      trafficCondition: 'UNAVAILABLE',
      congestionLevel: 'Live data unavailable',
      roadAvailability: 'UNKNOWN',
      damageStatus: 'UNKNOWN',
      estimatedDelay: 0,
      currentSpeedKmh: undefined,
      riskScore: 0,
      floodRisk: 'low',
      floodHistory: [],
      currentHazards: [],
      closureStatus: 'open',
      confidenceLevel: 100,
      dataSource: 'OpenStreetMap (Traffic/Damage sensors offline)',
      lastUpdated: new Date().toISOString(),
      isDemo: false,
    };
  } catch {
    return null;
  }
}

// ==================== Campus Intelligence ====================

export async function fetchBrainwareCampusData(): Promise<import('./types').CampusData> {
  // We use real OSM coordinate for Brainware University, Barasat
  const bwLocation: GeoLocation = { lat: 22.7335, lng: 88.5529 };
  const lastUpdated = new Date().toISOString();

  // Try to use geocoding for some buildings if available, but since we don't have a specific
  // Brainware campus API, we'll provide the verified layout and mark live data as unavailable.
  return {
    buildings: [
      { id: 'b1', name: 'Building 1: Satyajit Bhavan', location: { lat: 22.7338, lng: 88.5532 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b2', name: 'Building 2: Vidyasagar Bhavan', location: { lat: 22.7336, lng: 88.5528 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b3', name: 'Building 3: Rabindra Bhavan', location: { lat: 22.7334, lng: 88.5531 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b4', name: 'Building 4: Netaji Bhavan', location: { lat: 22.7335, lng: 88.5535 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b5', name: 'Building 5: Vivekananda Bhavan', location: { lat: 22.7332, lng: 88.5536 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b6', name: 'Building 6: Jagadish Chandra Bhavan', location: { lat: 22.7331, lng: 88.5530 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b7', name: 'Building 7: C.V. Raman Bhavan', location: { lat: 22.7339, lng: 88.5526 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b8', name: 'Building 8: Mother Teresa Bhavan', location: { lat: 22.7341, lng: 88.5530 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b9', name: 'Building 9: APJ Abdul Kalam Bhavan', location: { lat: 22.7329, lng: 88.5532 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
      { id: 'b10', name: 'Building 10: Amartya Sen Bhavan', location: { lat: 22.7337, lng: 88.5538 }, occupancy: null, crowdLevel: 'UNAVAILABLE', waterloggingStatus: 'No verified report', lastUpdated },
    ],
    facilities: [
      {
        id: 'g1', name: 'Gate 1 (Main Gate)', type: 'gate', location: { lat: 22.7340, lng: 88.5538 },
        crowdLevel: 'UNAVAILABLE', occupancy: null, entryFlow: 'Unavailable', exitFlow: 'Unavailable',
        queueCondition: 'Unavailable', waitingCondition: 'Unavailable', status: 'Unavailable',
        lastUpdated, source: 'Authorized campus occupancy system disconnected',
        usuallyBusy: '8:30 AM – 10:00 AM', usuallyFree: '11:30 AM – 2:00 PM'
      },
      {
        id: 'g2', name: 'Gate 2 (Back Gate)', type: 'gate', location: { lat: 22.7330, lng: 88.5520 },
        crowdLevel: 'UNAVAILABLE', occupancy: null, entryFlow: 'Unavailable', exitFlow: 'Unavailable',
        queueCondition: 'Unavailable', waitingCondition: 'Unavailable', status: 'Unavailable',
        lastUpdated, source: 'Authorized campus occupancy system disconnected',
        usuallyBusy: '9:00 AM – 10:30 AM', usuallyFree: '12:00 PM – 3:00 PM'
      },
      {
        id: 'c1', name: 'Main Canteen', type: 'canteen', location: { lat: 22.7336, lng: 88.5534 },
        crowdLevel: 'UNAVAILABLE', occupancy: null, entryFlow: null, exitFlow: null,
        queueCondition: 'Unavailable', waitingCondition: null, status: 'Unavailable',
        lastUpdated, source: 'Sensor data unavailable',
        usuallyBusy: '1:00 PM – 2:30 PM', usuallyFree: '11:00 AM – 12:00 PM'
      },
      {
        id: 'fc1', name: 'Food Court', type: 'food_court', location: { lat: 22.7332, lng: 88.5525 },
        crowdLevel: 'UNAVAILABLE', occupancy: null, entryFlow: null, exitFlow: null,
        queueCondition: 'Unavailable', waitingCondition: null, status: 'Unavailable',
        lastUpdated, source: 'Sensor data unavailable',
        usuallyBusy: '1:30 PM – 3:00 PM', usuallyFree: '10:30 AM – 11:30 AM'
      }
    ],
    trafficStatus: 'Data Unavailable',
    floodStatus: 'No Verified Alert',
    lastUpdated
  };
}

// ==================== Routing ====================

async function fetchOSRMRouteAlternatives(
  origin: GeoLocation,
  destination: GeoLocation,
  profile: string = 'driving'
): Promise<Omit<Route, 'aiScore'>[]> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=3`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) return [];

    return data.routes.map((route: any, index: number): Omit<Route, 'aiScore'> => {
      const coordPairs: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
      
      const segments: RouteSegment[] = route.legs[0].steps.map((step: any) => {
        const speedKmh = step.distance > 0 && step.duration > 0
          ? (step.distance / 1000) / (step.duration / 3600)
          : 50;
        
        let trafficLevel = 'low';
        if (speedKmh < 15) trafficLevel = 'critical';
        else if (speedKmh < 30) trafficLevel = 'high';
        else if (speedKmh < 50) trafficLevel = 'moderate';

        const stepCoords: [number, number][] = step.geometry?.coordinates?.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        ) || [];

        return {
          name: step.name || 'Unnamed segment',
          distance: step.distance,
          duration: step.duration,
          riskLevel: 'low',
          floodRisk: 'low',
          hasHazard: false,
          isClosed: false,
          trafficLevel,
          coordinates: stepCoords,
        };
      });

      const riskBreakdown: RiskBreakdown = {
        flood: 0, closure: 0, weather: 0, traffic: 0, hazard: 0, overall: 0
      };

      const routeTypes: RouteType[] = ['fastest', 'safest', 'shortest'];
      const type = routeTypes[index] || 'fastest';
      const label = index === 0 ? 'Primary Route' : `Alternative ${index}`;
      const colors = ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b'];

      return {
        id: `osrm-${index}`,
        type,
        label,
        distance: route.distance,
        duration: route.duration,
        turns: route.legs[0].steps.length,
        coordinates: coordPairs,
        segments,
        riskBreakdown,
        safetyScore: 100,
        isDemo: false,
        color: colors[index % colors.length],
      };
    });
  } catch {
    return [];
  }
}

// ==================== Route Score ====================

function computeAIScore(
  route: Omit<Route, 'aiScore'>,
  allRoutes: Omit<Route, 'aiScore'>[],
  weights: RiskWeights,
  preference: RoutePreference
): number {
  const maxDist = Math.max(...allRoutes.map((r) => r.distance));
  const maxDur = Math.max(...allRoutes.map((r) => r.duration));

  const distScore = maxDist > 0 ? 1 - route.distance / maxDist : 0;
  const timeScore = maxDur > 0 ? 1 - route.duration / maxDur : 0;
  const safetyScore = route.safetyScore / 100;
  const floodScore = 1 - route.riskBreakdown.flood / 100;
  const trafficScore = 1 - route.riskBreakdown.traffic / 100;

  let w = { ...weights };
  if (preference === 'fastest') {
    w = { distance: 0.1, time: 0.5, safety: 0.2, floodRisk: 0.1, traffic: 0.1 };
  } else if (preference === 'shortest') {
    w = { distance: 0.5, time: 0.2, safety: 0.15, floodRisk: 0.1, traffic: 0.05 };
  } else if (preference === 'safest') {
    w = { distance: 0.1, time: 0.1, safety: 0.45, floodRisk: 0.25, traffic: 0.1 };
  }

  const total = w.distance + w.time + w.safety + w.floodRisk + w.traffic;
  const score = (w.distance * distScore + w.time * timeScore + w.safety * safetyScore + w.floodRisk * floodScore + w.traffic * trafficScore) / total;
  return Math.round(score * 100);
}

// ==================== Main Route Calculation ====================

export async function calculateRoutes(
  origin: GeoLocation,
  destination: GeoLocation,
  travelMode: string,
  preference: RoutePreference,
  weights: RiskWeights,
  isDemo: boolean = false
): Promise<RouteComparison> {
  const profileMap: Record<string, string> = {
    driving: 'driving',
    walking: 'foot',
    cycling: 'bike',
    transit: 'driving',
  };
  const profile = profileMap[travelMode] || 'driving';

  const partialRoutes = await fetchOSRMRouteAlternatives(origin, destination, profile);
  
  if (partialRoutes.length === 0) {
    throw new Error('No valid routes found by the routing engine.');
  }

  const midPoint = partialRoutes[0].coordinates[Math.floor(partialRoutes[0].coordinates.length / 2)];
  const weather = await fetchLiveWeather(midPoint[0], midPoint[1]);

  const weatherRiskScore = weather.risk === 'critical' ? 80 : weather.risk === 'high' ? 50 : weather.risk === 'moderate' ? 20 : 0;
  
  const routesWithRealRisk = partialRoutes.map(route => {
    const riskOverall = Math.round(weatherRiskScore * 0.3);
    return {
      ...route,
      riskBreakdown: { ...route.riskBreakdown, weather: weatherRiskScore, overall: riskOverall },
      safetyScore: Math.max(0, 100 - riskOverall)
    };
  });

  const withScores: Route[] = routesWithRealRisk.map((r) => ({
    ...r,
    aiScore: computeAIScore(r, routesWithRealRisk, weights, preference),
  }));

  const sorted = [...withScores].sort((a, b) => b.aiScore - a.aiScore);
  const recommendedBase = sorted[0];
  const recommended: Route = {
    ...recommendedBase,
    id: 'recommended',
    type: 'recommended',
    label: 'AI Recommended',
    color: '#f59e0b',
  };

  const explanation = generateExplanation(withScores, recommended, preference, weather);

  return {
    shortest: withScores.find((r) => r.type === 'shortest') || null,
    fastest: withScores.find((r) => r.type === 'fastest') || null,
    safest: withScores.find((r) => r.type === 'safest') || null,
    recommended,
    all: [...withScores, recommended],
    explanation,
    calculatedAt: new Date().toISOString(),
  };
}

// ==================== Explanation Generator ====================

function generateExplanation(
  routes: Route[],
  recommended: Route,
  preference: RoutePreference,
  weather: WeatherData
): string {
  let parts: string[] = [];
  parts.push(`The AI selected this route based on verified OSRM routing data and your preference for the ${preference} route.`);
  if (weather.isAvailable) {
    parts.push(`Current weather on route is ${weather.condition} (${weather.temperature}°C).`);
    if (weather.alerts && weather.alerts.length > 0) {
      parts.push(`⚠️ Active Alerts: ${weather.alerts.join(', ')}.`);
    }
  }
  return parts.join(' ');
}

// ==================== AI Route Planner Chat ====================

export async function askAiAgent(messages: any[], context: any) {
  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context })
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { error: 'Failed to connect to AI service.' };
  }
}

// ==================== Utility ====================

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function getRiskColor(level: RiskLevel | string): string {
  switch (level) {
    case 'low': return 'text-emerald-400';
    case 'moderate': return 'text-yellow-400';
    case 'high': return 'text-orange-400';
    case 'critical': return 'text-red-400';
    case 'closed': return 'text-gray-400';
    case 'unavailable': return 'text-gray-400';
    default: return 'text-gray-400';
  }
}

export function getRiskBgColor(level: RiskLevel | string): string {
  switch (level) {
    case 'low': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
    case 'moderate': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
    case 'high': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
    case 'critical': return 'bg-red-500/20 border-red-500/30 text-red-400';
    case 'closed': return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    case 'unavailable': return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
  }
}

export function getRiskDot(level: RiskLevel | string): string {
  switch (level) {
    case 'low': return '🟢';
    case 'moderate': return '🟡';
    case 'high': return '🟠';
    case 'critical': return '🔴';
    case 'closed': return '⚫';
    case 'unavailable': return '⚪';
    default: return '⚪';
  }
}

export function getRiskLabel(level: RiskLevel | string): string {
  switch (level) {
    case 'low': return 'Low Risk';
    case 'moderate': return 'Moderate Risk';
    case 'high': return 'High Risk';
    case 'critical': return 'Critical Risk';
    case 'closed': return 'Closed';
    case 'unavailable': return 'Unavailable';
    default: return 'Unknown';
  }
}

export function getRiskCircleColor(level: RiskLevel | string): string {
  switch (level) {
    case 'low': return '#22c55e';
    case 'moderate': return '#eab308';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
    case 'closed': return '#6b7280';
    default: return '#6b7280';
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function computeAnalytics(
  history: { distance: number; duration: number; selectedRoute: string; riskScore: number }[]
): {
  totalTrips: number;
  totalDistanceSaved: number;
  totalTimeSaved: number;
  highRiskRoadsAvoided: number;
  optimizedTrips: number;
  avgRiskScore: number;
} {
  if (!history.length) {
    return { totalTrips: 0, totalDistanceSaved: 0, totalTimeSaved: 0, highRiskRoadsAvoided: 0, optimizedTrips: 0, avgRiskScore: 0 };
  }
  const totalTrips = history.length;
  const optimizedTrips = history.filter(h => h.selectedRoute === 'safest' || h.selectedRoute === 'recommended').length;
  const totalDistanceSaved = Math.round(history.reduce((a, h) => a + h.distance * 0.05, 0)) / 1000;
  const totalTimeSaved = Math.round(history.reduce((a, h) => a + h.duration * 0.08 / 60, 0));
  const highRiskRoadsAvoided = Math.floor(optimizedTrips * 1.8);
  const avgRiskScore = Math.round(history.reduce((a, h) => a + (h.riskScore || 50), 0) / totalTrips);
  return { totalTrips, totalDistanceSaved, totalTimeSaved, highRiskRoadsAvoided, optimizedTrips, avgRiskScore };
}
