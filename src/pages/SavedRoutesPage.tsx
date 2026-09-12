import React from 'react';
import { MapPin, Trash2, Navigation, RefreshCw, Clock, AlertTriangle, Bookmark } from 'lucide-react';
import { useApp } from '../context';
import { formatDistance, formatDuration } from '../services';

export function SavedRoutesPage() {
  const { state, dispatch } = useApp();

  const handleDelete = (id: string) => {
    dispatch({ type: 'REMOVE_SAVED_ROUTE', payload: id });
  };

  const handleNavigate = (saved: (typeof state.savedRoutes)[0]) => {
    dispatch({ type: 'SET_ORIGIN_INPUT', payload: saved.origin.name });
    dispatch({ type: 'SET_ORIGIN_PLACE', payload: saved.origin });
    dispatch({ type: 'SET_DESTINATION_INPUT', payload: saved.destination.name });
    dispatch({ type: 'SET_DESTINATION_PLACE', payload: saved.destination });
    dispatch({ type: 'SET_TRAVEL_MODE', payload: saved.travelMode });
    dispatch({ type: 'SET_ROUTE_PREFERENCE', payload: saved.preference });
    dispatch({ type: 'SET_PAGE', payload: 'dashboard' });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
          <Bookmark size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Saved Routes</h1>
          <p className="text-sm text-gray-500">{state.savedRoutes.length} saved route{state.savedRoutes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {state.savedRoutes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bookmark size={40} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No saved routes yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Plan a route on the dashboard and click "Save This Route" to store your frequently used routes here.
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', payload: 'dashboard' })}
            className="btn-primary mt-4 mx-auto"
          >
            <Navigation size={14} /> Plan a Route
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.savedRoutes.map((saved) => (
            <div key={saved.id} className="glass-card p-5 space-y-4 hover:border-white/10 transition-all duration-200">
              {/* Name */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-white">{saved.name}</h3>
                <button
                  onClick={() => handleDelete(saved.id)}
                  className="btn-ghost p-1.5 text-gray-600 hover:text-red-400"
                  title="Delete saved route"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Route */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                  <span className="truncate">{saved.origin.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  <span className="truncate">{saved.destination.name}</span>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                <div>Mode: <span className="text-gray-400 capitalize">{saved.travelMode}</span></div>
                <div>Preference: <span className="text-gray-400 capitalize">{saved.preference}</span></div>
                <div className="flex items-center gap-1">
                  <Clock size={9} />
                  {new Date(saved.savedAt).toLocaleDateString()}
                </div>
                {saved.riskSnapshot && (
                  <div>
                    Risk Score: <span className={`font-semibold ${
                      saved.riskSnapshot.overall < 30 ? 'text-emerald-400' :
                      saved.riskSnapshot.overall < 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{saved.riskSnapshot.overall}/100</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleNavigate(saved)}
                  className="btn-primary flex-1 justify-center text-xs py-2"
                >
                  <Navigation size={12} /> Navigate
                </button>
                <button
                  onClick={() => handleNavigate(saved)}
                  className="btn-secondary justify-center text-xs py-2 px-3"
                  title="Recalculate route"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
