// ==================== Core Types ====================

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical' | 'closed';

export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';

export type RouteType = 'shortest' | 'fastest' | 'safest' | 'recommended';

export type RoutePreference = 'fastest' | 'shortest' | 'safest' | 'balanced';

export type PageId =
  | 'dashboard'
  | 'planner'
  | 'map'
  | 'road-intelligence'
  | 'flood-risk'
  | 'weather'
  | 'saved-routes'
  | 'history'
  | 'analytics'
  | 'settings'
  | 'campus';

// ==================== Location ====================

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Place {
  name: string;
  displayName: string;
  location: GeoLocation;
  type?: string;
  country?: string;
}

// ==================== Route ====================

export interface RouteSegment {
  name: string;
  distance: number; // meters
  duration: number; // seconds
  riskLevel: RiskLevel;
  floodRisk: RiskLevel;
  hasHazard: boolean;
  isClosed: boolean;
  trafficLevel?: string;
  coordinates?: [number, number][];
}

export interface RiskBreakdown {
  flood: number;      // 0-100
  closure: number;    // 0-100
  weather: number;    // 0-100
  traffic: number;    // 0-100
  hazard: number;     // 0-100
  overall: number;    // 0-100
}

export interface Route {
  id: string;
  type: RouteType;
  label: string;
  distance: number;       // meters
  duration: number;       // seconds
  turns: number;
  coordinates: [number, number][];
  segments: RouteSegment[];
  riskBreakdown: RiskBreakdown;
  safetyScore: number;    // 0-100
  trafficStatus?: string;
  isDemo: boolean;
  color: string;
  aiScore: number;        // Computed ranking score
}

export interface RouteTelemetry {
  travelMode: TravelMode;
  preference: RoutePreference;
  backendEndpoint: string;
  apiDurationMs?: number;
  alternativesFound: number;
  calculatedAt: string;
}

export interface RouteComparison {
  shortest: Route | null;
  fastest: Route | null;
  safest: Route | null;
  recommended: Route | null;
  all: Route[];
  explanation: string;
  calculatedAt: string;
  telemetry?: RouteTelemetry;
}

// ==================== Risk Weights ====================

export interface RiskWeights {
  distance: number;   // 0-1
  time: number;       // 0-1
  safety: number;     // 0-1
  floodRisk: number;  // 0-1
  traffic: number;    // 0-1
}

// ==================== Flood Risk ====================

export interface FloodZone {
  id: string;
  name: string;
  center: GeoLocation;
  radius: number; // meters
  riskLevel: RiskLevel;
  lastUpdated: string;
  source: string;
  isDemo: boolean;
  description: string;
}

// ==================== Road Closure ====================

export type ClosureReason = 'flooding' | 'construction' | 'accident' | 'maintenance' | 'other';

export interface RoadClosure {
  id: string;
  road: string;
  reason: ClosureReason;
  status: 'active' | 'partial' | 'expected';
  location: GeoLocation;
  description: string;
  expectedReopening?: string;
  lastUpdated: string;
  source: string;
  isDemo: boolean;
}

// ==================== Weather ====================

export type WeatherRisk = 'low' | 'moderate' | 'high' | 'critical' | 'unavailable';

export interface WeatherData {
  temperature?: number;
  feelsLike?: number;
  rain?: number;
  rainProbability?: number;
  wind?: number;
  visibility?: number;
  condition?: string;
  alerts?: string[];
  risk: WeatherRisk;
  isAvailable: boolean;
  isDemo: boolean;
  source?: string;
  lastUpdated?: string;
}

// ==================== Road Intelligence ====================

export interface RoadInfo {
  id: string;
  name: string;
  type: string;
  status: RiskLevel;
  trafficCondition: 'FREE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'SEVERE' | 'CLOSED' | 'UNAVAILABLE';
  congestionLevel: string;
  roadAvailability: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'UNKNOWN';
  damageStatus: 'GOOD' | 'MINOR DAMAGE' | 'DAMAGED' | 'SEVERE DAMAGE' | 'UNDER CONSTRUCTION' | 'CLOSED' | 'UNKNOWN';
  estimatedDelay: number; // minutes
  surface?: string;
  speedLimit?: number;
  currentSpeedKmh?: number;
  riskScore: number;
  floodRisk: RiskLevel;
  floodHistory: FloodHistoryEntry[];
  currentHazards: string[];
  closureStatus: 'open' | 'partial' | 'closed';
  confidenceLevel: number; // 0-100
  dataSource: string;
  lastUpdated: string;
  isDemo: boolean;
}

export interface FloodHistoryEntry {
  period: string;
  level: RiskLevel;
  isDemo: boolean;
}

// ==================== Saved Route ====================

export interface SavedRoute {
  id: string;
  name: string;
  origin: Place;
  destination: Place;
  travelMode: TravelMode;
  preference: RoutePreference;
  savedAt: string;
  lastRecalculated?: string;
  riskSnapshot?: RiskBreakdown;
  notes?: string;
}

// ==================== Route History ====================

export interface RouteHistoryEntry {
  id: string;
  origin: Place;
  destination: Place;
  date: string;
  distance: number;
  duration: number;
  selectedRoute: RouteType;
  preference: RoutePreference;
  riskScore: number;
  travelMode: TravelMode;
}

// ==================== Campus Intelligence ====================

export type CrowdLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'UNAVAILABLE';

export interface CampusFacility {
  id: string;
  name: string;
  type: 'gate' | 'canteen' | 'food_court' | 'parking';
  location: GeoLocation;
  crowdLevel: CrowdLevel;
  occupancy: number | null;
  entryFlow: string | null;
  exitFlow: string | null;
  queueCondition: string | null;
  waitingCondition: string | null;
  status: 'Busy' | 'Normal' | 'Free' | 'Closed' | 'Unavailable';
  lastUpdated: string;
  source: string;
  usuallyBusy: string;
  usuallyFree: string;
}

export interface CampusBuilding {
  id: string;
  name: string;
  location: GeoLocation;
  occupancy: number | null;
  crowdLevel: CrowdLevel;
  waterloggingStatus: string;
  lastUpdated: string;
}

export interface CampusData {
  buildings: CampusBuilding[];
  facilities: CampusFacility[];
  trafficStatus: string;
  floodStatus: string;
  lastUpdated: string;
  isEstimated?: boolean;
  telemetrySource?: string;
  liveSensorsActive?: number;
}

// ==================== Analytics ====================

export interface AnalyticsData {
  totalTrips: number;
  totalDistanceSaved: number;    // km
  totalTimeSaved: number;        // minutes
  highRiskRoadsAvoided: number;
  optimizedTrips: number;
  avgRiskScore: number;
  routeTypeBreakdown: Record<RouteType, number>;
  preferenceBreakdown: Record<RoutePreference, number>;
}

// ==================== Data Source ====================

export type DataSourceStatus = 'connected' | 'disconnected' | 'degraded' | 'demo';

export interface DataSource {
  id: string;
  name: string;
  dataType: string;
  status: DataSourceStatus;
  coverage?: string;
  lastUpdated?: string;
  provider?: string;
  description: string;
}

// ==================== Notification ====================

export type NotificationSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: string;
  isRead: boolean;
  isDemo: boolean;
  routeId?: string;
}

// ==================== App Settings ====================

export interface ApiConfig {
  mapProvider: string;
  geocodingProvider: string;
  routingProvider: string;
  weatherApiKey: string;
  floodApiEndpoint: string;
  closureApiEndpoint: string;
  googleMapsApiKey: string;
}

export interface UserPreferences {
  travelMode: TravelMode;
  routePreference: RoutePreference;
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidHighFloodRisk: boolean;
  avoidReportedClosures: boolean;
  maxAcceptableRisk: number;
  riskWeights: RiskWeights;
  theme: 'dark' | 'light';
  mapStyle: string;
  showFloodLayer: boolean;
  showClosureLayer: boolean;
  showWeatherMarkers: boolean;
}

// ==================== App State ====================

export interface AppState {
  activePage: PageId;
  isLoading: boolean;
  loadingMessage: string;
  demoMode: boolean;
  
  // Search
  originInput: string;
  destinationInput: string;
  originPlace: Place | null;
  destinationPlace: Place | null;
  searchedPlace: Place | null;
  travelMode: TravelMode;
  
  // Routes
  routeComparison: RouteComparison | null;
  selectedRouteType: RouteType;
  routePreference: RoutePreference;
  riskWeights: RiskWeights;
  
  // Data
  floodZones: FloodZone[];
  roadClosures: RoadClosure[];
  weatherData: WeatherData | null;
  selectedRoadInfo: RoadInfo | null;
  campusData: CampusData | null;
  
  // User data
  savedRoutes: SavedRoute[];
  routeHistory: RouteHistoryEntry[];
  notifications: AppNotification[];
  
  // UI
  sidebarOpen: boolean;
  showFloodLayer: boolean;
  showClosureLayer: boolean;
  showWeatherMarkers: boolean;
  showTrafficLayer: boolean;
  showDamageLayer: boolean;
  showIncidentsLayer: boolean;
  
  // Street View & Engine
  streetViewLocation: { lat: number; lng: number; heading?: number; pitch?: number; title?: string } | null;
  mapEngine: 'google' | 'leaflet';
  
  // Preferences
  preferences: UserPreferences;
  apiConfig: ApiConfig;
  
  // AI
  aiMessages: AiMessage[];
  
  // What-If
  whatIfScenario: WhatIfScenario | null;
  whatIfResult: WhatIfResult | null;
  
  // Error
  error: string | null;
  navigationMode: boolean;
}

// ==================== AI ====================

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ==================== What-If ====================

export type WhatIfCondition =
  | 'avoid_road'
  | 'avoid_high_risk'
  | 'avoid_tolls'
  | 'avoid_highways'
  | 'heavy_rain'
  | 'road_closure'
  | 'increased_traffic'
  | 'change_mode';

export interface WhatIfScenario {
  condition: WhatIfCondition;
  label: string;
  value?: string;
}

export interface WhatIfResult {
  original: { distance: number; duration: number; riskScore: number };
  alternative: { distance: number; duration: number; riskScore: number };
  difference: { distance: number; duration: number; riskScore: number };
  explanation: string;
  isDemo: boolean;
}
