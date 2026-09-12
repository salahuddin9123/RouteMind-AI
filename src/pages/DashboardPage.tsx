import React, { useState } from 'react';
import {
  Navigation, Layers, Droplets, X, Eye, EyeOff,
  Sliders, BarChart3, ChevronRight
} from 'lucide-react';
import { useApp } from '../context';
import { SearchPanel } from '../components/SearchPanel';
import { RouteCards } from '../components/RouteCards';
import { MapView } from '../components/MapView';
import { MapControls } from '../components/MapControls';
import { RiskWeightPanel } from '../components/RiskWeightPanel';
import { WhatIfPanel } from '../components/WhatIfPanel';
import { SaveRouteModal } from '../components/SaveRouteModal';
import {
  calculateRoutes, fetchLiveFloodZones, fetchLiveClosures,
  fetchLiveWeather, generateId,
  getRiskDot, getRiskLabel, getRiskBgColor
} from '../services';

export function DashboardPage() {
  const { state, dispatch } = useApp();
  const [showWeights, setShowWeights] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanRoute = async () => {
    if (!state.originPlace || !state.destinationPlace) return;

    setIsLoading(true);
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true, message: 'Calculating routes...' } });

      const comparison = await calculateRoutes(
        state.originPlace.location,
        state.destinationPlace.location,
        state.travelMode,
        state.routePreference,
        state.riskWeights,
        state.demoMode
      );

      dispatch({ type: 'SET_ROUTE_COMPARISON', payload: comparison });
      dispatch({ type: 'SET_SELECTED_ROUTE', payload: 'recommended' });

      dispatch({ type: 'SET_LOADING', payload: { isLoading: true, message: 'Analyzing road risks...' } });
      await delay(300);

      // Load demo flood/closure data centered on midpoint
      const midLat = (state.originPlace.location.lat + state.destinationPlace.location.lat) / 2;
      const midLng = (state.originPlace.location.lng + state.destinationPlace.location.lng) / 2;

      if (!state.demoMode) {
        const floodZones = await fetchLiveFloodZones({ lat: midLat, lng: midLng });
        const closures = await fetchLiveClosures({ lat: midLat, lng: midLng });
        const weather = await fetchLiveWeather(midLat, midLng);
        
        dispatch({ type: 'SET_FLOOD_ZONES', payload: floodZones });
        dispatch({ type: 'SET_ROAD_CLOSURES', payload: closures });
        dispatch({ type: 'SET_WEATHER_DATA', payload: weather });

        if (weather.alerts && weather.alerts.length > 0) {
          weather.alerts.forEach((alert) => {
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: generateId(),
                title: 'Live Weather Alert',
                message: alert,
                severity: weather.risk === 'critical' ? 'danger' : 'warning',
                timestamp: new Date().toISOString(),
                isRead: false,
                isDemo: false,
              }
            });
          });
        }
      }

      dispatch({ type: 'SET_LOADING', payload: { isLoading: true, message: 'Generating AI recommendation...' } });
      await delay(200);

      // Add to history
      const recommended = comparison.recommended;
      if (recommended) {
        dispatch({
          type: 'ADD_HISTORY_ENTRY',
          payload: {
            id: generateId(),
            origin: state.originPlace,
            destination: state.destinationPlace,
            date: new Date().toISOString(),
            distance: recommended.distance,
            duration: recommended.duration,
            selectedRoute: 'recommended',
            preference: state.routePreference,
            riskScore: recommended.riskBreakdown.overall,
            travelMode: state.travelMode,
          },
        });
      }

      // Demo notifications removed as per live data requirements
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Route calculation failed. Please check the location names and try again.',
      });
    } finally {
      setIsLoading(false);
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  };

  const hasRoute = !!state.routeComparison;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-full lg:w-[420px] flex flex-col h-full bg-surface-800/50 border-r border-white/5 overflow-hidden shrink-0">
        <div className="flex-1 overflow-y-auto scroll-area p-4 space-y-4">
          {/* Search */}
          <SearchPanel onPlanRoute={handlePlanRoute} isLoading={isLoading} />

          {/* Route cards */}
          {hasRoute && <RouteCards />}

          {/* Risk weights */}
          {hasRoute && (
            <div>
              <button
                onClick={() => setShowWeights(!showWeights)}
                className="w-full flex items-center justify-between p-3 glass-card-hover"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Sliders size={14} className="text-brand-400" />
                  AI Route Weights
                </div>
                <ChevronRight size={14} className={`text-gray-500 transition-transform ${showWeights ? 'rotate-90' : ''}`} />
              </button>
              {showWeights && (
                <div className="mt-2 animate-fade-in">
                  <RiskWeightPanel />
                </div>
              )}
            </div>
          )}

          {/* What-If */}
          {hasRoute && (
            <div>
              <button
                onClick={() => setShowWhatIf(!showWhatIf)}
                className="w-full flex items-center justify-between p-3 glass-card-hover"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <BarChart3 size={14} className="text-purple-400" />
                  What-If Analysis
                </div>
                <ChevronRight size={14} className={`text-gray-500 transition-transform ${showWhatIf ? 'rotate-90' : ''}`} />
              </button>
              {showWhatIf && (
                <div className="mt-2 animate-fade-in">
                  <WhatIfPanel />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {hasRoute && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  dispatch({ type: 'SET_NAVIGATION_MODE', payload: true });
                  dispatch({ type: 'SET_PAGE', payload: 'map' });
                }}
                className="flex-1 btn-primary justify-center text-sm"
              >
                <Navigation size={14} />
                Start Navigation
              </button>
              <button
                onClick={() => setShowSave(true)}
                className="flex-1 btn-secondary justify-center text-sm"
              >
                Save Route
              </button>
            </div>
          )}

          {/* Empty state */}
          {!hasRoute && (
            <div className="glass-card p-6 text-center mt-4">
              <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center mx-auto mb-3">
                <Navigation size={22} className="text-brand-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Ready to plan your route</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Enter an origin and destination to compare shortest, fastest, and safest route options with AI-powered risk analysis.
              </p>
              <p className="text-[10px] text-gray-600 mt-3">
                "The shortest route isn't always the safest route."
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <MapView />
        <MapControls />

        {/* Road info panel overlay */}
        {state.selectedRoadInfo && (
          <div className="absolute bottom-4 left-4 w-72 glass-card p-4 shadow-2xl animate-slide-up max-h-72 overflow-y-auto scroll-area">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Road Information</h3>
              <button
                onClick={() => dispatch({ type: 'SET_SELECTED_ROAD', payload: null })}
                className="btn-ghost p-1"
              >
                <X size={14} />
              </button>
            </div>
            <RoadInfoPanel />
          </div>
        )}

        {/* Demo banner */}
        {state.demoMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-full backdrop-blur-sm shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Demo Data — Not Live</span>
            </div>
          </div>
        )}
      </div>

      {/* Save modal */}
      {showSave && <SaveRouteModal onClose={() => setShowSave(false)} />}
    </div>
  );
}

function RoadInfoPanel() {
  const { state } = useApp();
  const info = state.selectedRoadInfo;
  if (!info) return null;



  return (
    <div className="space-y-3">
      {info.isDemo && (
        <div className="demo-badge inline-flex">Demo Data</div>
      )}
      <div>
        <p className="text-xs text-gray-400">Road Name</p>
        <p className="text-sm font-semibold text-white">{info.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-400">Type</p>
          <p className="text-sm text-white">{info.type}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Surface</p>
          <p className="text-sm text-white">{info.surface || 'Unknown'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-1">Traffic</p>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${info.trafficCondition === 'UNAVAILABLE' ? 'text-gray-500' : 'text-white'}`}>
             {info.trafficCondition}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${info.roadAvailability === 'OPEN' ? 'text-emerald-400' : 'text-orange-400'}`}>
             {info.roadAvailability}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-1">Damage</p>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${info.damageStatus === 'UNKNOWN' ? 'text-gray-500' : 'text-white'}`}>
             {info.damageStatus}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Flood Risk</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${getRiskBgColor(info.floodRisk)}`}>
            {getRiskDot(info.floodRisk)} {getRiskLabel(info.floodRisk)}
          </span>
        </div>
      </div>
      {info.currentHazards.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Reported Hazards</p>
          {info.currentHazards.map((h, i) => (
            <p key={i} className="text-xs text-orange-300">• {h}</p>
          ))}
        </div>
      )}
      <div>
        <p className="text-xs text-gray-400">Confidence Level</p>
        <p className="text-sm text-white">{info.confidenceLevel}%</p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Data Source</p>
        <p className="text-xs text-gray-500">{info.dataSource}</p>
      </div>
      <p className="text-[10px] text-gray-600">
        Updated: {new Date(info.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
