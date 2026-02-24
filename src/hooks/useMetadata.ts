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
import { Connection } from '@salesforce/core';
import { MetadataType, MetadataComponent, MetadataComparison, MetadataProgress } from '../types/index.js';
import { MetadataService } from '../services/index.js';

export type MetadataActionResult = {
  success: boolean;
  message: string;
  details?: string[];
};

export type UseMetadataReturn = {
  allTypes: MetadataType[];
  types: MetadataType[];
  components: MetadataComponent[];
  comparison: MetadataComparison | null;
  selectedType: string | null;
  isLoading: boolean;
  error: Error | null;
  setSelectedType: (type: string | null) => void;
  refresh: () => Promise<void>;
  retrieve: (
    components: MetadataComponent[],
    onProgress?: (progress: MetadataProgress) => void,
    onCancelable?: (cancel: () => Promise<void>) => void
  ) => Promise<MetadataActionResult>;
  deploy: (
    components: MetadataComponent[],
    onProgress?: (progress: MetadataProgress) => void,
    onCancelable?: (cancel: () => Promise<void>) => void
  ) => Promise<MetadataActionResult>;
  getTypeComponents: () => Promise<Record<string, MetadataComponent[]>>;
  getLocalTypeComponents: (typeNames: string[]) => Promise<Record<string, MetadataComponent[]>>;
};

export function useMetadata(
  connection: Connection | null,
  projectPath: string,
  enabledTypes?: string[]
): UseMetadataReturn {
  const [service, setService] = useState<MetadataService | null>(null);
  const [allTypes, setAllTypes] = useState<MetadataType[]>([]);
  const [types, setTypes] = useState<MetadataType[]>([]);
  const [components, setComponents] = useState<MetadataComponent[]>([]);
  const [comparison, setComparison] = useState<MetadataComparison | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (connection) {
      setService(new MetadataService(connection, projectPath));
    } else {
      setService(null);
    }
  }, [connection, projectPath]);

  useEffect(() => {
    const loadTypes = async (): Promise<void> => {
      if (!service) return;

      setIsLoading(true);
      setError(null);
      try {
        const metadataTypes = await Promise.resolve(service.getMetadataTypes());
        setAllTypes(metadataTypes);
        const filtered =
          enabledTypes !== undefined ? metadataTypes.filter((type) => enabledTypes.includes(type.name)) : metadataTypes;
        setTypes(filtered);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load types'));
      } finally {
        setIsLoading(false);
      }
    };

    void loadTypes();
  }, [enabledTypes, service]);

  useEffect(() => {
    if (!selectedType) {
      setComponents([]);
      setComparison(null);
    }
  }, [selectedType]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!service) return;

    setIsLoading(true);
    setError(null);
    try {
      const metadataTypes = await Promise.resolve(service.getMetadataTypes());
      setAllTypes(metadataTypes);
      const filtered =
        enabledTypes !== undefined ? metadataTypes.filter((type) => enabledTypes.includes(type.name)) : metadataTypes;
      setTypes(filtered);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh'));
    } finally {
      setIsLoading(false);
    }
  }, [enabledTypes, service, selectedType]);

  const retrieve = useCallback(
    async (
      comps: MetadataComponent[],
      onProgress?: (progress: MetadataProgress) => void,
      onCancelable?: (cancel: () => Promise<void>) => void
    ): Promise<MetadataActionResult> => {
      if (!service) {
        return { success: false, message: 'No connection' };
      }
      return service.retrieve(comps, onProgress, onCancelable);
    },
    [service]
  );

  const deploy = useCallback(
    async (
      comps: MetadataComponent[],
      onProgress?: (progress: MetadataProgress) => void,
      onCancelable?: (cancel: () => Promise<void>) => void
    ): Promise<MetadataActionResult> => {
      if (!service) {
        return { success: false, message: 'No connection' };
      }
      return service.deploy(comps, onProgress, onCancelable);
    },
    [service]
  );

  const getTypeComponents = useCallback(async (): Promise<Record<string, MetadataComponent[]>> => {
    if (!service) {
      return {};
    }

    const entries = await Promise.all(
      types.map(async (type) => {
        const comp = await service.compareMetadata(type.name);
        return [
          type.name,
          [...comp.localOnly, ...comp.synced, ...comp.remoteOnly, ...comp.conflicts] as MetadataComponent[],
        ] as const;
      })
    );

    return Object.fromEntries(entries);
  }, [service, types]);

  const getLocalTypeComponents = useCallback(
    async (typeNames: string[]): Promise<Record<string, MetadataComponent[]>> => {
      if (!service || typeNames.length === 0) {
        return {};
      }

      return service.listLocalComponentsByTypes(typeNames);
    },
    [service]
  );

  return {
    allTypes,
    types,
    components,
    comparison,
    selectedType,
    isLoading,
    error,
    setSelectedType,
    refresh,
    retrieve,
    deploy,
    getTypeComponents,
    getLocalTypeComponents,
  };
}
