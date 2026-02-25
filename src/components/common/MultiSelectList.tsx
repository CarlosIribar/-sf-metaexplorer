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

import React, { useMemo, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useMouseInput } from '../../hooks/useMouseInput.js';
import { MetadataStatus } from '../../types/index.js';
import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS } from '../../utils/colors.js';

export interface ListItem {
  id: string;
  label: string;
  status: MetadataStatus;
  selected: boolean;
}

interface MultiSelectListProps {
  items: ListItem[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  isActive: boolean;
  title?: string;
  height: number;
  emptyMessage?: string;
  onFocus?: () => void;
}

export const MultiSelectList: React.FC<MultiSelectListProps> = ({
  items,
  onToggle,
  onToggleAll,
  isActive,
  title,
  height,
  emptyMessage,
  onFocus,
}) => {
  const [cursorIndex, setCursorIndex] = useState(0);

  const windowSize = useMemo(() => {
    const reserved = title ? 4 : 3; // Scroll indicator + help text + optional title
    return Math.max(3, height - reserved);
  }, [height, title]);

  const safeCursorIndex = useMemo(
    () => (items.length === 0 ? 0 : Math.min(cursorIndex, items.length - 1)),
    [cursorIndex, items.length]
  );

  const scrollOffset = useMemo(() => {
    const maxOffset = Math.max(0, items.length - windowSize);
    const centeredOffset = safeCursorIndex - Math.floor(windowSize / 2);
    return Math.min(maxOffset, Math.max(0, centeredOffset));
  }, [items.length, safeCursorIndex, windowSize]);

  // Mouse event handling via centralized hook (avoids multiple stdin listeners / setRawMode conflicts)
  useMouseInput(
    useCallback(
      (event) => {
        if (!isActive && onFocus) {
          onFocus();
        }

        const clickedIndex = scrollOffset + (event.y - 1);

        if (clickedIndex >= 0 && clickedIndex < items.length) {
          if (event.button === 0) {
            setCursorIndex(clickedIndex);
            const item = items[clickedIndex];
            if (item) {
              onToggle(item.id);
            }
          }
        }
      },
      [isActive, onFocus, scrollOffset, items, onToggle]
    )
  );

  useInput((input, key) => {
    if (!isActive) return;

    if (items.length === 0) return;

    if (key.upArrow || input === 'k') {
      setCursorIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === 'j') {
      setCursorIndex((prev) => Math.min(items.length - 1, prev + 1));
    }
    if (input === ' ' || key.return) {
      const current = items[safeCursorIndex];
      if (current) {
        onToggle(current.id);
      }
    }
    if (input === 'a') {
      onToggleAll();
    }
  });

  const visibleItems = useMemo(
    () => items.slice(scrollOffset, scrollOffset + windowSize),
    [items, scrollOffset, windowSize]
  );

  return (
    <Box flexDirection="column" height={height}>
      {title && (
        <Box paddingX={1} marginBottom={1}>
          <Text bold>{title}</Text>
          <Text color="gray"> ({items.length} items)</Text>
        </Box>
      )}

      {items.length === 0 ? (
        <Box paddingX={1}>
          <Text color="gray">{emptyMessage ?? 'No components to display'}</Text>
        </Box>
      ) : (
        visibleItems.map((item, index) => {
          const absoluteIndex = index + scrollOffset;
          const isSelected = safeCursorIndex === absoluteIndex;
          const checkbox = item.selected ? '[x]' : '[ ]';
          const statusColor = STATUS_COLORS[item.status];
          const statusLabel = STATUS_LABELS[item.status];
          const statusIcon = STATUS_ICONS[item.status];

          return (
            <Box key={item.id} paddingX={1}>
              <Text color={isSelected && isActive ? 'green' : 'white'}>{isSelected && isActive ? '>' : ' '} </Text>
              <Text color={item.selected ? 'green' : 'white'}>{checkbox} </Text>
              <Text wrap="truncate-end" color={statusColor}>
                {statusIcon} {item.label}
              </Text>
              <Text color="gray"> [{statusLabel}]</Text>
            </Box>
          );
        })
      )}

      <Box flexDirection="column" marginTop={1}>
        {items.length > 0 && (
          <Box paddingX={1}>
            <Text color="gray">
              Showing {scrollOffset + 1}-{Math.min(scrollOffset + windowSize, items.length)} of {items.length}
            </Text>
          </Box>
        )}

        {items.length > 0 && (
          <Box paddingX={1}>
            <Text color="gray">
              <Text color="yellow">[j/k]</Text> Move
              <Text color="yellow">[Space]</Text> Toggle
              <Text color="yellow"> [a]</Text> Toggle All
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MultiSelectList;
