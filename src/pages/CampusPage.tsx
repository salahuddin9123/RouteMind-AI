import React, { useEffect, useState } from 'react';
import { Building2, Navigation, AlertTriangle, Users, MapPin, Search, Cloud, Droplets, Info } from 'lucide-react';
import { useApp } from '../context';
import { fetchBrainwareCampusData, fetchLiveWeather } from '../services';
import { CampusMap } from '../components/CampusMap';
import type { WeatherData } from '../types';

export function CampusPage() {
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    async function loadCampus() {
      setIsLoading(true);
      try {
        const data = await fetchBrainwareCampusData();
        dispatch({ type: 'SET_CAMPUS_DATA', payload: data });
        // Fetch weather for campus center
        const weatherData = await fetchLiveWeather(22.7335, 88.5529);
        setWeather(weatherData);
      } catch (e) {
        console.error('Failed to load campus data');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (!state.campusData) {
      loadCampus();
    } else if (!weather) {
       fetchLiveWeather(22.7335, 88.5529).then(setWeather);
    }
  }, [dispatch, state.campusData, weather]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!state.campusData) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Failed to load Brainware University data.</p>
      </div>
    );
  }

  const { buildings, facilities, trafficStatus, floodStatus, lastUpdated } = state.campusData;

  const handleAskAI = () => {
    if (!aiQuery.trim()) return;
    const lower = aiQuery.toLowerCase();
    if (lower.includes('gate') && lower.includes('crowd')) {
      setAiResponse('Based on the latest data, live crowd occupancy for gates is currently unavailable.');
    } else if (lower.includes('waterlog') || lower.includes('flood')) {
      setAiResponse(`The current flood status for the campus is: ${floodStatus}.`);
    } else if (lower.includes('traffic')) {
      setAiResponse(`Campus traffic is currently reported as: ${trafficStatus}.`);
    } else {
      setAiResponse(`I am the Brainware AI Assistant. I can only provide answers based on verified live campus data. For "${aiQuery}", I don't have enough verified data right now.`);
    }
    setAiQuery('');
  };

  const getCrowdColor = (level: string) => {
    switch(level) {
      case 'LOW': return 'text-emerald-400';
      case 'MODERATE': return 'text-yellow-400';
      case 'HIGH': return 'text-orange-400';
      case 'VERY HIGH': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Free': return 'text-emerald-400';
      case 'Normal': return 'text-yellow-400';
      case 'Busy': return 'text-red-400';
      case 'Closed': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Building2 size={24} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Brainware University</h1>
            <p className="text-sm text-gray-400">Barasat, Kolkata • Live Campus Intelligence</p>
          </div>
        </div>
        <div className="flex gap-2">
          {weather && (
             <div className="glass-card px-4 py-2 flex items-center gap-3 border-brand-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
               <Cloud className="text-blue-400" size={20} />
               <div>
                 <p className="text-sm font-bold text-white">{weather.temperature}°C, {weather.condition}</p>
                 <p className="text-[10px] text-gray-400">Source: {weather.source}</p>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Main Map & Intelligence Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Map */}
          <div className="h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-lg border border-white/10 relative">
            <CampusMap routeFrom={routeFrom} routeTo={routeTo} />
            <div className="absolute top-4 left-4 z-[400]">
               <div className="glass-card px-3 py-2 bg-surface-900/90 backdrop-blur-md shadow-lg border border-white/10">
                  <h3 className="text-xs font-bold text-white mb-1 flex items-center gap-1"><Info size={12}/> Map Legend</h3>
                  <div className="flex items-center gap-2 text-[10px] text-gray-300">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Buildings
                    <span className="w-2 h-2 rounded-full bg-orange-500 ml-2"></span> Gates
                    <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> Canteen/Food
                  </div>
               </div>
            </div>
          </div>

          {/* Building Routing */}
          <div className="glass-card p-6 border-brand-500/20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-brand-400" /> Building-to-Building Navigation
            </h2>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">From</label>
                <select 
                  className="w-full bg-surface-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  value={routeFrom}
                  onChange={(e) => setRouteFrom(e.target.value)}
                >
                  <option value="">Select Building</option>
                  {buildings.map(b => <option key={`from-${b.id}`} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">To</label>
                <select 
                  className="w-full bg-surface-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value)}
                >
                  <option value="">Select Building</option>
                  {buildings.map(b => <option key={`to-${b.id}`} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {routeFrom && routeTo && routeFrom !== routeTo && (
              <div className="border border-brand-500/20 bg-brand-500/5 rounded-lg p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-brand-400 text-sm">Route Calculated</h3>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">Status: Clear</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-center">
                    <div className="bg-surface-800 p-2 rounded-lg border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase mb-1">Distance</p>
                      <p className="text-white font-medium text-xs">Est. ~150 m</p>
                    </div>
                    <div className="bg-surface-800 p-2 rounded-lg border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase mb-1">Walking Time</p>
                      <p className="text-white font-medium text-xs">2-3 min</p>
                    </div>
                    <div className="bg-surface-800 p-2 rounded-lg border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase mb-1">Waterlogging</p>
                      <p className="text-gray-400 font-medium text-xs">{floodStatus}</p>
                    </div>
                    <div className="bg-surface-800 p-2 rounded-lg border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase mb-1">Crowd Flow</p>
                      <p className="text-gray-400 font-medium text-xs">Data Unavailable</p>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Intelligence */}
        <div className="space-y-6">
          {/* Search Campus */}
          <div className="glass-card p-4 border-brand-500/20">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-brand-400" />
              <input
                type="text"
                placeholder="Search buildings, gates..."
                className="w-full bg-surface-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  if (val.length > 2) {
                     const b = buildings.find(x => x.name.toLowerCase().includes(val));
                     const f = facilities.find(x => x.name.toLowerCase().includes(val));
                     if (b) dispatch({ type: 'SET_SEARCHED_PLACE', payload: { name: b.name, displayName: 'Campus Building', location: b.location }});
                     else if (f) dispatch({ type: 'SET_SEARCHED_PLACE', payload: { name: f.name, displayName: f.type, location: f.location }});
                  }
                }}
              />
            </div>
          </div>

          {/* Dashboard Summary */}
          <div className="glass-card p-5 border-white/5">
            <h2 className="text-md font-bold text-white mb-4 border-b border-white/5 pb-2">Overview Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Campus Traffic</span>
                <span className="text-sm font-semibold text-gray-500">{trafficStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Campus Flood Risk</span>
                <span className="text-sm font-semibold text-emerald-400">{floodStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Last Updated</span>
                <span className="text-[10px] text-gray-500">{new Date(lastUpdated).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-center">
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-full">No live tracking used (Privacy First)</span>
            </div>
          </div>

          {/* Gates */}
          <div className="glass-card p-5 border-white/5">
            <h2 className="text-md font-bold text-white mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
              <Navigation size={16} className="text-brand-400" /> Gate Intelligence
            </h2>
            <div className="space-y-4">
              {facilities.filter(f => f.type === 'gate').map(gate => (
                <div key={gate.id} className="bg-surface-800/50 p-3 rounded-lg border border-white/5 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-white text-xs">{gate.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-700 border border-white/10 ${getStatusColor(gate.status)}`}>
                      {gate.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                     <span className="text-gray-500">Live Occupancy:</span>
                     <span className="text-gray-400 font-semibold">{gate.occupancy ?? 'Data Unavailable'}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 text-right mt-1">Source: {gate.source}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Canteen & Food */}
          <div className="glass-card p-5 border-white/5">
            <h2 className="text-md font-bold text-white mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
              <Users size={16} className="text-brand-400" /> Canteen & Food Court
            </h2>
            <div className="space-y-4">
              {facilities.filter(f => f.type === 'canteen' || f.type === 'food_court').map(facility => (
                <div key={facility.id} className="bg-surface-800/50 p-3 rounded-lg border border-white/5 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-white text-xs">{facility.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-700 border border-white/10 ${getCrowdColor(facility.crowdLevel)}`}>
                      {facility.crowdLevel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                     <span className="text-gray-500">Usually Busy:</span>
                     <span className="text-orange-400 font-semibold">{facility.usuallyBusy}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 text-right mt-1">Source: {facility.source}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* AI Assistant */}
          <div className="bg-brand-600/10 border border-brand-500/30 rounded-xl p-5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
             <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                <Search size={16} className="text-brand-400" /> Brainware AI
             </h3>
             <p className="text-xs text-gray-400 mb-3 relative z-10">Ask about verified live campus data.</p>
             <div className="space-y-3 relative z-10">
               {aiResponse && (
                  <div className="bg-surface-900/80 border border-brand-500/20 rounded p-3 text-xs text-brand-100 leading-relaxed">
                     {aiResponse}
                  </div>
               )}
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={aiQuery}
                   onChange={e => setAiQuery(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                   placeholder="E.g., Is the main gate crowded?"
                   className="flex-1 bg-surface-900 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                 />
                 <button onClick={handleAskAI} className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded text-xs transition-colors">
                   Ask
                 </button>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
