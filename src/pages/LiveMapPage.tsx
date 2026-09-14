import React from 'react';
import { Map, Layers, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context';
import { MapView } from '../components/MapView';
import { MapControls } from '../components/MapControls';
import { NavigationOverlay } from '../components/NavigationOverlay';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function LiveMapPage() {
  const { state } = useApp();

  return (
    <div className="flex flex-col h-full">
      {/* Map header */}
      <div className="px-4 py-3 bg-surface-800/80 border-b border-white/5 flex items-center gap-3">
        <Map size={16} className="text-brand-400" />
        <span className="text-sm font-semibold text-white">Live Map View</span>
        <div className="ml-auto text-xs text-gray-500">
          Click on the map to inspect road information
        </div>
      </div>

      {/* Full map */}
      <div className="flex-1 relative overflow-hidden">
        <ErrorBoundary
          fallbackTitle="Live Map Display Error"
          fallbackMessage="Unable to load the interactive live map layers. Click below to reload."
        >
          <MapView />
        </ErrorBoundary>
        {!state.navigationMode && <MapControls />}
        {state.navigationMode && <NavigationOverlay />}
      </div>
    </div>
  );
}
