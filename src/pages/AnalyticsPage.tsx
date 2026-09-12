import React from 'react';
import {
  BarChart3, TrendingUp, Clock, MapPin, Shield,
  Route, Navigation
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useApp } from '../context';
import { computeAnalytics } from '../services';

const COLORS = {
  shortest: '#22c55e',
  fastest: '#3b82f6',
  safest: '#a855f7',
  recommended: '#f59e0b',
};

export function AnalyticsPage() {
  const { state } = useApp();

  const analytics = computeAnalytics(state.routeHistory);

  // Build chart data from history
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const dateStr = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    const dayTrips = state.routeHistory.filter((h) => {
      const hDate = new Date(h.date);
      return hDate.toDateString() === date.toDateString();
    });
    return {
      date: dateStr,
      trips: dayTrips.length,
      avgRisk: dayTrips.length
        ? Math.round(dayTrips.reduce((a, h) => a + h.riskScore, 0) / dayTrips.length)
        : 0,
    };
  });

  const routeTypePie = Object.entries(
    state.routeHistory.reduce((acc, h) => {
      acc[h.selectedRoute] = (acc[h.selectedRoute] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const statCards = [
    {
      label: 'Total Trips',
      value: analytics.totalTrips,
      suffix: '',
      icon: <Navigation size={18} />,
      color: 'brand',
    },
    {
      label: 'Time Saved',
      value: analytics.totalTimeSaved,
      suffix: ' min',
      icon: <Clock size={18} />,
      color: 'blue',
    },
    {
      label: 'Distance Saved',
      value: analytics.totalDistanceSaved.toFixed(1),
      suffix: ' km',
      icon: <MapPin size={18} />,
      color: 'green',
    },
    {
      label: 'High-Risk Roads Avoided',
      value: analytics.highRiskRoadsAvoided,
      suffix: '',
      icon: <Shield size={18} />,
      color: 'purple',
    },
    {
      label: 'Optimized Trips',
      value: analytics.optimizedTrips,
      suffix: '',
      icon: <TrendingUp size={18} />,
      color: 'amber',
    },
    {
      label: 'Avg Risk Score',
      value: analytics.avgRiskScore,
      suffix: '/100',
      icon: <BarChart3 size={18} />,
      color: analytics.avgRiskScore < 40 ? 'green' : analytics.avgRiskScore < 70 ? 'amber' : 'red',
    },
  ];

  const colorMap: Record<string, string> = {
    brand: 'text-brand-400 bg-brand-600/20 border-brand-500/20',
    blue: 'text-blue-400 bg-blue-600/20 border-blue-500/20',
    green: 'text-emerald-400 bg-emerald-600/20 border-emerald-500/20',
    purple: 'text-purple-400 bg-purple-600/20 border-purple-500/20',
    amber: 'text-amber-400 bg-amber-600/20 border-amber-500/20',
    red: 'text-red-400 bg-red-600/20 border-red-500/20',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
          <BarChart3 size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Route Analytics</h1>
          <p className="text-sm text-gray-500">Efficiency metrics computed from your route history</p>
        </div>
      </div>

      {analytics.totalTrips === 0 ? (
        <div className="glass-card p-12 text-center">
          <BarChart3 size={40} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No analytics data yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Plan routes to start building your analytics dashboard. Metrics are calculated from your actual route history.
          </p>
          <button
            onClick={() => {}}
            className="btn-primary mt-4 mx-auto"
          >
            Plan a Route
          </button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className={`glass-card p-4 border ${colorMap[card.color].split(' ')[2]}`}>
                <div className={`w-8 h-8 rounded-lg border mb-2 flex items-center justify-center ${colorMap[card.color]}`}>
                  {card.icon}
                </div>
                <p className="text-xl font-bold text-white">{card.value}{card.suffix}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trips per day */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Trips Over Last 14 Days</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={last14Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,22,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="trips"
                    stroke="#6366f1"
                    fill="rgba(99,102,241,0.15)"
                    strokeWidth={2}
                    name="Trips"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Route type breakdown */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Route Type Usage</h3>
              {routeTypePie.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={routeTypePie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {routeTypePie.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'rgba(15,22,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 12 }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11, textTransform: 'capitalize' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                  No route data yet
                </div>
              )}
            </div>

            {/* Risk trend */}
            <div className="glass-card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-4">Average Risk Score Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={last14Days.filter((d) => d.avgRisk > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,22,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgRisk"
                    stroke="#f97316"
                    fill="rgba(249,115,22,0.1)"
                    strokeWidth={2}
                    name="Avg Risk Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[11px] text-gray-600 text-center">
            Analytics are computed from locally stored route history. Time and distance savings are estimated based on route type selection patterns.
          </p>
        </>
      )}
    </div>
  );
}
