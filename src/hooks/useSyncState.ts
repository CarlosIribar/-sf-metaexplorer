/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useEffect, useCallback } from 'react';
import { SyncStateService, SyncState } from '../services/index.js';
import { CachedMetadata, PersistedUiState } from '../types/index.js';

export type UseSyncStateReturn = {
  lastSyncFormatted: string;
  lastSyncOrg: string | null;
  uiState: PersistedUiState | null;
  isLoading: boolean;
  updateSync: (orgUsername: string, types: string[]) => Promise<void>;
  clearCache: () => Promise<void>;
  getCachedMetadata: (type: string) => Promise<CachedMetadata | null>;
  setCachedMetadata: (type: string, data: CachedMetadata) => Promise<void>;
  setCachedMetadataBatch: (cacheByType: Record<string, CachedMetadata>) => Promise<void>;
  setUiState: (data: PersistedUiState) => Promise<void>;
  getSubscriptions: (orgUsername: string) => Promise<string[] | null>;
  setSubscriptions: (orgUsername: string, types: string[]) => Promise<void>;
};

export function useSyncState(projectPath: string): UseSyncStateReturn {
  const [service] = useState(() => new SyncStateService(projectPath));
  const [state, setState] = useState<SyncState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async (): Promise<void> => {
      const loadedState = await service.load();
      setState(loadedState);
      setIsLoading(false);
    };
    void load();
  }, [service]);

  const updateSync = useCallback(
    async (orgUsername: string, types: string[]): Promise<void> => {
      await service.updateLastSync(orgUsername, types);
      const newState = await service.load();
      setState(newState);
    },
    [service]
  );

  const clearCache = useCallback(async (): Promise<void> => {
    await service.clearCache();
    const newState = await service.load();
    setState(newState);
  }, [service]);

  const getCachedMetadata = useCallback(
    async (type: string): Promise<CachedMetadata | null> => service.getCachedMetadata(type),
    [service]
  );

  const setCachedMetadata = useCallback(
    async (type: string, data: CachedMetadata): Promise<void> => {
      await service.setCachedMetadata(type, data);
      const newState = await service.load();
      setState(newState);
    },
    [service]
  );

  const setCachedMetadataBatch = useCallback(
    async (cacheByType: Record<string, CachedMetadata>): Promise<void> => {
      await service.setCachedMetadataBatch(cacheByType);
      const newState = await service.load();
      setState(newState);
    },
    [service]
  );

  const setUiState = useCallback(
    async (data: PersistedUiState): Promise<void> => {
      await service.setUiState(data);
      const newState = await service.load();
      setState(newState);
    },
    [service]
  );

  const getSubscriptions = useCallback(
    async (orgUsername: string): Promise<string[] | null> => service.getSubscriptions(orgUsername),
    [service]
  );

  const setSubscriptions = useCallback(
    async (orgUsername: string, types: string[]): Promise<void> => {
      await service.setSubscriptions(orgUsername, types);
      const newState = await service.load();
      setState(newState);
    },
    [service]
  );

  const lastSyncFormatted = state?.lastSync ? new Date(state.lastSync.timestamp).toLocaleString() : 'Never';

  const lastSyncOrg = state?.lastSync?.orgUsername ?? null;

  return {
    lastSyncFormatted,
    lastSyncOrg,
    uiState: state?.ui ?? null,
    isLoading,
    updateSync,
    clearCache,
    getCachedMetadata,
    setCachedMetadata,
    setCachedMetadataBatch,
    setUiState,
    getSubscriptions,
    setSubscriptions,
  };
}
