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

import { useState, useCallback, useMemo } from 'react';
import { MetadataComponent } from '../types/index.js';

export type UseSelectionReturn = {
  selectedIds: Set<string>;
  selectedComponents: MetadataComponent[];
  toggle: (id: string) => void;
  toggleMultiple: (ids: string[]) => void;
  selectAll: (components: MetadataComponent[]) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
  count: number;
};

export function useSelection(allComponents: MetadataComponent[] = []): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleMultiple = useCallback((ids: string[]): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));

      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((components: MetadataComponent[]): void => {
    setSelectedIds(new Set(components.map((component) => component.id)));
  }, []);

  const deselectAll = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string): boolean => selectedIds.has(id), [selectedIds]);

  const selectedComponents = useMemo(
    () => allComponents.filter((component) => selectedIds.has(component.id)),
    [allComponents, selectedIds]
  );

  return useMemo(
    () => ({
      selectedIds,
      selectedComponents,
      toggle,
      toggleMultiple,
      selectAll,
      deselectAll,
      isSelected,
      count: selectedComponents.length,
    }),
    [selectedIds, selectedComponents, toggle, toggleMultiple, selectAll, deselectAll, isSelected]
  );
}
