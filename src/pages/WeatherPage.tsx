import React from 'react';
import { Cloud, Thermometer, Wind, Eye, Droplets, AlertTriangle, WifiOff } from 'lucide-react';
import { useApp } from '../context';
import { getRiskBgColor, getRiskLabel, getRiskDot } from '../services';

export function WeatherPage() {
  const { state, dispatch } = useApp();
  const weather = state.weatherData;


  const riskToLevel = (risk: string) => {
    if (risk === 'low') return 'low';
    if (risk === 'moderate') return 'moderate';
    if (risk === 'high') return 'high';
    if (risk === 'critical') return 'critical';
    return 'moderate';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
            <Cloud size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Weather Intelligence</h1>
            <p className="text-sm text-gray-500">Weather conditions and route risk assessment</p>
          </div>
        </div>
      </div>

      {/* No weather state */}
      {!weather ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-600/50 border border-white/5 flex items-center justify-center mx-auto mb-4">
            <WifiOff size={28} className="text-gray-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">Weather data unavailable</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            Weather data is populated dynamically when you search and plan a route. Please use the Route Planner to fetch live weather.
          </p>
          <p className="text-xs text-gray-600 mt-4">
            To connect live weather: Settings → API Configuration → Weather API Key
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Demo notice */}
          {weather.isDemo && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400/80">
                <strong>Demo Data</strong> — Weather conditions are simulated for demonstration. Do not use for safety decisions.
              </p>
            </div>
          )}

          {/* Main weather card */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-bold text-white">
                    {weather.temperature !== undefined ? `${weather.temperature}°C` : 'N/A'}
                  </h2>
                  {weather.isDemo && <span className="demo-badge">Demo</span>}
                </div>
                <p className="text-gray-400">{weather.condition || 'Conditions unavailable'}</p>
                {weather.feelsLike !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">Feels like {weather.feelsLike}°C</p>
                )}
              </div>

              <div className={`px-4 py-2 rounded-xl border text-sm font-bold ${getRiskBgColor(riskToLevel(weather.risk))}`}>
                Weather Risk: {getRiskLabel(riskToLevel(weather.risk))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <WeatherMetric
                icon={<Droplets size={16} className="text-blue-400" />}
                label="Rainfall"
                value={weather.rain !== undefined ? `${weather.rain} mm` : 'N/A'}
                subValue={weather.rainProbability !== undefined ? `${weather.rainProbability}% chance` : undefined}
              />
              <WeatherMetric
                icon={<Wind size={16} className="text-cyan-400" />}
                label="Wind Speed"
                value={weather.wind !== undefined ? `${weather.wind} km/h` : 'N/A'}
              />
              <WeatherMetric
                icon={<Eye size={16} className="text-purple-400" />}
                label="Visibility"
                value={weather.visibility !== undefined ? `${weather.visibility} km` : 'N/A'}
              />
              <WeatherMetric
                icon={<Thermometer size={16} className="text-orange-400" />}
                label="Temperature"
                value={weather.temperature !== undefined ? `${weather.temperature}°C` : 'N/A'}
              />
            </div>
          </div>

          {/* Weather alerts */}
          {weather.alerts && weather.alerts.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                Weather Alerts
              </h3>
              <div className="space-y-2">
                {weather.alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-300">{alert}</p>
                    {weather.isDemo && <span className="ml-auto demo-badge shrink-0">Demo</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Route impact */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Route Risk Impact</h3>
            <div className="space-y-3">
              <ImpactRow
                label="Flood Risk Increase"
                desc={weather.rain !== undefined && weather.rain > 5 ? 'Elevated — heavy rainfall increases flood risk' : 'Minimal impact on flood risk'}
                level={weather.rain !== undefined && weather.rain > 5 ? 'high' : 'low'}
              />
              <ImpactRow
                label="Visibility Impact"
                desc={weather.visibility !== undefined && weather.visibility < 5 ? 'Reduced visibility — drive with caution' : 'Good visibility conditions'}
                level={weather.visibility !== undefined && weather.visibility < 5 ? 'moderate' : 'low'}
              />
              <ImpactRow
                label="Travel Time Impact"
                desc={weather.rain !== undefined && weather.rain > 3 ? 'Allow additional time due to wet roads' : 'Minimal impact expected'}
                level={weather.rain !== undefined && weather.rain > 3 ? 'moderate' : 'low'}
              />
            </div>
          </div>

          {/* Data source */}
          <div className="flex items-center justify-between p-3 glass-card text-xs text-gray-500">
            <span>Source: {weather.source || 'Demo Data'}</span>
            <span>Updated: {weather.lastUpdated ? new Date(weather.lastUpdated).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherMetric({ icon, label, value, subValue }: {
  icon: React.ReactNode; label: string; value: string; subValue?: string;
}) {
  return (
    <div className="p-3 bg-surface-600/30 rounded-lg border border-white/5">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-400">{label}</span></div>
      <p className="text-base font-bold text-white">{value}</p>
      {subValue && <p className="text-[11px] text-gray-500 mt-0.5">{subValue}</p>}
    </div>
  );
}

function ImpactRow({ label, desc, level }: { label: string; desc: string; level: string }) {

  return (
    <div className="flex items-start gap-3">
      <span className="text-lg shrink-0">{getRiskDot(level)}</span>
      <div>
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
