import React from 'react';
import { Layers, Eye, EyeOff, Crosshair } from 'lucide-react';
import { useApp } from '../context';

export function MapControls() {
  const { state, dispatch } = useApp();
  const currentStyle = state.preferences.mapStyle || 'dark';

  return (
    <div className="absolute bottom-6 right-4 flex flex-col gap-2 z-20">
      {/* Basemap Switcher */}
      <div className="glass-card p-2.5 shadow-xl space-y-1.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Map Style</span>
        <div className="flex gap-1">
          <button
            onClick={() => dispatch({ type: 'SET_PREFERENCES', payload: { mapStyle: 'dark' } })}
            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              currentStyle === 'dark' ? 'bg-brand-600 text-white font-bold' : 'bg-surface-700 text-gray-400 hover:text-white'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_PREFERENCES', payload: { mapStyle: 'streets' } })}
            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              currentStyle === 'streets' ? 'bg-brand-600 text-white font-bold' : 'bg-surface-700 text-gray-400 hover:text-white'
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_PREFERENCES', payload: { mapStyle: 'satellite' } })}
            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              currentStyle === 'satellite' ? 'bg-brand-600 text-white font-bold' : 'bg-surface-700 text-gray-400 hover:text-white'
            }`}
          >
            Hybrid
          </button>
        </div>
      </div>

      {/* Layer controls */}
      <div className="glass-card p-3 space-y-2 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={12} className="text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Layers</span>
        </div>

        <LayerToggle
          label="Traffic"
          active={state.showTrafficLayer}
          onToggle={() => dispatch({ type: 'TOGGLE_TRAFFIC_LAYER' })}
          color="#22c55e"
        />
        <LayerToggle
          label="Flood Risk"
          active={state.showFloodLayer}
          onToggle={() => dispatch({ type: 'TOGGLE_FLOOD_LAYER' })}
          color="#06b6d4"
        />
        <LayerToggle
          label="Road Damage"
          active={state.showDamageLayer}
          onToggle={() => dispatch({ type: 'TOGGLE_DAMAGE_LAYER' })}
          color="#f59e0b"
        />
        <LayerToggle
          label="Closures"
          active={state.showClosureLayer}
          onToggle={() => dispatch({ type: 'TOGGLE_CLOSURE_LAYER' })}
          color="#ef4444"
        />
        <LayerToggle
          label="Incidents"
          active={state.showIncidentsLayer}
          onToggle={() => dispatch({ type: 'TOGGLE_INCIDENTS_LAYER' })}
          color="#9333ea"
        />
        <LayerToggle
          label="Weather"
          active={state.showWeatherMarkers}
          onToggle={() => dispatch({ type: 'TOGGLE_WEATHER_MARKERS' })}
          color="#6366f1"
        />
      </div>
    </div>
  );
}

interface LayerToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  color: string;
}

function LayerToggle({ label, active, onToggle, color }: LayerToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 text-[11px] font-medium transition-colors w-full text-left ${active ? 'text-white' : 'text-gray-500'}`}
      aria-pressed={active}
      aria-label={`Toggle ${label} layer`}
    >
      <div
        className={`w-3 h-3 rounded-sm border transition-all ${active ? 'opacity-100' : 'opacity-30'}`}
        style={{ backgroundColor: `${color}66`, borderColor: color }}
      />
      {label}
      <span className="ml-auto">
        {active ? <Eye size={11} style={{ color }} /> : <EyeOff size={11} className="text-gray-600" />}
      </span>
    </button>
  );
}
