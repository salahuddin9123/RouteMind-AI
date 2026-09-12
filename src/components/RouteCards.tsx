import React from 'react';
import {
  Clock, MapPin, TrendingUp, Shield, Zap, Navigation,
  CheckCircle, AlertTriangle, Info, Eye
} from 'lucide-react';
import { useApp } from '../context';
import { formatDistance, formatDuration, getRiskBgColor } from '../services';
import type { Route, RouteType } from '../types';

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onSelect: () => void;
}

function SafetyBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-yellow-500' :
    score >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${
        score >= 80 ? 'text-emerald-400' :
        score >= 60 ? 'text-yellow-400' :
        score >= 40 ? 'text-orange-400' : 'text-red-400'
      }`}>{score}</span>
    </div>
  );
}

function RiskPill({ label, score }: { label: string; score: number }) {
  const level = score < 25 ? 'low' : score < 50 ? 'moderate' : score < 75 ? 'high' : 'critical';
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getRiskBgColor(level)}`}>
      {label}: {score}
    </div>
  );
}

export function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
  const { dispatch } = useApp();
  const typeConfig: Record<RouteType, { label: string; color: string; icon: React.ReactNode; badge?: string }> = {
    shortest: { label: 'Shortest', color: 'emerald', icon: <MapPin size={13} /> },
    fastest: { label: 'Fastest', color: 'blue', icon: <Zap size={13} /> },
    safest: { label: 'Safest', color: 'purple', icon: <Shield size={13} /> },
    recommended: {
      label: 'AI Recommended',
      color: 'amber',
      icon: <Navigation size={13} />,
      badge: 'AI RECOMMENDED',
    },
  };

  const cfg = typeConfig[route.type];
  const borderColor =
    route.type === 'shortest' ? 'border-emerald-500/40' :
    route.type === 'fastest' ? 'border-blue-500/40' :
    route.type === 'safest' ? 'border-purple-500/40' : 'border-amber-500/40';

  const glowColor =
    route.type === 'shortest' ? 'shadow-emerald-500/10' :
    route.type === 'fastest' ? 'shadow-blue-500/10' :
    route.type === 'safest' ? 'shadow-purple-500/10' : 'shadow-amber-500/10';

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-xl border transition-all duration-200
        ${isSelected
          ? `bg-surface-600/80 ${borderColor} shadow-lg ${glowColor}`
          : 'bg-surface-700/50 border-white/5 hover:bg-surface-600/60 hover:border-white/10'
        }
      `}
      aria-pressed={isSelected}
      aria-label={`Select ${route.label} route`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${route.color}25`, border: `1px solid ${route.color}40` }}
          >
            <span style={{ color: route.color }}>{cfg.icon}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-300">{route.label}</p>
            {cfg.badge && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                {cfg.badge}
              </span>
            )}
          </div>
        </div>
        {isSelected && <CheckCircle size={14} style={{ color: route.color }} />}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Distance</p>
          <p className="text-lg font-bold text-white leading-none">{formatDistance(route.distance)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Est. Time</p>
          <p className="text-lg font-bold text-white leading-none">{formatDuration(route.duration)}</p>
        </div>
        {route.type === 'shortest' && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Turns</p>
            <p className="text-sm font-semibold text-white">{route.turns}</p>
          </div>
        )}
        {route.type === 'fastest' && route.trafficStatus && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Traffic</p>
            <p className="text-sm font-semibold text-yellow-400">{route.trafficStatus}</p>
          </div>
        )}
      </div>

      {/* Safety score */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Safety Score</span>
          <span className="text-[10px] text-gray-500">App Estimate</span>
        </div>
        <SafetyBar score={route.safetyScore} />
      </div>

      {/* Risk pills for safest/recommended */}
      {(route.type === 'safest' || route.type === 'recommended') && (
        <div className="flex flex-wrap gap-1 mt-2">
          <RiskPill label="Flood" score={route.riskBreakdown.flood} />
          <RiskPill label="Closure" score={route.riskBreakdown.closure} />
          {route.type === 'recommended' && (
            <RiskPill label="Weather" score={route.riskBreakdown.weather} />
          )}
        </div>
      )}

      {/* 360 Street View Quick Action */}
      {isSelected && route.coordinates && route.coordinates.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Street View 360° Panorama</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              const midIdx = Math.floor(route.coordinates.length / 2);
              const [lat, lng] = route.coordinates[midIdx] || route.coordinates[0];
              dispatch({
                type: 'SET_STREET_VIEW_LOCATION',
                payload: { lat, lng, title: `${route.label} — Street View` }
              });
            }}
            className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer bg-brand-500/10 hover:bg-brand-500/20 px-2 py-1 rounded-md border border-brand-500/30 transition-colors"
          >
            <Eye size={12} />
            Inspect 360°
          </span>
        </div>
      )}

      {route.isDemo && (
        <div className="mt-2 flex items-center gap-1">
          <Info size={10} className="text-amber-400/60" />
          <span className="text-[9px] text-amber-400/60 font-medium">Demo risk data</span>
        </div>
      )}
    </button>
  );
}

export function RouteCards() {
  const { state, dispatch } = useApp();
  const [showTelemetry, setShowTelemetry] = React.useState(false);
  const rc = state.routeComparison;

  if (!rc) return null;

  const routes = [
    rc.shortest,
    rc.fastest,
    rc.safest,
    rc.recommended,
  ].filter(Boolean) as Route[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="section-header mb-0">Route Options</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/30 text-brand-300 hover:bg-brand-500/20 transition-colors"
            title="Inspect routing API parameters and latency"
          >
            {showTelemetry ? 'Hide Telemetry' : 'API Telemetry'}
          </button>
          <span className="text-[10px] text-gray-400">{new Date(rc.calculatedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Telemetry & API Inspector Panel */}
      {showTelemetry && rc.telemetry && (
        <div className="glass-card p-3 border-brand-500/30 bg-surface-900/90 text-xs space-y-2 animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="font-bold text-brand-400 flex items-center gap-1.5">
              <Zap size={12} /> Routing Engine Inspector
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Verified Active</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-gray-500 block">Travel Mode:</span>
              <span className="text-white font-medium capitalize">{rc.telemetry.travelMode}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Preference:</span>
              <span className="text-white font-medium capitalize">{rc.telemetry.preference}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Backend Router:</span>
              <span className="text-brand-300 font-medium truncate block">{rc.telemetry.backendEndpoint}</span>
            </div>
            <div>
              <span className="text-gray-500 block">API Latency:</span>
              <span className="text-white font-medium">{rc.telemetry.apiDurationMs} ms</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 pt-1 border-t border-white/5">
            Console telemetry logged to browser DevTools. Each combination calculates distinct physical paths and timing.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={state.selectedRouteType === route.type}
            onSelect={() => dispatch({ type: 'SET_SELECTED_ROUTE', payload: route.type })}
          />
        ))}
      </div>

      {/* AI Explanation */}
      {rc.explanation && (
        <div className="glass-card p-4 border border-brand-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-brand-600/30 flex items-center justify-center">
              <Zap size={12} className="text-brand-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">Why RouteMind AI Chose This Route</h4>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{rc.explanation.split('[DEMO DATA')[0]}</p>
          {rc.explanation.includes('[DEMO DATA') && (
            <div className="flex items-start gap-2 mt-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-400/80">
                <strong>Demo Data</strong> — Risk scores are generated for demonstration purposes and do not reflect verified live road conditions.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
