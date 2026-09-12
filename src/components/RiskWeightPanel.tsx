import React from 'react';
import { Sliders } from 'lucide-react';
import { useApp } from '../context';
import type { RiskWeights } from '../types';

interface WeightSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}

function WeightSlider({ label, value, onChange, color }: WeightSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-bold text-white">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(value * 100)}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer`}
        style={{
          background: `linear-gradient(to right, ${color} ${value * 100}%, rgba(255,255,255,0.1) ${value * 100}%)`
        }}
        aria-label={`${label} weight`}
      />
    </div>
  );
}

export function RiskWeightPanel() {
  const { state, dispatch } = useApp();
  const w = state.riskWeights;

  const update = (key: keyof RiskWeights, val: number) => {
    dispatch({ type: 'SET_RISK_WEIGHTS', payload: { ...w, [key]: val } });
  };

  const total = w.distance + w.time + w.safety + w.floodRisk + w.traffic;

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sliders size={14} className="text-brand-400" />
        <span className="text-sm font-semibold text-white">AI Route Scoring Weights</span>
      </div>
      <p className="text-xs text-gray-500">
        Adjust these weights to control how the AI ranks routes. Higher weight = more importance in scoring.
      </p>

      <div className="space-y-3">
        <WeightSlider label="Distance" value={w.distance} onChange={(v) => update('distance', v)} color="#22c55e" />
        <WeightSlider label="Travel Time" value={w.time} onChange={(v) => update('time', v)} color="#3b82f6" />
        <WeightSlider label="Safety Score" value={w.safety} onChange={(v) => update('safety', v)} color="#a855f7" />
        <WeightSlider label="Flood Risk Avoidance" value={w.floodRisk} onChange={(v) => update('floodRisk', v)} color="#06b6d4" />
        <WeightSlider label="Traffic" value={w.traffic} onChange={(v) => update('traffic', v)} color="#f97316" />
      </div>

      {Math.abs(total - 1) > 0.01 && (
        <p className="text-[11px] text-amber-400">
          Total weight: {Math.round(total * 100)}%. The AI normalizes weights automatically.
        </p>
      )}

      <button
        onClick={() => dispatch({
          type: 'SET_RISK_WEIGHTS',
          payload: { distance: 0.2, time: 0.25, safety: 0.35, floodRisk: 0.15, traffic: 0.05 }
        })}
        className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
      >
        Reset to defaults
      </button>
    </div>
  );
}
