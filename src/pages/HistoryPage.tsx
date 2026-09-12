import React from 'react';
import { History, Trash2, Navigation, Clock, MapPin, Shield, Car } from 'lucide-react';
import { useApp } from '../context';
import { formatDistance, formatDuration } from '../services';
import type { RouteHistoryEntry } from '../types';

const routeTypeColors: Record<string, string> = {
  shortest: 'text-emerald-400',
  fastest: 'text-blue-400',
  safest: 'text-purple-400',
  recommended: 'text-amber-400',
};

export function HistoryPage() {
  const { state, dispatch } = useApp();

  const handleNavigate = (entry: RouteHistoryEntry) => {
    dispatch({ type: 'SET_ORIGIN_INPUT', payload: entry.origin.name });
    dispatch({ type: 'SET_ORIGIN_PLACE', payload: entry.origin });
    dispatch({ type: 'SET_DESTINATION_INPUT', payload: entry.destination.name });
    dispatch({ type: 'SET_DESTINATION_PLACE', payload: entry.destination });
    dispatch({ type: 'SET_TRAVEL_MODE', payload: entry.travelMode });
    dispatch({ type: 'SET_ROUTE_PREFERENCE', payload: entry.preference });
    dispatch({ type: 'SET_PAGE', payload: 'dashboard' });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
            <History size={20} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Route History</h1>
            <p className="text-sm text-gray-500">
              {state.routeHistory.length} trip{state.routeHistory.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>
        {state.routeHistory.length > 0 && (
          <button
            onClick={() => dispatch({ type: 'CLEAR_HISTORY' })}
            className="btn-ghost text-xs text-red-400 hover:text-red-300"
          >
            <Trash2 size={13} /> Clear History
          </button>
        )}
      </div>

      {state.routeHistory.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <History size={40} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No route history yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Your planned routes will appear here automatically. Routes are stored locally on your device.
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', payload: 'dashboard' })}
            className="btn-primary mt-4 mx-auto"
          >
            <Navigation size={14} /> Plan a Route
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {state.routeHistory.map((entry) => (
            <div
              key={entry.id}
              className="glass-card p-4 flex items-center gap-4 hover:border-white/10 transition-all duration-200"
            >
              {/* Date column */}
              <div className="text-center shrink-0 w-14">
                <p className="text-xs font-bold text-white">
                  {new Date(entry.date).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
                </p>
                <p className="text-[10px] text-gray-500">
                  {new Date(entry.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-12 bg-white/5 shrink-0" />

              {/* Route info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                  <span className="text-xs text-gray-300 truncate">{entry.origin.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="text-xs text-gray-300 truncate">{entry.destination.name}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">{formatDistance(entry.distance)}</p>
                  <p className="text-[10px] text-gray-500">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">{formatDuration(entry.duration)}</p>
                  <p className="text-[10px] text-gray-500">Time</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs font-semibold capitalize ${routeTypeColors[entry.selectedRoute] || 'text-gray-400'}`}>
                    {entry.selectedRoute}
                  </p>
                  <p className="text-[10px] text-gray-500">Route</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs font-semibold ${
                    entry.riskScore < 30 ? 'text-emerald-400' :
                    entry.riskScore < 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{entry.riskScore}/100</p>
                  <p className="text-[10px] text-gray-500">Risk</p>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => handleNavigate(entry)}
                className="btn-ghost p-2 shrink-0"
                title="Recalculate this route"
              >
                <Navigation size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
