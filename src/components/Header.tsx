import React, { useState, useRef, useEffect } from 'react';
import {
  Search, MapPin, Bell, Wifi, WifiOff, Menu,
  ChevronDown, X, Route
} from 'lucide-react';
import { useApp } from '../context';
import { geocodePlace } from '../services';
import type { Place, PageId } from '../types';

export function Header() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = state.notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchResults([]);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 3) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const results = await geocodePlace(q);
      setSearchResults(results.slice(0, 4));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (place: Place) => {
    dispatch({ type: 'SET_SEARCHED_PLACE', payload: place });
    dispatch({ type: 'SET_PAGE', payload: 'map' as PageId });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    planner: 'Route Planner',
    map: 'Live Map',
    'road-intelligence': 'Road Intelligence',
    'flood-risk': 'Flood Risk',
    weather: 'Weather Intelligence',
    'saved-routes': 'Saved Routes',
    history: 'Route History',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  return (
    <header className="h-16 bg-surface-800/90 backdrop-blur-md border-b border-white/5 flex items-center px-4 gap-3 z-30 relative">
      {/* Hamburger */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="lg:hidden btn-ghost p-2"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Brand (mobile) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
          <Route size={14} className="text-white" />
        </div>
        <span className="text-sm font-bold text-white">RouteMind AI</span>
      </div>

      {/* Page title (desktop) */}
      <div className="hidden lg:block">
        <h1 className="text-base font-semibold text-white">{pageTitles[state.activePage] || 'RouteMind AI'}</h1>
        <p className="text-[11px] text-gray-500">Global Route Intelligence & Road Safety Platform</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global search */}
      <div ref={searchRef} className="relative hidden sm:block">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            placeholder="Search locations..."
            className="bg-surface-600/50 border border-white/10 text-white placeholder-gray-500 text-sm rounded-lg pl-8 pr-4 py-2 w-52 focus:outline-none focus:border-brand-500 focus:w-72 transition-all duration-300"
            aria-label="Global location search"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="spinner" />
            </div>
          )}
        </div>

        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full right-0 mt-2 w-80 glass-card shadow-2xl overflow-hidden z-50 animate-fade-in">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectResult(r)}
                className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-start gap-3 border-b border-white/5 last:border-0 transition-colors"
              >
                <MapPin size={14} className="text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">{r.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{r.displayName}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1">
        {/* Connection status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-600/50 rounded-lg border border-white/5">
          {state.demoMode ? (
            <WifiOff size={12} className="text-amber-400" />
          ) : (
            <Wifi size={12} className="text-emerald-400" />
          )}
          <span className={`text-[11px] font-medium ${state.demoMode ? 'text-amber-400' : 'text-emerald-400'}`}>
            {state.demoMode ? 'Demo' : 'Live'}
          </span>
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative btn-ghost p-2"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 glass-card shadow-2xl overflow-hidden z-50 animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  {state.demoMode && <span className="demo-badge">Demo</span>}
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}
                    className="text-[11px] text-gray-400 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto scroll-area">
                {state.notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  state.notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id })}
                      className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 transition-colors hover:bg-white/5 ${!n.isRead ? 'bg-brand-600/5' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          n.severity === 'danger' ? 'bg-red-400' :
                          n.severity === 'warning' ? 'bg-amber-400' :
                          n.severity === 'success' ? 'bg-emerald-400' : 'bg-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-gray-600 mt-1">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {n.isDemo && <span className="demo-badge shrink-0">Demo</span>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Demo mode toggle */}
        <button
          onClick={() => dispatch({ type: 'SET_DEMO_MODE', payload: !state.demoMode })}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
            state.demoMode
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
          aria-label="Toggle demo/live mode"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${state.demoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {state.demoMode ? 'Demo Mode' : 'Live Mode'}
          <ChevronDown size={10} />
        </button>
      </div>
    </header>
  );
}
