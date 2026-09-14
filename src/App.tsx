import React from 'react';
import { AppProvider, useApp } from './context';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { DashboardPage } from './pages/DashboardPage';
import { AIPlannerPage } from './pages/AIPlannerPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { RoadIntelligencePage } from './pages/RoadIntelligencePage';
import { FloodRiskPage } from './pages/FloodRiskPage';
import { WeatherPage } from './pages/WeatherPage';
import { SavedRoutesPage } from './pages/SavedRoutesPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CampusPage } from './pages/CampusPage';

import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { state } = useApp();

  const renderPage = () => {
    switch (state.activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'planner': return <AIPlannerPage />;
      case 'map': return <LiveMapPage />;
      case 'road-intelligence': return <RoadIntelligencePage />;
      case 'flood-risk': return <FloodRiskPage />;
      case 'weather': return <WeatherPage />;
      case 'saved-routes': return <SavedRoutesPage />;
      case 'history': return <HistoryPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'settings': return <SettingsPage />;
      case 'campus': return <CampusPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-surface-900 text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 relative overflow-y-auto scroll-area">
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
