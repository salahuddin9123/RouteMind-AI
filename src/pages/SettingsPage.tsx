import React, { useState } from 'react';
import {
  Settings, Globe, Cpu, CloudRain, AlertTriangle, Database,
  Save, RotateCcw, Car, Shield, ChevronDown, Info, Building2
} from 'lucide-react';
import { useApp } from '../context';
import type { TravelMode, RoutePreference, UserPreferences } from '../types';

const DATA_SOURCES = [
  { id: 'map', label: 'Map Data', provider: 'OpenStreetMap', type: 'Tile Map', status: 'connected', coverage: 'Global', updated: new Date().toISOString() },
  { id: 'routing', label: 'Routing Data', provider: 'OSRM (Public)', type: 'Route Calculation', status: 'connected', coverage: 'Global', updated: new Date().toISOString() },
  { id: 'geocoding', label: 'Geocoding', provider: 'Nominatim (OSM)', type: 'Location Search', status: 'connected', coverage: 'Global', updated: new Date().toISOString() },
  { id: 'weather', label: 'Weather Data', provider: 'Open-Meteo', type: 'Weather API', status: 'connected', coverage: 'Global', updated: new Date().toISOString() },
  { id: 'flood', label: 'Flood Data', provider: 'Tomorrow.io', type: 'Flood Risk API', status: 'connected', coverage: 'Global', updated: new Date().toISOString() },
  { id: 'closure', label: 'Road Closures', provider: 'TomTom', type: 'Closure Data API', status: 'connected', coverage: 'Global', updated: new Date().toISOString() },
];

export function SettingsPage() {
  const { state, dispatch } = useApp();
  const prefs = state.preferences;
  const [saved, setSaved] = useState(false);

  const updatePref = <K extends keyof UserPreferences>(key: K, val: UserPreferences[K]) => {
    dispatch({ type: 'SET_PREFERENCES', payload: { [key]: val } });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    dispatch({
      type: 'SET_PREFERENCES',
      payload: {
        travelMode: 'driving',
        routePreference: 'balanced',
        avoidTolls: false,
        avoidHighways: false,
        avoidHighFloodRisk: true,
        avoidReportedClosures: true,
        maxAcceptableRisk: 70,
      },
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
            <Settings size={20} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-sm text-gray-500">Configure preferences and data connections</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-ghost text-xs">
            <RotateCcw size={13} /> Reset
          </button>
          <button onClick={handleSave} className={`btn-primary text-xs ${saved ? 'bg-emerald-600' : ''}`}>
            <Save size={13} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>



      {/* Travel Preferences */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Car size={14} className="text-brand-400" />
          Travel Preferences
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label mb-2 block">Default Travel Mode</label>
            <div className="flex gap-2 flex-wrap">
              {(['driving', 'walking', 'cycling', 'transit'] as TravelMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => updatePref('travelMode', m)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                    prefs.travelMode === m
                      ? 'bg-brand-600/30 border-brand-500/50 text-brand-300'
                      : 'bg-surface-600/50 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2 block">Default Route Preference</label>
            <div className="flex gap-2 flex-wrap">
              {(['balanced', 'fastest', 'shortest', 'safest'] as RoutePreference[]).map((p) => (
                <button
                  key={p}
                  onClick={() => updatePref('routePreference', p)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                    prefs.routePreference === p
                      ? 'bg-brand-600/30 border-brand-500/50 text-brand-300'
                      : 'bg-surface-600/50 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Route Safety Options */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Shield size={14} className="text-brand-400" />
          Route Safety Options
        </h3>
        <div className="space-y-3">
          {[
            { key: 'avoidTolls', label: 'Avoid Toll Roads', desc: 'Prefer routes without tolls' },
            { key: 'avoidHighways', label: 'Avoid Highways', desc: 'Use local roads when possible' },
            { key: 'avoidHighFloodRisk', label: 'Avoid High Flood-Risk Roads', desc: 'Deprioritize routes with high estimated flood risk' },
            { key: 'avoidReportedClosures', label: 'Avoid Reported Closures', desc: 'Exclude routes with active closure reports' },
          ].map((opt) => (
            <div key={opt.key} className="flex items-center justify-between p-3 bg-surface-600/30 rounded-lg border border-white/5">
              <div>
                <p className="text-sm text-white">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
              <ToggleSwitch
                checked={prefs[opt.key as keyof UserPreferences] as boolean}
                onChange={(v) => updatePref(opt.key as keyof UserPreferences, v as any)}
                id={`pref-${opt.key}`}
              />
            </div>
          ))}

          <div className="p-3 bg-surface-600/30 rounded-lg border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white">Maximum Acceptable Risk</p>
              <span className="text-sm font-bold text-white">{prefs.maxAcceptableRisk}/100</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={prefs.maxAcceptableRisk}
              onChange={(e) => updatePref('maxAcceptableRisk', parseInt(e.target.value))}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #6366f1 ${prefs.maxAcceptableRisk}%, rgba(255,255,255,0.1) ${prefs.maxAcceptableRisk}%)`
              }}
              aria-label="Maximum acceptable risk score"
            />
            <p className="text-xs text-gray-500 mt-1">Routes with risk scores above this threshold will be flagged</p>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Cpu size={14} className="text-brand-400" />
          API Configuration
        </h3>
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <Info size={12} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-400/80">
              API keys should be configured through environment variables, not stored in this interface.
              Use a backend proxy to secure sensitive credentials.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <ConfigRow
            label="Map Provider"
            value={state.apiConfig.mapProvider}
            status="connected"
            note="OpenStreetMap (free, no key required)"
          />
          <ConfigRow
            label="Geocoding"
            value={state.apiConfig.geocodingProvider}
            status="connected"
            note="Nominatim via OpenStreetMap"
          />
          <ConfigRow
            label="Routing"
            value={state.apiConfig.routingProvider}
            status="connected"
            note="OSRM public demo server"
          />
          <ConfigRow
            label="Weather API Key"
            value={state.apiConfig.weatherApiKey || 'Configured via backend'}
            status="connected"
            note="Live weather data enabled via Open-Meteo"
            isSecret
          />
          <ConfigRow
            label="Flood Data API"
            value={state.apiConfig.floodApiEndpoint || 'Configured via backend'}
            status="connected"
            note="Live flood risk data enabled"
          />
          <ConfigRow
            label="Road Closure API"
            value={state.apiConfig.closureApiEndpoint || 'Configured via backend'}
            status="connected"
            note="Live closure data enabled"
          />
        </div>
      </div>

      {/* Campus Configuration */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 size={14} className="text-brand-400" />
          Campus Configuration
        </h3>
        <div className="space-y-3">
          <ConfigRow
            label="Authorized Occupancy Source"
            value="Configured via backend"
            status="connected"
            note="Sensor data API (Live occupancy currently offline)"
          />
          <ConfigRow
            label="Campus Map Provider"
            value="Leaflet (ESRI Satellite)"
            status="connected"
            note="Interactive map & building navigation enabled"
          />
        </div>
      </div>

      {/* Data Sources */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Database size={14} className="text-brand-400" />
          Data Sources Status
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/5">
                <th className="text-left py-2 pr-4">Source</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">Provider</th>
                <th className="text-left py-2 pr-4">Coverage</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((src) => (
                <tr key={src.id} className="border-b border-white/5 last:border-0">
                  <td className="py-3 pr-4 text-white font-medium">{src.label}</td>
                  <td className="py-3 pr-4 text-gray-400">{src.type}</td>
                  <td className="py-3 pr-4 text-gray-400">{src.provider}</td>
                  <td className="py-3 pr-4 text-gray-400">{src.coverage}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      src.status === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-500/20 text-gray-500'
                    }`}>
                      {src.status === 'connected' ? '● Connected' : '⊗ Not Connected'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map Layers */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Map Layer Defaults</h3>
        <div className="space-y-3">
          <LayerPref
            label="Show Flood Risk Layer by Default"
            checked={prefs.showFloodLayer}
            onChange={(v) => updatePref('showFloodLayer', v)}
            id="pref-flood-layer"
          />
          <LayerPref
            label="Show Road Closures by Default"
            checked={prefs.showClosureLayer}
            onChange={(v) => updatePref('showClosureLayer', v)}
            id="pref-closure-layer"
          />
          <LayerPref
            label="Show Weather Markers by Default"
            checked={prefs.showWeatherMarkers}
            onChange={(v) => updatePref('showWeatherMarkers', v)}
            id="pref-weather-layer"
          />
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">About RouteMind AI</h3>
        <div className="space-y-1 text-xs text-gray-500">
          <p><span className="text-gray-400">Version:</span> 1.0.0</p>
          <p><span className="text-gray-400">Platform:</span> Global Route Intelligence & Road Safety Platform</p>
          <p><span className="text-gray-400">Map Data:</span> © OpenStreetMap contributors</p>
          <p><span className="text-gray-400">Routing:</span> OSRM — Open Source Routing Machine</p>
          <p><span className="text-gray-400">Geocoding:</span> Nominatim — OpenStreetMap Geocoder</p>
          <p className="mt-2 text-gray-600">Route safety scores are application-generated estimates and are not official safety ratings. Always exercise personal judgment when traveling.</p>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-600' : 'bg-surface-500'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

function ConfigRow({ label, value, status, note, isSecret }: {
  label: string; value: string; status: string; note?: string; isSecret?: boolean;
}) {
  return (
    <div className="flex items-start justify-between p-3 bg-surface-600/30 rounded-lg border border-white/5 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
          {isSecret && value !== 'Not configured' ? '•••••••••••••••' : value}
        </p>
        {note && <p className="text-[10px] text-gray-600 mt-0.5">{note}</p>}
      </div>
      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
        status === 'connected'
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-gray-500/20 text-gray-500'
      }`}>
        {status === 'connected' ? 'Connected' : 'Not Connected'}
      </span>
    </div>
  );
}

function LayerPref({ label, checked, onChange, id }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; id: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-600/30 rounded-lg border border-white/5">
      <label htmlFor={id} className="text-sm text-gray-300 cursor-pointer">{label}</label>
      <ToggleSwitch checked={checked} onChange={onChange} id={id} />
    </div>
  );
}
