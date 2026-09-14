import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MapPin, Navigation, CornerDownLeft, Locate, Car, PersonStanding,
  Bike, Bus, ChevronDown, Search, AlertTriangle, Loader2
} from 'lucide-react';
import { useApp } from '../context';
import { geocodePlace, reverseGeocode } from '../services';
import type { Place, TravelMode, RoutePreference } from '../types';

interface LocationInputProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (place: Place) => void;
  icon: React.ReactNode;
  label: string;
}

function LocationInput({ id, placeholder, value, onChange, onSelect, icon, label }: LocationInputProps) {
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const places = await geocodePlace(val.trim());
        setResults(places.slice(0, 5));
        if (places.length > 0) {
          setShowDropdown(true);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelect = (place: Place) => {
    onChange(place.name);
    onSelect(place);
    setShowDropdown(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onClick={() => results.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input-field pl-10 pr-8"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 size={14} className="text-brand-400 animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1.5 shadow-2xl overflow-hidden animate-fade-in max-h-72 overflow-y-auto scroll-area border border-white/15 rounded-xl bg-[#151926] shadow-black/80">
          {results.map((place, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(place);
              }}
              className="w-full text-left px-4 py-3 hover:bg-brand-600/20 flex items-start gap-3 border-b border-white/5 last:border-0 transition-colors cursor-pointer group"
            >
              <MapPin size={14} className="text-brand-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-medium truncate group-hover:text-brand-300 transition-colors">{place.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{place.displayName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const travelModes: { id: TravelMode; label: string; icon: React.ReactNode }[] = [
  { id: 'driving', label: 'Drive', icon: <Car size={15} /> },
  { id: 'walking', label: 'Walk', icon: <PersonStanding size={15} /> },
  { id: 'cycling', label: 'Cycle', icon: <Bike size={15} /> },
  { id: 'transit', label: 'Transit', icon: <Bus size={15} /> },
];

const preferences: { id: RoutePreference; label: string; color: string }[] = [
  { id: 'balanced', label: 'Balanced', color: 'brand' },
  { id: 'fastest', label: 'Fastest', color: 'blue' },
  { id: 'shortest', label: 'Shortest', color: 'green' },
  { id: 'safest', label: 'Safest', color: 'purple' },
];

interface SearchPanelProps {
  onPlanRoute: () => void;
  isLoading: boolean;
}

export function SearchPanel({ onPlanRoute, isLoading }: SearchPanelProps) {
  const { state, dispatch } = useApp();

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      dispatch({ type: 'SET_ERROR', payload: 'Geolocation is not supported by your browser.' });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: { isLoading: true, message: 'Finding your location...' } });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          dispatch({ type: 'SET_ORIGIN_INPUT', payload: place.name });
          dispatch({ type: 'SET_ORIGIN_PLACE', payload: place });
        } catch {
          dispatch({ type: 'SET_ERROR', payload: 'Could not determine your location name.' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
        }
      },
      (err) => {
        dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
        const msg =
          err.code === 1
            ? 'Location access denied. Please allow location permission and try again.'
            : 'Unable to determine current location. Please enter manually.';
        dispatch({ type: 'SET_ERROR', payload: msg });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const canPlan = (Boolean(state.originPlace) || Boolean(state.originInput.trim())) &&
                  (Boolean(state.destinationPlace) || Boolean(state.destinationInput.trim())) &&
                  !isLoading;

  const handlePlanClick = async () => {
    let origin = state.originPlace;
    let destination = state.destinationPlace;

    if (!origin && state.originInput.trim()) {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true, message: 'Locating origin...' } });
      const places = await geocodePlace(state.originInput.trim());
      if (places.length > 0) {
        origin = places[0];
        dispatch({ type: 'SET_ORIGIN_PLACE', payload: origin });
      }
    }

    if (!destination && state.destinationInput.trim()) {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true, message: 'Locating destination...' } });
      const places = await geocodePlace(state.destinationInput.trim());
      if (places.length > 0) {
        destination = places[0];
        dispatch({ type: 'SET_DESTINATION_PLACE', payload: destination });
      }
    }

    dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });

    if (!origin || !destination) {
      dispatch({ type: 'SET_ERROR', payload: 'Please select valid origin and destination locations.' });
      return;
    }

    onPlanRoute();
  };

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Navigation size={16} className="text-brand-400" />
          Plan Your Route
        </h2>
        <button
          onClick={handleUseMyLocation}
          className="btn-ghost text-xs py-1.5"
          title="Use my current location as origin"
        >
          <Locate size={13} />
          <span className="hidden sm:inline">My Location</span>
        </button>
      </div>

      {/* Location inputs */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex flex-col gap-2 flex-1">
          <div className="relative z-30">
            <LocationInput
              id="origin-input"
              placeholder="From — enter origin location"
              value={state.originInput}
              onChange={(v) => dispatch({ type: 'SET_ORIGIN_INPUT', payload: v })}
              onSelect={(p) => dispatch({ type: 'SET_ORIGIN_PLACE', payload: p })}
              icon={<MapPin size={15} className="text-brand-400" />}
              label="Origin location"
            />
          </div>
          <div className="relative z-20">
            <LocationInput
              id="destination-input"
              placeholder="To — enter destination"
              value={state.destinationInput}
              onChange={(v) => dispatch({ type: 'SET_DESTINATION_INPUT', payload: v })}
              onSelect={(p) => dispatch({ type: 'SET_DESTINATION_PLACE', payload: p })}
              icon={<CornerDownLeft size={15} className="text-red-400" />}
              label="Destination location"
            />
          </div>
        </div>

        {/* Plan button */}
        <button
          onClick={handlePlanClick}
          disabled={!canPlan}
          className={`btn-primary py-6 px-6 text-sm font-bold shrink-0 ${canPlan ? 'shadow-lg shadow-brand-600/30' : ''}`}
          aria-label="Plan route"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Search size={18} />
          )}
          <span className="hidden sm:inline">Plan Route</span>
        </button>
      </div>

      {/* Travel mode selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Travel mode:</span>
        <div className="flex gap-1">
          {travelModes.map((m) => (
            <button
              key={m.id}
              onClick={() => dispatch({ type: 'SET_TRAVEL_MODE', payload: m.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                state.travelMode === m.id
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-surface-600/50 border border-white/10 text-gray-400 hover:text-white hover:bg-surface-500/50'
              }`}
              aria-pressed={state.travelMode === m.id}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preference selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Route preference:</span>
        <div className="flex gap-1 flex-wrap">
          {preferences.map((p) => (
            <button
              key={p.id}
              onClick={() => dispatch({ type: 'SET_ROUTE_PREFERENCE', payload: p.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                state.routePreference === p.id
                  ? 'bg-brand-600/30 border border-brand-500/50 text-brand-300'
                  : 'bg-surface-600/50 border border-white/10 text-gray-400 hover:text-white'
              }`}
              aria-pressed={state.routePreference === p.id}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{state.error}</p>
          <button
            onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
            className="ml-auto text-red-400/50 hover:text-red-400"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && state.loadingMessage && (
        <div className="flex items-center gap-2 text-sm text-brand-400 animate-fade-in">
          <Loader2 size={14} className="animate-spin" />
          {state.loadingMessage}
        </div>
      )}
    </div>
  );
}
