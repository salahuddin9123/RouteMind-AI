import React from 'react';
import { Droplets, AlertTriangle, Info, MapPin, Clock } from 'lucide-react';
import { useApp } from '../context';
import { getRiskDot, getRiskLabel, getRiskBgColor } from '../services';
import type { FloodZone } from '../types';

const RISK_LEGEND = [
  { level: 'low', label: 'Low Risk', desc: 'Minimal flood probability based on available data' },
  { level: 'moderate', label: 'Moderate Risk', desc: 'Possible waterlogging, especially during heavy rain' },
  { level: 'high', label: 'High Risk', desc: 'Historical flooding reported in this area' },
  { level: 'critical', label: 'Critical Risk', desc: 'High flood risk — verify conditions before travel' },
];

export function FloodRiskPage() {
  const { state, dispatch } = useApp();


  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/20 flex items-center justify-center">
            <Droplets size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Flood Risk Intelligence</h1>
            <p className="text-sm text-gray-500">Road flood and waterlogging risk data</p>
          </div>
        </div>
      </div>

      {/* Important notice */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-300 mb-1">Data Accuracy Notice</h3>
            <p className="text-xs text-amber-400/80 leading-relaxed">
              RouteMind AI does not claim to provide real-time flood data. No data source is currently connected.
              All flood zones displayed are <strong>Demo Data</strong> for demonstration purposes only.
              Never rely solely on this application for flood safety decisions — always consult official local authorities.
            </p>
          </div>
        </div>
      </div>

      {/* Risk legend */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Risk Level Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RISK_LEGEND.map((r) => (
            <div key={r.level} className={`p-3 rounded-lg border ${getRiskBgColor(r.level)}`}>
              <p className="text-xs font-bold mb-1">{getRiskDot(r.level)} {r.label}</p>
              <p className="text-[10px] opacity-80">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Flood zones */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Active Flood Zones</h3>
          <div className="flex items-center gap-2">

            <button
              onClick={() => dispatch({ type: 'TOGGLE_FLOOD_LAYER' })}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                state.showFloodLayer
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                  : 'bg-surface-600/50 border-white/10 text-gray-400'
              }`}
            >
              {state.showFloodLayer ? 'Layer ON' : 'Layer OFF'}
            </button>
          </div>
        </div>

        {state.floodZones.length === 0 ? (
          <div className="text-center py-8">
            <Droplets size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No flood zone data loaded</p>
            <p className="text-xs text-gray-600 mt-1">
              Plan a route to see flood zones. Currently, verified live data is unavailable for this area.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.floodZones.map((zone) => (
              <FloodZoneCard key={zone.id} zone={zone} />
            ))}
          </div>
        )}
      </div>

      {/* Data source info */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-white">Data Source Status</h3>
        </div>
        <div className="space-y-2">
          <DataSourceRow label="Live Flood API" status="Not Connected" />
          <DataSourceRow label="Government Flood Data" status="Not Connected" />
          <DataSourceRow label="Hydrological Models" status="Not Connected" />
          <DataSourceRow label="Historical Flood Records" status="Not Connected" />
          <DataSourceRow label="Demo Flood Simulation" status="Inactive" />
        </div>
        <p className="text-[10px] text-gray-600 mt-3">
          To connect live flood data, configure an appropriate API endpoint in Settings → API Configuration.
        </p>
      </div>
    </div>
  );
}

function FloodZoneCard({ zone }: { zone: FloodZone }) {
  return (
    <div className={`p-4 rounded-lg border ${getRiskBgColor(zone.riskLevel)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold">{zone.name}</h4>
            {zone.isDemo && <span className="demo-badge">Demo</span>}
          </div>
          <p className="text-xs opacity-80 mb-2">{zone.description}</p>
          <div className="flex items-center gap-3 text-[10px] opacity-70">
            <div className="flex items-center gap-1">
              <MapPin size={9} />
              {zone.center.lat.toFixed(4)}, {zone.center.lng.toFixed(4)}
            </div>
            <div className="flex items-center gap-1">
              <Clock size={9} />
              {new Date(zone.lastUpdated).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg">{getRiskDot(zone.riskLevel)}</span>
          <p className="text-[10px] font-bold mt-1 capitalize">{zone.riskLevel} Risk</p>
        </div>
      </div>
    </div>
  );
}

function DataSourceRow({ label, status, isDemo }: { label: string; status: string; isDemo?: boolean }) {
  const isConnected = status.startsWith('Active') || status === 'Connected';
  const isNotConnected = status === 'Not Connected';

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        isConnected
          ? 'bg-emerald-500/20 text-emerald-400'
          : isNotConnected
          ? 'bg-gray-500/20 text-gray-500'
          : 'bg-amber-500/20 text-amber-400'
      }`}>
        {isNotConnected ? '⊗ ' : isConnected ? '● ' : '● '}{status}
      </span>
    </div>
  );
}
