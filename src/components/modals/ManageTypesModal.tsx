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

import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { MetadataType } from '../../types/index.js';

export type ManageTypesModalProps = {
  types: MetadataType[];
  selected: string[];
  coreTypes: string[];
  onSave: (types: string[]) => void;
  onClose: () => void;
};

export const ManageTypesModal: React.FC<ManageTypesModalProps> = ({ types, selected, coreTypes, onSave, onClose }) => {
  const [cursorIndex, setCursorIndex] = useState(0);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set(selected));

  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [types]
  );

  const safeIndex = Math.min(cursorIndex, Math.max(sortedTypes.length - 1, 0));

  useInput((input, key) => {
    if (key.upArrow) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setCursorIndex((prev) => Math.min(sortedTypes.length - 1, prev + 1));
    }
    if (input === ' ') {
      const current = sortedTypes[safeIndex];
      if (!current) return;
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (next.has(current.name)) {
          next.delete(current.name);
        } else {
          next.add(current.name);
        }
        return next;
      });
    }
    if (input === 'a') {
      setSelectedSet(new Set(sortedTypes.map((type) => type.name)));
    }
    if (input === 'n') {
      setSelectedSet(new Set());
    }
    if (input === 'c') {
      setSelectedSet(new Set(coreTypes));
    }
    if (key.return) {
      onSave(Array.from(selectedSet));
    }
    if (key.escape) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} width={60}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Manage Metadata Types
        </Text>
      </Box>

      <Box flexDirection="column" height={12}>
        {sortedTypes.length === 0 ? (
          <Text color="gray">No metadata types available.</Text>
        ) : (
          sortedTypes.map((type, index) => {
            const isActive = index === safeIndex;
            const isSelected = selectedSet.has(type.name);
            const checkbox = isSelected ? '[x]' : '[ ]';
            return (
              <Box key={type.name} paddingX={1}>
                <Text color={isActive ? 'green' : 'white'}>{isActive ? '>' : ' '} </Text>
                <Text color={isSelected ? 'green' : 'white'}>{checkbox} </Text>
                <Text>{type.name}</Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          <Text color="yellow">[Space]</Text> Toggle <Text color="yellow">[a]</Text> All <Text color="yellow">[n]</Text>{' '}
          None <Text color="yellow">[c]</Text> Core
        </Text>
      </Box>
      <Box>
        <Text color="gray">
          <Text color="yellow">[Enter]</Text> Save <Text color="yellow">[Esc]</Text> Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default ManageTypesModal;
