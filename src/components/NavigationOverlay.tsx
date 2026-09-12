import React, { useEffect, useState } from 'react';
import { Navigation, Compass, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../context';
import type { RouteSegment, GeoLocation } from '../types';

export function NavigationOverlay() {
  const { state, dispatch } = useApp();
  const [speed, setSpeed] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  
  const route = state.routeComparison?.recommended || state.routeComparison?.fastest;
  
  useEffect(() => {
    if (!state.navigationMode || !route) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Calculate speed in km/h (pos.coords.speed is in m/s)
        const currentSpeed = pos.coords.speed ? pos.coords.speed * 3.6 : 0;
        setSpeed(Math.round(currentSpeed));
        
        if (pos.coords.heading) {
          setHeading(pos.coords.heading);
        }
      },
      (err) => {
        console.warn('Navigation GPS error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [state.navigationMode, route]);
  
  if (!state.navigationMode || !route) return null;
  
  const segments = route.segments || [];
  const currentSegment = segments[currentSegmentIndex];
  const nextSegment = segments[currentSegmentIndex + 1];
  
  const handleStopNavigation = () => {
    dispatch({ type: 'SET_NAVIGATION_MODE', payload: false });
  };
  
  const handleNextStep = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      // Reached destination
      dispatch({ type: 'SET_NAVIGATION_MODE', payload: false });
      alert("You have reached your destination!");
    }
  };

  return (
    <div className="absolute inset-x-0 top-0 bottom-0 z-50 pointer-events-none p-4 flex flex-col justify-between">
      {/* Top Banner - Next Turn Instruction */}
      <div className="glass-card bg-surface-900/90 border-brand-500/50 p-4 pointer-events-auto shadow-2xl flex items-center justify-between animate-slide-down">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-600/30 flex items-center justify-center">
            <Compass size={28} className="text-brand-400" style={{ transform: `rotate(${heading}deg)`, transition: 'transform 0.3s ease-out' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {currentSegment ? currentSegment.name : 'Proceed to route'}
            </h2>
            <p className="text-sm text-gray-400">
              {currentSegment ? `${(currentSegment.distance).toFixed(0)} meters` : ''}
              {nextSegment ? ` • Then ${nextSegment.name}` : ' • Destination ahead'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleStopNavigation}
          className="btn-secondary bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 px-4 py-2"
        >
          Exit
        </button>
      </div>
      
      {/* Debug Next Step Button (Since we can't physically drive in the browser easily) */}
      <div className="pointer-events-auto self-end mt-4">
        <button onClick={handleNextStep} className="btn-secondary text-xs px-2 py-1">
          Simulate Next Turn
        </button>
      </div>

      {/* Bottom Stats Banner */}
      <div className="glass-card bg-surface-900/95 pointer-events-auto p-4 flex items-center justify-between shadow-2xl mt-auto">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Speed</p>
            <p className="text-2xl font-bold text-white flex items-baseline gap-1">
              {speed} <span className="text-sm text-gray-400 font-normal">km/h</span>
            </p>
          </div>
          
          <div className="w-px h-8 bg-white/10" />
          
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Remaining</p>
            <p className="text-xl font-bold text-brand-400 flex items-center gap-2">
              <Clock size={16} />
              {Math.ceil(route.duration / 60)} min
            </p>
            <p className="text-sm text-gray-400">
              {(route.distance / 1000).toFixed(1)} km
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {currentSegment?.trafficLevel === 'critical' && (
             <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold border border-red-500/30">
               <AlertTriangle size={12} /> Heavy Traffic
             </div>
          )}
          {currentSegment?.trafficLevel === 'high' && (
             <div className="flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold border border-orange-500/30">
               <AlertTriangle size={12} /> Slow Traffic
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
