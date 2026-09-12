import React, { useEffect, useRef, useState } from 'react';
import { X, Compass, ExternalLink, AlertCircle, Eye, Navigation2 } from 'lucide-react';
import { useApp } from '../context';

export function StreetViewModal() {
  const { state, dispatch } = useApp();
  const location = state.streetViewLocation;
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  
  const [hasCoverage, setHasCoverage] = useState<boolean | null>(null);
  const [coverageMessage, setCoverageMessage] = useState<string>('Searching for Street View imagery...');
  const [heading, setHeading] = useState<number>(location?.heading || 180);
  const [pitch, setPitch] = useState<number>(location?.pitch || 0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    if (!location || !containerRef.current) return;

    setHasCoverage(null);
    setCoverageMessage('Initializing Street View...');

    // Check if Google Maps JS API is available on window
    const gmaps = (window as any).google?.maps;
    if (gmaps) {
      try {
        const svService = new gmaps.StreetViewService();
        const latLng = new gmaps.LatLng(location.lat, location.lng);

        svService.getPanorama(
          {
            location: latLng,
            radius: 75,
            preference: gmaps.StreetViewPreference?.NEAREST || 'nearest',
            source: gmaps.StreetViewSource?.OUTDOOR || 'outdoor'
          },
          (data: any, status: any) => {
            if (status === gmaps.StreetViewStatus.OK && data && data.location) {
              setHasCoverage(true);
              if (containerRef.current) {
                const pano = new gmaps.StreetViewPanorama(containerRef.current, {
                  position: data.location.latLng,
                  pov: { heading: location.heading || 0, pitch: location.pitch || 0 },
                  zoom: 1,
                  addressControl: true,
                  addressControlOptions: {
                    position: gmaps.ControlPosition.TOP_LEFT
                  },
                  linksControl: true,
                  panControl: true,
                  enableCloseButton: false,
                  motionTracking: false,
                  motionTrackingControl: false,
                });

                pano.addListener('pov_changed', () => {
                  const currentPov = pano.getPov();
                  if (currentPov) {
                    setHeading(Math.round(currentPov.heading || 0));
                    setPitch(Math.round(currentPov.pitch || 0));
                  }
                });

                panoramaRef.current = pano;
              }
            } else {
              setHasCoverage(false);
              setCoverageMessage(
                'No Google Street View 360° coverage available at this exact point (usually pedestrian trails, internal alleys, or private roads).'
              );
            }
          }
        );
      } catch (err: any) {
        console.warn('Street View initialization error:', err);
        setHasCoverage(false);
        setCoverageMessage('Street View service encountered an error loading imagery.');
      }
    } else {
      // Fallback when Google Maps API script is not active
      setHasCoverage(false);
      setCoverageMessage(
        'Google Maps API Key is required to render interactive 360° panoramas directly in-app. Configure VITE_GOOGLE_MAPS_API_KEY in .env.'
      );
    }

    return () => {
      panoramaRef.current = null;
    };
  }, [location]);

  if (!location) return null;

  const handleClose = () => {
    dispatch({ type: 'SET_STREET_VIEW_LOCATION', payload: null });
  };

  const googleMapsUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${location.lat},${location.lng}&heading=${heading}&pitch=${pitch}`;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[78vh] glass-card bg-surface-900/95 border border-brand-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-surface-800/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Eye size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {location.title || 'Street View 360° Inspection'}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Interactive
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Coordinates: {location.lat.toFixed(5)}, {location.lng.toFixed(5)} • Heading: {heading}° • Pitch: {pitch}°
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5"
              title="Open in Google Maps"
            >
              <ExternalLink size={13} />
              Open Maps
            </a>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close Street View"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Street View Viewport */}
        <div className="relative flex-1 w-full h-full bg-surface-950 overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />

          {/* Fallback / No Coverage Notice */}
          {hasCoverage === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-surface-950/90 backdrop-blur-sm z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                <AlertCircle size={28} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Street View Unavailable Here</h4>
              <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
                {coverageMessage}
              </p>
              <div className="flex gap-3">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs flex items-center gap-2"
                >
                  <Navigation2 size={13} />
                  Search Nearest Roads on Google Maps
                </a>
                <button
                  onClick={handleClose}
                  className="btn-secondary text-xs"
                >
                  Return to Map
                </button>
              </div>
            </div>
          )}

          {/* Compass pill */}
          {hasCoverage && (
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
              <div className="glass-card px-3 py-1.5 bg-surface-900/90 text-[11px] text-gray-300 flex items-center gap-2 border border-white/10 shadow-lg">
                <Compass size={13} className="text-brand-400 animate-spin-slow" />
                <span>Heading: <strong className="text-white">{heading}°</strong></span>
                <span className="text-gray-600">|</span>
                <span>Pitch: <strong className="text-white">{pitch}°</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
