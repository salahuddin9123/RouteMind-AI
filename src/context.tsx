import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState } from './types';
import { appReducer, defaultState, loadPersistedData } from './store';

type Dispatch = React.Dispatch<Parameters<typeof appReducer>[1]>;

interface AppContextType {
  state: AppState;
  dispatch: Dispatch;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, defaultState);

  useEffect(() => {
    const persisted = loadPersistedData();
    if (Object.keys(persisted).length > 0) {
      dispatch({ type: 'LOAD_PERSISTED_DATA', payload: persisted });
    }
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
