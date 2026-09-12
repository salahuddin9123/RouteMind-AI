import React from 'react';
import {
  LayoutDashboard, Map, Navigation, Shield, Droplets,
  Cloud, Bookmark, History, BarChart3, Settings,
  X, Route, Zap, Building2
} from 'lucide-react';
import { useApp } from '../context';
import type { PageId } from '../types';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'planner', label: 'Route Planner', icon: <Navigation size={18} /> },
  { id: 'map', label: 'Live Map', icon: <Map size={18} /> },
  { id: 'road-intelligence', label: 'Road Intelligence', icon: <Shield size={18} /> },
  { id: 'campus', label: 'Brainware University', icon: <Building2 size={18} />, badge: 'LIVE' },
  { id: 'flood-risk', label: 'Flood Risk', icon: <Droplets size={18} /> },
  { id: 'weather', label: 'Weather', icon: <Cloud size={18} /> },
  { id: 'saved-routes', label: 'Saved Routes', icon: <Bookmark size={18} /> },
  { id: 'history', label: 'Route History', icon: <History size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

export function Sidebar() {
  const { state, dispatch } = useApp();

  const navigate = (page: PageId) => {
    dispatch({ type: 'SET_PAGE', payload: page });
    dispatch({ type: 'SET_SIDEBAR', payload: false });
  };

  return (
    <>
      {/* Mobile overlay */}
      {state.sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => dispatch({ type: 'SET_SIDEBAR', payload: false })}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-surface-800 border-r border-white/5 z-50
          flex flex-col transition-transform duration-300 ease-in-out
          ${state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Route size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">RouteMind</div>
              <div className="flex items-center gap-1">
                <Zap size={9} className="text-brand-400" />
                <span className="text-[9px] font-semibold text-brand-400 uppercase tracking-widest">AI</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_SIDEBAR', payload: false })}
            className="lg:hidden btn-ghost p-1.5"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Demo badge */}
        {state.demoMode && (
          <div className="mx-4 mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Demo Mode Active</span>
            </div>
            <p className="text-[9px] text-amber-400/70 mt-0.5">Not live data</p>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scroll-area">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full text-left ${state.activePage === item.id ? 'nav-item-active' : 'nav-item'}`}
              aria-current={state.activePage === item.id ? 'page' : undefined}
            >
              <span className={state.activePage === item.id ? 'text-brand-400' : 'text-gray-500'}>
                {item.icon}
              </span>
              {item.label}
              {item.badge && (
                <span className="ml-auto text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="text-[10px] text-gray-600 text-center leading-relaxed">
            <p className="font-semibold text-gray-500">RouteMind AI v1.0</p>
            <p>Global Route Intelligence Platform</p>
            <p className="mt-1">Map data © OpenStreetMap</p>
          </div>
        </div>
      </aside>
    </>
  );
}
