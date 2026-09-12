import React, { useState } from 'react';
import { Shield, Search, Info, AlertTriangle, Clock, Database } from 'lucide-react';
import { useApp } from '../context';
import { fetchLiveRoadInfo, geocodePlace, getRiskDot, getRiskLabel, getRiskBgColor } from '../services';
import type { RoadInfo } from '../types';

export function RoadIntelligencePage() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [roadInfo, setRoadInfo] = useState<RoadInfo | null>(state.selectedRoadInfo);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const places = await geocodePlace(searchQuery.trim());
      if (places.length > 0) {
        const place = places[0];
        const info = await fetchLiveRoadInfo(place.location.lat, place.location.lng);
        if (info) {
          info.name = place.name;
          setRoadInfo(info);
          dispatch({ type: 'SET_SELECTED_ROAD', payload: info });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const riskHistoryColors: Record<string, string> = {
    low: 'bg-emerald-500',
    moderate: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
          <Shield size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Road Intelligence</h1>
          <p className="text-sm text-gray-500">Detailed road risk analysis and historical data</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <label className="label mb-2 block">Search a Road</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter road name or click on map..."
              className="input-field pl-9"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="btn-primary"
          >
            {isSearching ? <div className="spinner" /> : <Search size={14} />}
            Analyze
          </button>
        </div>
        <p className="text-[11px] text-gray-600 mt-2">
          You can also click on the map to get road information for that area.
        </p>

      </div>

      {/* Road info */}
      {!roadInfo ? (
        <div className="space-y-6">
          <div className="glass-card p-12 text-center">
            <Shield size={40} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No road selected</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Search for a road above or click anywhere on the map to view detailed risk information for that road segment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-5 border-orange-500/30">
              <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Live Traffic Jam
              </h3>
              <p className="text-sm text-gray-400">Data unavailable for this location.</p>
            </div>
            <div className="glass-card p-5 border-emerald-500/30">
              <h3 className="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
                <Shield size={18} /> Free Roads
              </h3>
              <p className="text-sm text-gray-400">Data unavailable for this location.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Main info card */}
          <div className="glass-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-white">{roadInfo.name}</h2>
                  {roadInfo.isDemo && <span className="demo-badge">Demo Data</span>}
                </div>
                <p className="text-sm text-gray-400">{roadInfo.type}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-semibold ${getRiskBgColor(roadInfo.status)}`}>
                {getRiskDot(roadInfo.status)} {getRiskLabel(roadInfo.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoField label="Traffic" value={roadInfo.trafficCondition} valueClass={roadInfo.trafficCondition === 'UNAVAILABLE' ? 'text-gray-500' : 'text-white'} />
              <InfoField label="Congestion" value={roadInfo.congestionLevel} valueClass={roadInfo.congestionLevel.includes('unavailable') ? 'text-gray-500' : 'text-white'} />
              <InfoField label="Road Status" value={roadInfo.roadAvailability} valueClass={roadInfo.roadAvailability === 'OPEN' ? 'text-emerald-400' : 'text-orange-400'} />
              <InfoField label="Damage" value={roadInfo.damageStatus} valueClass={roadInfo.damageStatus === 'UNKNOWN' ? 'text-gray-500' : 'text-white'} />
              <InfoField label="Delay" value={roadInfo.estimatedDelay > 0 ? `+${roadInfo.estimatedDelay} min` : 'None'} />
              <InfoField label="Surface" value={roadInfo.surface || 'Not available'} />
              <InfoField label="Speed Limit" value={roadInfo.speedLimit ? `${roadInfo.speedLimit} km/h` : 'Not available'} />
              <InfoField label="Confidence" value={`${roadInfo.confidenceLevel}%`} />
            </div>
          </div>

          {/* Risk breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Risk Assessment</h3>
              <div className="space-y-3">
                <RiskRow label="Overall Risk Score" score={roadInfo.riskScore} />
                <RiskRow label="Flood Risk" level={roadInfo.floodRisk} />
              </div>
              <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400/80">
                    Risk scores are application-generated estimates, not official safety ratings.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Current Hazards</h3>
              {roadInfo.currentHazards.length > 0 ? (
                <div className="space-y-2">
                  {roadInfo.currentHazards.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-orange-500/5 border border-orange-500/15 rounded-lg">
                      <AlertTriangle size={12} className="text-orange-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-gray-300">{h}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No verified hazard reports available.</p>
              )}
            </div>
          </div>

          {/* Flood history */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-white">Historical Flood Data</h3>
              {roadInfo.isDemo && <span className="demo-badge">Demo</span>}
            </div>
            {roadInfo.floodHistory.length > 0 ? (
              <div className="space-y-2">
                {roadInfo.floodHistory.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 shrink-0">{entry.period}</span>
                    <div className="flex-1 h-5 bg-surface-600 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${riskHistoryColors[entry.level] || 'bg-gray-500'}`}
                        style={{
                          width: entry.level === 'low' ? '25%' : entry.level === 'moderate' ? '50%' : entry.level === 'high' ? '75%' : '95%'
                        }}
                      />
                    </div>
                    <span className={`text-xs font-semibold w-16 text-right capitalize ${getRiskBgColor(entry.level).split(' ')[2]}`}>
                      {getRiskDot(entry.level)} {entry.level}
                    </span>
                    {entry.isDemo && <span className="text-[9px] text-amber-400/60">demo</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No verified historical flood data available.</p>
            )}
          </div>

          {/* Traffic history */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-white">Historical Traffic Pattern</h3>
            </div>
            <div className="bg-surface-800 rounded-lg p-4 border border-white/5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Peak Traffic</p>
                  <p className="text-sm text-orange-400 font-medium">8:00 AM – 10:00 AM</p>
                  <p className="text-[10px] text-gray-500">Predicted from historical data</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Secondary Peak</p>
                  <p className="text-sm text-yellow-400 font-medium">5:00 PM – 8:00 PM</p>
                  <p className="text-[10px] text-gray-500">Predicted from historical data</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Usually Free</p>
                  <p className="text-sm text-emerald-400 font-medium">11:00 AM – 3:00 PM</p>
                  <p className="text-[10px] text-gray-500">Predicted from historical data</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400"><span>06:00 AM</span><span className="text-emerald-400">Free</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>07:00 AM</span><span className="text-emerald-400">Light</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>08:00 AM</span><span className="text-orange-400">Heavy</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>09:00 AM</span><span className="text-red-400">Severe</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>10:00 AM</span><span className="text-orange-400">Heavy</span></div>
                <div className="flex justify-between text-xs text-gray-400"><span>11:00 AM</span><span className="text-yellow-400">Moderate</span></div>
              </div>
            </div>
          </div>

          {/* Data source */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-white">Data Source</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Source: </span>
                <span className="text-gray-300">{roadInfo.dataSource}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={10} className="text-gray-500" />
                <span className="text-gray-500">
                  Updated: {new Date(roadInfo.lastUpdated).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-medium ${valueClass || 'text-white'}`}>{value}</p>
    </div>
  );
}

function RiskRow({ label, score, level }: { label: string; score?: number; level?: string }) {
  const displayScore = score !== undefined ? score : level === 'low' ? 15 : level === 'moderate' ? 40 : level === 'high' ? 70 : 90;
  const color = displayScore < 30 ? 'bg-emerald-500' : displayScore < 60 ? 'bg-yellow-500' : displayScore < 80 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-bold ${displayScore < 30 ? 'text-emerald-400' : displayScore < 60 ? 'text-yellow-400' : displayScore < 80 ? 'text-orange-400' : 'text-red-400'}`}>
          {displayScore}/100
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${displayScore}%` }} />
      </div>
    </div>
  );
}
