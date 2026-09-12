import React, { useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { useApp } from '../context';
import { generateId } from '../services';

interface SaveRouteModalProps {
  onClose: () => void;
}

export function SaveRouteModal({ onClose }: SaveRouteModalProps) {
  const { state, dispatch } = useApp();
  const [name, setName] = useState('');

  const rc = state.routeComparison;
  const origin = state.originPlace;
  const destination = state.destinationPlace;

  if (!rc || !origin || !destination) return null;

  const defaultName = `${origin.name} → ${destination.name}`;

  const handleSave = () => {
    dispatch({
      type: 'ADD_SAVED_ROUTE',
      payload: {
        id: generateId(),
        name: name.trim() || defaultName,
        origin,
        destination,
        travelMode: state.travelMode,
        preference: state.routePreference,
        savedAt: new Date().toISOString(),
        riskSnapshot: rc.recommended?.riskBreakdown,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-brand-400" />
            <h2 className="text-base font-bold text-white">Save Route</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label mb-1.5 block">Route Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              className="input-field"
              autoFocus
            />
          </div>

          <div className="p-3 bg-surface-600/30 rounded-lg border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              {origin.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              {destination.name}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Mode: {state.travelMode} · Preference: {state.routePreference}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">
            <Bookmark size={14} /> Save Route
          </button>
        </div>
      </div>
    </div>
  );
}
