import React, { useState } from 'react';
import { GitBranch, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { useApp } from '../context';
import { formatDistance, formatDuration } from '../services';
import type { WhatIfCondition, WhatIfScenario } from '../types';

const conditions: { id: WhatIfCondition; label: string; desc: string }[] = [
  { id: 'avoid_high_risk', label: 'Avoid High-Risk Roads', desc: 'Recalculate excluding high and critical risk segments' },
  { id: 'avoid_tolls', label: 'Avoid Toll Roads', desc: 'Find routes without toll roads' },
  { id: 'avoid_highways', label: 'Avoid Highways', desc: 'Use local roads only' },
  { id: 'heavy_rain', label: 'Simulate Heavy Rain', desc: 'Recalculate with increased flood and visibility risk' },
  { id: 'road_closure', label: 'Simulate Road Closure', desc: 'Reroute assuming a major road is closed' },
  { id: 'increased_traffic', label: 'Simulate Heavy Traffic', desc: 'Recalculate with significantly increased travel times' },
];

export function WhatIfPanel() {
  const { state, dispatch } = useApp();
  const [selected, setSelected] = useState<WhatIfCondition | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const rc = state.routeComparison;
  if (!rc?.recommended) return null;

  const runAnalysis = async () => {
    if (!selected || !rc.recommended) return;
    setIsRunning(true);

    await new Promise((r) => setTimeout(r, 600));

    const base = rc.recommended;
    const scenario = conditions.find((c) => c.id === selected)!;

    let distMult = 1.0;
    let timeMult = 1.0;
    let riskMult = 1.0;
    let explanation = '';

    switch (selected) {
      case 'avoid_high_risk':
        distMult = 1.12; timeMult = 1.14; riskMult = 0.6;
        explanation = 'Avoiding high-risk road segments adds distance but reduces estimated risk by ~40%.';
        break;
      case 'avoid_tolls':
        distMult = 1.08; timeMult = 1.1; riskMult = 0.95;
        explanation = 'Toll-free routes are slightly longer but maintain a similar risk profile.';
        break;
      case 'avoid_highways':
        distMult = 1.15; timeMult = 1.35; riskMult = 0.9;
        explanation = 'Local roads significantly increase travel time but may reduce high-speed risk.';
        break;
      case 'heavy_rain':
        distMult = 1.0; timeMult = 1.3; riskMult = 1.55;
        explanation = 'Under simulated heavy rain, risk score increases substantially due to flood and visibility factors.';
        break;
      case 'road_closure':
        distMult = 1.18; timeMult = 1.25; riskMult = 0.85;
        explanation = 'A simulated major road closure requires a detour adding distance and time.';
        break;
      case 'increased_traffic':
        distMult = 1.02; timeMult = 1.45; riskMult = 1.2;
        explanation = 'Heavy traffic substantially increases travel time without significantly changing distance.';
        break;
    }

    const original = {
      distance: base.distance,
      duration: base.duration,
      riskScore: base.riskBreakdown.overall,
    };
    const alternative = {
      distance: Math.round(base.distance * distMult),
      duration: Math.round(base.duration * timeMult),
      riskScore: Math.min(100, Math.round(base.riskBreakdown.overall * riskMult)),
    };

    dispatch({
      type: 'SET_WHATIF_RESULT',
      payload: {
        original,
        alternative,
        difference: {
          distance: alternative.distance - original.distance,
          duration: alternative.duration - original.duration,
          riskScore: alternative.riskScore - original.riskScore,
        },
        explanation: explanation + ' [Demo simulation — not based on live data]',
        isDemo: true,
      },
    });

    setIsRunning(false);
  };

  const result = state.whatIfResult;

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch size={14} className="text-purple-400" />
        <span className="text-sm font-semibold text-white">What-If Analysis</span>
        <span className="demo-badge">Demo</span>
      </div>
      <p className="text-xs text-gray-500">
        Simulate different conditions to see how your route changes.
      </p>

      {/* Condition selector */}
      <div className="space-y-1.5">
        {conditions.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelected(c.id); dispatch({ type: 'SET_WHATIF_RESULT', payload: null }); }}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selected === c.id
                ? 'bg-purple-600/20 border-purple-500/40 text-white'
                : 'bg-surface-600/30 border-white/5 text-gray-400 hover:text-white hover:bg-surface-600/50'
            }`}
          >
            <p className="text-xs font-semibold">{c.label}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{c.desc}</p>
          </button>
        ))}
      </div>

      <button
        onClick={runAnalysis}
        disabled={!selected || isRunning}
        className="btn-primary w-full justify-center text-sm disabled:opacity-50"
      >
        {isRunning ? (
          <span className="flex items-center gap-2"><div className="spinner" /> Running analysis...</span>
        ) : (
          <><TrendingUp size={14} /> Run What-If Analysis</>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className="space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface-600/50 rounded-lg border border-white/5">
              <p className="text-[10px] text-gray-400 mb-2 font-semibold uppercase tracking-wider">Original Route</p>
              <p className="text-sm font-bold text-white">{formatDistance(result.original.distance)}</p>
              <p className="text-xs text-gray-400">{formatDuration(result.original.duration)}</p>
              <p className="text-xs text-gray-400">Risk: {result.original.riskScore}/100</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-[10px] text-purple-400 mb-2 font-semibold uppercase tracking-wider">Alternative Route</p>
              <p className="text-sm font-bold text-white">{formatDistance(result.alternative.distance)}</p>
              <p className="text-xs text-gray-400">{formatDuration(result.alternative.duration)}</p>
              <p className="text-xs text-gray-400">Risk: {result.alternative.riskScore}/100</p>
            </div>
          </div>

          {/* Difference */}
          <div className="p-3 bg-surface-600/30 rounded-lg border border-white/5">
            <p className="text-[10px] text-gray-400 mb-2 font-semibold uppercase tracking-wider">Difference</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className={`text-sm font-bold ${result.difference.distance > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {result.difference.distance >= 0 ? '+' : ''}{formatDistance(result.difference.distance)}
                </p>
                <p className="text-[10px] text-gray-500">Distance</p>
              </div>
              <div>
                <p className={`text-sm font-bold ${result.difference.duration > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {result.difference.duration >= 0 ? '+' : ''}{formatDuration(Math.abs(result.difference.duration))}
                </p>
                <p className="text-[10px] text-gray-500">Time</p>
              </div>
              <div>
                <p className={`text-sm font-bold ${result.difference.riskScore > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {result.difference.riskScore >= 0 ? '+' : ''}{result.difference.riskScore}
                </p>
                <p className="text-[10px] text-gray-500">Risk</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
            <p className="text-xs text-gray-300 leading-relaxed">{result.explanation.split('[Demo')[0]}</p>
            {result.isDemo && (
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle size={10} className="text-amber-400" />
                <span className="text-[10px] text-amber-400/70">Demo simulation — not based on live data</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
