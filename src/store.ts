import type {
  AppState, RoutePreference, TravelMode, PageId, RouteType,
  SavedRoute, RouteHistoryEntry, UserPreferences, ApiConfig,
  RiskWeights, WhatIfScenario, WhatIfResult, Place,
  RouteComparison, WeatherData, FloodZone, RoadClosure,
  RoadInfo, AppNotification, AiMessage, CampusData
} from './types';

// ==================== Action Types ====================

type Action =
  | { type: 'SET_PAGE'; payload: PageId }
  | { type: 'SET_NAVIGATION_MODE'; payload: boolean }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ORIGIN_INPUT'; payload: string }
  | { type: 'SET_DESTINATION_INPUT'; payload: string }
  | { type: 'SET_ORIGIN_PLACE'; payload: Place | null }
  | { type: 'SET_DESTINATION_PLACE'; payload: Place | null }
  | { type: 'SET_SEARCHED_PLACE'; payload: Place | null }
  | { type: 'SET_TRAVEL_MODE'; payload: TravelMode }
  | { type: 'SET_ROUTE_COMPARISON'; payload: RouteComparison | null }
  | { type: 'SET_SELECTED_ROUTE'; payload: RouteType }
  | { type: 'SET_ROUTE_PREFERENCE'; payload: RoutePreference }
  | { type: 'SET_RISK_WEIGHTS'; payload: RiskWeights }
  | { type: 'SET_FLOOD_ZONES'; payload: FloodZone[] }
  | { type: 'SET_ROAD_CLOSURES'; payload: RoadClosure[] }
  | { type: 'SET_WEATHER_DATA'; payload: WeatherData | null }
  | { type: 'SET_SELECTED_ROAD'; payload: RoadInfo | null }
  | { type: 'SET_CAMPUS_DATA'; payload: CampusData | null }
  | { type: 'ADD_SAVED_ROUTE'; payload: SavedRoute }
  | { type: 'REMOVE_SAVED_ROUTE'; payload: string }
  | { type: 'UPDATE_SAVED_ROUTE'; payload: SavedRoute }
  | { type: 'ADD_HISTORY_ENTRY'; payload: RouteHistoryEntry }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean }
  | { type: 'TOGGLE_FLOOD_LAYER' }
  | { type: 'TOGGLE_CLOSURE_LAYER' }
  | { type: 'TOGGLE_WEATHER_MARKERS' }
  | { type: 'TOGGLE_TRAFFIC_LAYER' }
  | { type: 'TOGGLE_DAMAGE_LAYER' }
  | { type: 'TOGGLE_INCIDENTS_LAYER' }
  | { type: 'SET_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_API_CONFIG'; payload: Partial<ApiConfig> }
  | { type: 'ADD_AI_MESSAGE'; payload: AiMessage }
  | { type: 'CLEAR_AI_MESSAGES' }
  | { type: 'SET_WHATIF_SCENARIO'; payload: WhatIfScenario | null }
  | { type: 'SET_WHATIF_RESULT'; payload: WhatIfResult | null }
  | { type: 'SET_DEMO_MODE'; payload: boolean }
  | { type: 'SET_STREET_VIEW_LOCATION'; payload: { lat: number; lng: number; heading?: number; pitch?: number; title?: string } | null }
  | { type: 'SET_MAP_ENGINE'; payload: 'google' | 'leaflet' }
  | { type: 'LOAD_PERSISTED_DATA'; payload: Partial<AppState> };

// ==================== Default State ====================

const defaultPreferences: UserPreferences = {
  travelMode: 'driving',
  routePreference: 'balanced',
  avoidTolls: false,
  avoidHighways: false,
  avoidHighFloodRisk: true,
  avoidReportedClosures: true,
  maxAcceptableRisk: 70,
  riskWeights: {
    distance: 0.2,
    time: 0.25,
    safety: 0.35,
    floodRisk: 0.15,
    traffic: 0.05,
  },
  theme: 'dark',
  mapStyle: 'default',
  showFloodLayer: true,
  showClosureLayer: true,
  showWeatherMarkers: true,
};

const googleKeyFromEnv = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

const defaultApiConfig: ApiConfig = {
  mapProvider: googleKeyFromEnv ? 'google' : 'openstreetmap',
  geocodingProvider: 'nominatim',
  routingProvider: googleKeyFromEnv ? 'google_directions' : 'osrm',
  weatherApiKey: '',
  floodApiEndpoint: '',
  closureApiEndpoint: '',
  googleMapsApiKey: googleKeyFromEnv,
};

export const defaultState: AppState = {
  activePage: 'dashboard',
  isLoading: false,
  loadingMessage: '',
  demoMode: false,

  originInput: '',
  destinationInput: '',
  originPlace: null,
  destinationPlace: null,
  searchedPlace: null,
  travelMode: 'driving',

  routeComparison: null,
  selectedRouteType: 'recommended',
  routePreference: 'balanced',
  riskWeights: defaultPreferences.riskWeights,

  floodZones: [],
  roadClosures: [],
  weatherData: null,
  selectedRoadInfo: null,
  campusData: null,

  savedRoutes: [],
  routeHistory: [],
  notifications: [],

  sidebarOpen: false,
  showFloodLayer: true,
  showClosureLayer: true,
  showWeatherMarkers: true,
  showTrafficLayer: true,
  showDamageLayer: true,
  showIncidentsLayer: true,

  streetViewLocation: null,
  mapEngine: googleKeyFromEnv ? 'google' : 'leaflet',

  preferences: defaultPreferences,
  apiConfig: defaultApiConfig,

  aiMessages: [],

  whatIfScenario: null,
  whatIfResult: null,

  error: null,
  navigationMode: false,
};

// ==================== Reducer ====================

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DEMO_MODE':
      return { ...state, demoMode: action.payload };
    case 'SET_PAGE':
      return { ...state, activePage: action.payload, error: null };
    case 'SET_NAVIGATION_MODE':
      return { ...state, navigationMode: action.payload };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || '',
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_ORIGIN_INPUT':
      return { ...state, originInput: action.payload };
    case 'SET_DESTINATION_INPUT':
      return { ...state, destinationInput: action.payload };
    case 'SET_ORIGIN_PLACE':
      return { ...state, originPlace: action.payload };
    case 'SET_DESTINATION_PLACE':
      return { ...state, destinationPlace: action.payload };
    case 'SET_SEARCHED_PLACE':
      return { ...state, searchedPlace: action.payload };
    case 'SET_TRAVEL_MODE':
      return { ...state, travelMode: action.payload };
    case 'SET_ROUTE_COMPARISON':
      return { ...state, routeComparison: action.payload };
    case 'SET_SELECTED_ROUTE':
      return { ...state, selectedRouteType: action.payload };
    case 'SET_ROUTE_PREFERENCE':
      return { ...state, routePreference: action.payload };
    case 'SET_RISK_WEIGHTS':
      return { ...state, riskWeights: action.payload };
    case 'SET_FLOOD_ZONES':
      return { ...state, floodZones: action.payload };
    case 'SET_ROAD_CLOSURES':
      return { ...state, roadClosures: action.payload };
    case 'SET_WEATHER_DATA':
      return { ...state, weatherData: action.payload };
    case 'SET_SELECTED_ROAD':
      return { ...state, selectedRoadInfo: action.payload };
    case 'SET_CAMPUS_DATA':
      return { ...state, campusData: action.payload };
    case 'ADD_SAVED_ROUTE': {
      const updated = [action.payload, ...state.savedRoutes];
      persistData('savedRoutes', updated);
      return { ...state, savedRoutes: updated };
    }
    case 'REMOVE_SAVED_ROUTE': {
      const updated = state.savedRoutes.filter((r) => r.id !== action.payload);
      persistData('savedRoutes', updated);
      return { ...state, savedRoutes: updated };
    }
    case 'UPDATE_SAVED_ROUTE': {
      const updated = state.savedRoutes.map((r) =>
        r.id === action.payload.id ? action.payload : r
      );
      persistData('savedRoutes', updated);
      return { ...state, savedRoutes: updated };
    }
    case 'ADD_HISTORY_ENTRY': {
      const updated = [action.payload, ...state.routeHistory].slice(0, 100);
      persistData('routeHistory', updated);
      return { ...state, routeHistory: updated };
    }
    case 'CLEAR_HISTORY': {
      persistData('routeHistory', []);
      return { ...state, routeHistory: [] };
    }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50),
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'TOGGLE_FLOOD_LAYER':
      return { ...state, showFloodLayer: !state.showFloodLayer };
    case 'TOGGLE_CLOSURE_LAYER':
      return { ...state, showClosureLayer: !state.showClosureLayer };
    case 'TOGGLE_WEATHER_MARKERS':
      return { ...state, showWeatherMarkers: !state.showWeatherMarkers };
    case 'TOGGLE_TRAFFIC_LAYER':
      return { ...state, showTrafficLayer: !state.showTrafficLayer };
    case 'TOGGLE_DAMAGE_LAYER':
      return { ...state, showDamageLayer: !state.showDamageLayer };
    case 'TOGGLE_INCIDENTS_LAYER':
      return { ...state, showIncidentsLayer: !state.showIncidentsLayer };
    case 'SET_PREFERENCES': {
      const updated = { ...state.preferences, ...action.payload };
      persistData('preferences', updated);
      return { ...state, preferences: updated };
    }
    case 'SET_API_CONFIG': {
      const updated = { ...state.apiConfig, ...action.payload };
      return { ...state, apiConfig: updated };
    }
    case 'ADD_AI_MESSAGE':
      return { ...state, aiMessages: [...state.aiMessages, action.payload] };
    case 'CLEAR_AI_MESSAGES':
      return { ...state, aiMessages: [] };
    case 'SET_WHATIF_SCENARIO':
      return { ...state, whatIfScenario: action.payload };
    case 'SET_WHATIF_RESULT':
      return { ...state, whatIfResult: action.payload };
    case 'SET_STREET_VIEW_LOCATION':
      return { ...state, streetViewLocation: action.payload };
    case 'SET_MAP_ENGINE':
      return { ...state, mapEngine: action.payload };
    case 'LOAD_PERSISTED_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ==================== Persistence Helpers ====================

function persistData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`routemind_${key}`, JSON.stringify(data));
  } catch {
    // Storage unavailable
  }
}

export function loadPersistedData(): Partial<AppState> {
  const result: Partial<AppState> = {};
  try {
    const savedRoutes = localStorage.getItem('routemind_savedRoutes');
    if (savedRoutes) result.savedRoutes = JSON.parse(savedRoutes);

    const routeHistory = localStorage.getItem('routemind_routeHistory');
    if (routeHistory) result.routeHistory = JSON.parse(routeHistory);

    const preferences = localStorage.getItem('routemind_preferences');
    if (preferences) result.preferences = { ...defaultPreferences, ...JSON.parse(preferences) };
  } catch {
    // Ignore parse errors
  }
  return result;
}
