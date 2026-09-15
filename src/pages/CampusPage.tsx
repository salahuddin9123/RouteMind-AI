import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Building2, Navigation, Users, MapPin, Search, Cloud,
  Droplets, Info, Send, Bot, User, Radio, CheckCircle, RefreshCw,
  ArrowUpDown, Crosshair, Check, Sparkles
} from 'lucide-react';
import { useApp } from '../context';
import { fetchBrainwareCampusData, fetchLiveWeather, askAiAgent, generateId, matchCampusBuilding } from '../services';
import { CampusMap } from '../components/CampusMap';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { WeatherData } from '../types';

const SUGGESTED_CAMPUS_PROMPTS = [
  'Where is Building III: Prafulla Bhavan?',
  'Is Gate 1 crowded right now?',
  'Which buildings are closest to Gate 1?',
  'Best time to visit Main Canteen?'
];

export function CampusPage() {
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const [buildingGateFilter, setBuildingGateFilter] = useState<'ALL' | 'Gate 1' | 'Gate 2'>('ALL');
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'Hello! I am Brainware AI, your campus navigation assistant. Ask me about gate crowd status, canteen rush hours, or campus flood risks.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Webhook test state
  const [showWebhookPanel, setShowWebhookPanel] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const loadCampus = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBrainwareCampusData();
      dispatch({ type: 'SET_CAMPUS_DATA', payload: data });
      const weatherData = await fetchLiveWeather(22.7335, 88.5529);
      setWeather(weatherData);
    } catch (e) {
      console.error('Failed to load campus data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!state.campusData) {
      loadCampus();
    } else if (!weather) {
      fetchLiveWeather(22.7335, 88.5529).then(setWeather);
    }
  }, [dispatch, state.campusData, weather]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatTyping]);

  const handleSendChat = async (questionText?: string) => {
    const textToSend = questionText || chatInput;
    if (!textToSend.trim() || isChatTyping) return;

    const userMsg = {
      id: generateId(),
      role: 'user' as const,
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!questionText) setChatInput('');
    setIsChatTyping(true);

    try {
      const context = {
        campusData: state.campusData,
        weatherData: weather,
        routeComparison: state.routeComparison
      };

      const messagesPayload = chatMessages.concat(userMsg).map(m => ({
        role: m.role,
        content: m.text
      }));

      const res = await askAiAgent(messagesPayload, context);
      const reply = res.reply || res.error || "I don't have verified data on that yet.";

      setChatMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant' as const,
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant' as const,
          text: "I don't have verified data on that yet. Current verified campus data covers Gate 1, Gate 2, Main Canteen, Food Court, and live weather/flood conditions.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatTyping(false);
    }
  };

  // Test webhook trigger
  const handleTestSensorPing = async () => {
    setWebhookStatus('Sending sensor ping...');
    try {
      const res = await fetch('/api/campus/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: 'g1',
          occupancy: 38,
          crowdLevel: 'MODERATE',
          queueCondition: '1-2 min queue (Live Sensor)',
          status: 'Active',
          source: 'Verified Live IoT Webhook'
        })
      });
      if (res.ok) {
        setWebhookStatus('✅ Sensor update ingested! Reloading campus telemetry...');
        setTimeout(() => {
          loadCampus();
          setWebhookStatus('✅ Gate 1 updated from live sensor!');
        }, 600);
      } else {
        setWebhookStatus('❌ Webhook ingestion returned non-200');
      }
    } catch (e: any) {
      setWebhookStatus(`❌ Webhook error: ${e.message}`);
    }
  };

  const campusData = state.campusData;
  const buildings = useMemo(() => campusData?.buildings || [], [campusData]);
  const facilities = useMemo(() => campusData?.facilities || [], [campusData]);
  const trafficStatus = campusData?.trafficStatus || '';
  const floodStatus = campusData?.floodStatus || '';
  const lastUpdated = campusData?.lastUpdated || '';
  const isEstimated = campusData?.isEstimated;
  const telemetrySource = campusData?.telemetrySource;

  const originBuilding = useMemo(() => buildings.find(b => b.id === routeFrom), [buildings, routeFrom]);
  const destBuilding = useMemo(() => buildings.find(b => b.id === routeTo), [buildings, routeTo]);

  const routeMetrics = useMemo(() => {
    if (!originBuilding || !destBuilding || routeFrom === routeTo) return null;
    const R = 6371e3;
    const phi1 = originBuilding.location.lat * Math.PI / 180;
    const phi2 = destBuilding.location.lat * Math.PI / 180;
    const dPhi = (destBuilding.location.lat - originBuilding.location.lat) * Math.PI / 180;
    const dLam = (destBuilding.location.lng - originBuilding.location.lng) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLam / 2) * Math.sin(dLam / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDist = R * c;
    const walkDistance = Math.max(40, Math.round(straightDist * 1.35));
    const walkMinutes = Math.max(1, Math.ceil(walkDistance / 75));
    return { walkDistance, walkMinutes };
  }, [originBuilding, destBuilding, routeFrom, routeTo]);

  const filteredBuildings = useMemo(() => {
    let list = buildings;
    if (buildingGateFilter === 'Gate 1') {
      list = list.filter(b => b.nearestGate.includes('Gate 1'));
    } else if (buildingGateFilter === 'Gate 2') {
      list = list.filter(b => b.nearestGate.includes('Gate 2'));
    }

    if (!buildingSearchQuery.trim()) return list;
    const q = buildingSearchQuery.trim().toLowerCase();
    const cleaned = q.replace(/^building\s*/i, '').trim();

    return list.filter(b => 
      b.id.toLowerCase() === q ||
      b.id.toLowerCase() === cleaned ||
      String(b.number) === q ||
      String(b.number) === cleaned ||
      b.romanNumber.toLowerCase() === q ||
      b.romanNumber.toLowerCase() === cleaned ||
      b.name.toLowerCase().includes(q) ||
      b.bhavanName.toLowerCase().includes(q) ||
      b.fullName.toLowerCase().includes(q)
    );
  }, [buildings, buildingSearchQuery, buildingGateFilter]);

  if (isLoading && !state.campusData) {
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
        <button onClick={loadCampus} className="btn-primary mt-4 text-xs">Retry</button>
      </div>
    );
  }

  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-emerald-400';
      case 'MODERATE': return 'text-yellow-400';
      case 'HIGH': return 'text-orange-400';
      case 'VERY HIGH': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Free': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Normal':
      case 'Active': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Busy': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Brainware University</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isEstimated
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {isEstimated ? 'Empirical Schedule Model' : 'Live IoT Telemetry Active'}
              </span>
            </div>
            <p className="text-sm text-gray-400">Barasat, Kolkata • Campus Intelligence & Gate Occupancy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWebhookPanel(!showWebhookPanel)}
            className="text-xs btn-secondary flex items-center gap-1.5 py-1.5 px-3"
          >
            <Radio size={13} className="text-brand-400" />
            IoT Webhook Status
          </button>

          {weather && (
            <div className="glass-card px-4 py-2 flex items-center gap-3 border-brand-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <Cloud className="text-blue-400" size={20} />
              <div>
                <p className="text-sm font-bold text-white">{weather.temperature}°C, {weather.condition}</p>
                <p className="text-[10px] text-gray-400">Rain: {weather.rain || 0} mm • {weather.source}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook & Sensor Ingestion Test Drawer */}
      {showWebhookPanel && (
        <div className="glass-card p-4 border border-brand-500/30 bg-surface-900/90 animate-slide-down space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Campus IoT Sensor Ingestion Protocol</h3>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              Endpoint: /api/campus/telemetry
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Physical gate turnstiles or canteen counters send POST updates with JSON payload <code className="text-brand-300">{`{ facilityId: "g1", occupancy: 42, crowdLevel: "MODERATE" }`}</code>.
            When no hardware sensor is connected, RouteMind AI uses the <strong>Empirical Campus Schedule Model</strong> so you never see blank or dead screens.
          </p>
          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <button
              onClick={handleTestSensorPing}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <CheckCircle size={13} /> Send Test IoT Sensor Ping
            </button>
            {webhookStatus && <span className="text-xs text-cyan-300">{webhookStatus}</span>}
          </div>
        </div>
      )}

      {/* Main Map & Intelligence Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Map */}
          <div className="h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-lg border border-white/10 relative">
            <ErrorBoundary
              fallbackTitle="Campus Map Display Error"
              fallbackMessage="Unable to load the interactive campus map. Click below to reload."
            >
              <CampusMap
                routeFrom={routeFrom}
                routeTo={routeTo}
                onSelectOrigin={(id) => setRouteFrom(id)}
                onSelectDest={(id) => setRouteTo(id)}
                selectedBuildingId={selectedBuildingId}
              />
            </ErrorBoundary>
            <div className="absolute top-4 left-4 z-[400]">
              <div className="glass-card px-3 py-2 bg-surface-900/90 backdrop-blur-md shadow-lg border border-white/10">
                <h3 className="text-xs font-bold text-white mb-1 flex items-center gap-1"><Info size={12} /> Map Legend</h3>
                <div className="flex items-center gap-2 text-[10px] text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Buildings (I–VIII)
                  <span className="w-2 h-2 rounded-full bg-orange-500 ml-2"></span> Gates
                  <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> Canteen/Food
                </div>
              </div>
            </div>
          </div>

          {/* Building Routing */}
          <div className="glass-card p-6 border-brand-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin size={18} className="text-brand-400" /> Building-to-Building Navigation
              </h2>
              <span className="text-[11px] text-gray-400 bg-surface-800/80 px-2.5 py-1 rounded-full border border-white/5">
                8 Bhavans Connected
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
              <div className="flex-1 w-full">
                <label className="text-xs text-gray-400 mb-1 block font-medium">Origin Building</label>
                <select
                  id="building-origin-select"
                  className="w-full bg-surface-800 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  value={routeFrom}
                  onChange={(e) => setRouteFrom(e.target.value)}
                >
                  <option value="">Select Origin Building</option>
                  {buildings.map(b => (
                    <option key={`from-${b.id}`} value={b.id}>
                      {b.fullName} ({b.nearestGate})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                title="Swap Origin and Destination"
                aria-label="Swap Origin and Destination"
                onClick={() => {
                  const prevFrom = routeFrom;
                  setRouteFrom(routeTo);
                  setRouteTo(prevFrom);
                }}
                className="p-2.5 mt-4 rounded-lg bg-surface-800 hover:bg-surface-700 text-gray-400 hover:text-brand-400 border border-white/10 transition-colors self-center"
              >
                <ArrowUpDown size={16} />
              </button>

              <div className="flex-1 w-full">
                <label className="text-xs text-gray-400 mb-1 block font-medium">Destination Building</label>
                <select
                  id="building-dest-select"
                  className="w-full bg-surface-800 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value)}
                >
                  <option value="">Select Destination Building</option>
                  {buildings.map(b => (
                    <option key={`to-${b.id}`} value={b.id}>
                      {b.fullName} ({b.nearestGate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {routeFrom && routeTo && routeFrom !== routeTo && (
              <div className="border border-brand-500/30 bg-brand-500/10 rounded-xl p-4 animate-fade-in space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <h3 className="font-bold text-white text-sm">
                      {originBuilding?.fullName} → {destBuilding?.fullName}
                    </h3>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 font-medium self-start sm:self-auto">
                    Pedestrian Pathway Clear
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-center pt-2 border-t border-brand-500/10">
                  <div className="bg-surface-800/80 p-2.5 rounded-lg border border-white/5">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Est. Distance</p>
                    <p className="text-white font-semibold text-sm">~{routeMetrics?.walkDistance || 150} m</p>
                  </div>
                  <div className="bg-surface-800/80 p-2.5 rounded-lg border border-white/5">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Walking Time</p>
                    <p className="text-white font-semibold text-sm">~{routeMetrics?.walkMinutes || 2} min</p>
                  </div>
                  <div className="bg-surface-800/80 p-2.5 rounded-lg border border-white/5">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Path Condition</p>
                    <p className="text-emerald-400 font-semibold text-xs">Paved & Lighted</p>
                  </div>
                  <div className="bg-surface-800/80 p-2.5 rounded-lg border border-white/5">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Hydrology</p>
                    <p className="text-cyan-400 font-semibold text-xs">{destBuilding?.waterloggingStatus || 'Clear'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Campus Buildings Directory & Quick Search */}
          <div className="glass-card p-6 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 size={18} className="text-brand-400" /> Campus Directory (Buildings I – VIII)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Verified campus bhavans with exact numbers, real-time occupancy, and gate access
                </p>
              </div>

              {/* Gate Filter Pills */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-surface-900/80 p-1 rounded-lg border border-white/5 text-xs">
                <button
                  type="button"
                  onClick={() => setBuildingGateFilter('ALL')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    buildingGateFilter === 'ALL'
                      ? 'bg-brand-600 text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All (8)
                </button>
                <button
                  type="button"
                  onClick={() => setBuildingGateFilter('Gate 1')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    buildingGateFilter === 'Gate 1'
                      ? 'bg-brand-600 text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Gate 1 Zone
                </button>
                <button
                  type="button"
                  onClick={() => setBuildingGateFilter('Gate 2')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    buildingGateFilter === 'Gate 2'
                      ? 'bg-brand-600 text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Gate 2 Zone
                </button>
              </div>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="building-search-input"
                type="text"
                value={buildingSearchQuery}
                onChange={(e) => setBuildingSearchQuery(e.target.value)}
                placeholder="Search building by Roman numeral (e.g. 'III'), number ('3'), or name ('Prafulla')..."
                className="w-full bg-surface-900 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
              {buildingSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBuildingSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Building Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {filteredBuildings.length === 0 ? (
                <div className="col-span-full py-8 text-center text-gray-500 bg-surface-900/40 rounded-xl border border-dashed border-white/10">
                  <p className="text-sm">No campus building matched "{buildingSearchQuery}".</p>
                  <p className="text-xs text-gray-600 mt-1">Try searching by Roman numeral (I–VIII) or Bhavan name.</p>
                </div>
              ) : (
                filteredBuildings.map(b => {
                  const isSelected = selectedBuildingId === b.id;
                  const isOrigin = routeFrom === b.id;
                  const isDest = routeTo === b.id;

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBuildingId(b.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-brand-950/40 border-brand-500 shadow-md shadow-brand-500/10'
                          : 'bg-surface-800/60 hover:bg-surface-800 border-white/5 hover:border-brand-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-brand-600 text-white tracking-wide shadow-sm">
                            Building {b.romanNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-400">
                            (No. {b.number})
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          b.crowdLevel === 'LOW'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                        }`}>
                          {b.crowdLevel} ({b.occupancy}%)
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm mb-1 group-hover:text-brand-300 transition-colors">
                        {b.bhavanName}
                      </h3>
                      <p className="text-[11px] text-gray-400 mb-3">
                        {b.fullName}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                        <span className="text-cyan-300 font-medium flex items-center gap-1">
                          <Navigation size={11} className="text-brand-400" /> {b.nearestGate}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBuildingId(b.id);
                            }}
                            title="Focus on Map"
                            className="text-[10px] px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-gray-300 transition-colors flex items-center gap-1"
                          >
                            <Crosshair size={10} /> Focus
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteFrom(b.id);
                            }}
                            className={`text-[10px] px-2 py-1 rounded transition-colors font-medium ${
                              isOrigin
                                ? 'bg-emerald-600 text-white'
                                : 'bg-brand-600/80 hover:bg-brand-600 text-white'
                            }`}
                          >
                            {isOrigin ? '✓ Origin' : 'From'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteTo(b.id);
                            }}
                            className={`text-[10px] px-2 py-1 rounded transition-colors font-medium ${
                              isDest
                                ? 'bg-cyan-600 text-white'
                                : 'bg-surface-700 hover:bg-surface-600 text-gray-200'
                            }`}
                          >
                            {isDest ? '✓ Dest' : 'To'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Intelligence */}
        <div className="space-y-6">
          {/* Dashboard Summary */}
          <div className="glass-card p-5 border-white/5">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h2 className="text-md font-bold text-white">Live Overview Status</h2>
              <button onClick={loadCampus} title="Refresh live status" className="text-gray-400 hover:text-white transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Campus Traffic:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {trafficStatus}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Campus Flood Risk:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {floodStatus}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Telemetry Source:</span>
                <span className="text-[11px] text-cyan-300 font-medium">{telemetrySource}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-white/5">
                <span>Last Updated:</span>
                <span>{new Date(lastUpdated).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Gates */}
          <div className="glass-card p-5 border-white/5">
            <h2 className="text-md font-bold text-white mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
              <Navigation size={16} className="text-brand-400" /> Gate Intelligence
            </h2>
            <div className="space-y-3">
              {facilities.filter(f => f.type === 'gate').map(gate => (
                <div key={gate.id} className="bg-surface-800/50 p-3.5 rounded-lg border border-white/5 text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-xs">{gate.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(gate.status)}`}>
                      {gate.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500 block">Crowd Level:</span>
                      <span className={`font-semibold ${getCrowdColor(gate.crowdLevel)}`}>
                        {gate.crowdLevel} {gate.occupancy ? `(${gate.occupancy}%)` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Wait Time:</span>
                      <span className="text-gray-200 font-medium">{gate.queueCondition}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-gray-500 pt-1 border-t border-white/5">
                    <span>Rush: {gate.usuallyBusy}</span>
                    <span className="text-cyan-400/80">{gate.source.includes('IoT') ? '● Live Sensor' : 'Est. Model'}</span>
                  </div>

                  {/* Connected Campus Buildings */}
                  <div className="pt-2 border-t border-white/5 text-[10px]">
                    <span className="text-gray-400 block mb-1 font-medium">Direct Building Access:</span>
                    <div className="flex flex-wrap gap-1">
                      {gate.id === 'g1' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('I')}
                            className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20 transition-colors"
                          >
                            Bldg I: Satyajit
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('IV')}
                            className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20 transition-colors"
                          >
                            Bldg IV: Jagadish
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('V')}
                            className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20 transition-colors"
                          >
                            Bldg V: Rabindra
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('VIII')}
                            className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20 transition-colors"
                          >
                            Bldg VIII: Satyendra
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('II')}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20 transition-colors"
                          >
                            Bldg II: Vidyasagar
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('III')}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20 transition-colors"
                          >
                            Bldg III: Prafulla
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('VI')}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20 transition-colors"
                          >
                            Bldg VI: Rammohan
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBuildingId('VII')}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20 transition-colors"
                          >
                            Bldg VII: Aurobindo
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canteen & Food */}
          <div className="glass-card p-5 border-white/5">
            <h2 className="text-md font-bold text-white mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
              <Users size={16} className="text-brand-400" /> Canteen & Food Court
            </h2>
            <div className="space-y-3">
              {facilities.filter(f => f.type === 'canteen' || f.type === 'food_court').map(facility => (
                <div key={facility.id} className="bg-surface-800/50 p-3.5 rounded-lg border border-white/5 text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-xs">{facility.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(facility.status)}`}>
                      {facility.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500 block">Rush Level:</span>
                      <span className={`font-semibold ${getCrowdColor(facility.crowdLevel)}`}>
                        {facility.crowdLevel} {facility.occupancy ? `(${facility.occupancy}%)` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Order Queue:</span>
                      <span className="text-gray-200 font-medium">{facility.queueCondition}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-gray-500 pt-1 border-t border-white/5">
                    <span>Peak: {facility.usuallyBusy}</span>
                    <span className="text-cyan-400/80">{facility.source.includes('IoT') ? '● Live Sensor' : 'Est. Model'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgraded Grounded Brainware AI Assistant */}
          <div className="glass-card border border-brand-500/30 rounded-xl p-4 flex flex-col h-80 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                  <Bot size={14} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Brainware AI</h3>
                  <p className="text-[10px] text-gray-400">Ask about verified live campus data</p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Grounded</span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto scroll-area space-y-2 pr-1 mb-2">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-1.5 text-xs ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-surface-700 text-brand-300'
                  }`}>
                    {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                  </div>
                  <div className={`p-2 rounded-lg max-w-[85%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-600/30 border border-brand-500/30 text-white'
                      : 'bg-surface-800 border border-white/5 text-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-[8px] text-gray-500 block text-right mt-1">{msg.time}</span>
                  </div>
                </div>
              ))}

              {isChatTyping && (
                <div className="flex items-center gap-1 text-[11px] text-brand-400 italic pl-6">
                  <span>Brainware AI is analyzing live verified context...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-1.5 scroll-area">
              {SUGGESTED_CAMPUS_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendChat(prompt)}
                  className="text-[10px] whitespace-nowrap bg-surface-800 hover:bg-surface-700 border border-white/10 text-gray-300 px-2 py-0.5 rounded transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask about gate crowds, canteen rush, weather..."
                className="flex-1 bg-surface-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={!chatInput.trim() || isChatTyping}
                className="btn-primary p-2 text-xs"
                aria-label="Send message"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
