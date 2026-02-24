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

export interface TreeNode {
  id: string;
  label: string;
  count?: number;
  children?: TreeNode[];
  isExpanded?: boolean;
  icon?: string;
  color?: string;
  selectionState?: 'none' | 'partial' | 'all';
}

interface TreeViewProps {
  nodes: TreeNode[];
  onSelect: (node: TreeNode) => void;
  onToggleExpand?: (node: TreeNode) => void;
  onToggleSelect?: (node: TreeNode) => void;
  isActive: boolean;
  selectedId?: string;
  height: number;
  emptyMessage?: string;
  onFocus?: () => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  onSelect,
  onToggleExpand,
  onToggleSelect,
  isActive,
  selectedId,
  height,
  emptyMessage,
  onFocus,
}) => {
  const [cursorIndex, setCursorIndex] = useState(0);

  const flattenNodes = (items: TreeNode[], depth = 0): Array<{ node: TreeNode; depth: number }> => {
    const result: Array<{ node: TreeNode; depth: number }> = [];
    for (const node of items) {
      result.push({ node, depth });
      if (node.isExpanded && node.children) {
        result.push(...flattenNodes(node.children, depth + 1));
      }
    }
    return result;
  };

  const visibleNodes = flattenNodes(nodes);

  // Virtual scrolling
  const windowSize = Math.max(3, height - 1);

  const safeCursorIndex = useMemo(
    () => (visibleNodes.length === 0 ? 0 : Math.min(cursorIndex, visibleNodes.length - 1)),
    [cursorIndex, visibleNodes.length]
  );

  const scrollOffset = useMemo(() => {
    const maxOffset = Math.max(0, visibleNodes.length - windowSize);
    const nextOffset = Math.max(0, safeCursorIndex - windowSize + 1);
    return Math.min(maxOffset, nextOffset);
  }, [visibleNodes.length, safeCursorIndex, windowSize]);

  const virtualNodes = useMemo(
    () => visibleNodes.slice(scrollOffset, scrollOffset + windowSize),
    [visibleNodes, scrollOffset, windowSize]
  );

  // Mouse event handling via centralized hook (avoids multiple stdin listeners / setRawMode conflicts)
  useMouseInput(
    useCallback(
      (event) => {
        if (!isActive && onFocus) {
          onFocus();
        }

        const clickedIndex = scrollOffset + (event.y - 1);

        if (clickedIndex >= 0 && clickedIndex < visibleNodes.length) {
          if (event.button === 0) {
            setCursorIndex(clickedIndex);
            const node = visibleNodes[clickedIndex];
            if (node) {
              onSelect(node.node);
            }
          } else if (event.button === 1) {
            const node = visibleNodes[clickedIndex];
            if (node && onToggleSelect) {
              onToggleSelect(node.node);
            }
          }
        }
      },
      [isActive, onFocus, scrollOffset, visibleNodes, onSelect, onToggleSelect]
    )
  );

  useInput((input, key) => {
    if (!isActive) return;

    if (visibleNodes.length === 0) return;

    if (key.upArrow || input === 'k') {
      setCursorIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === 'j') {
      setCursorIndex((prev) => Math.min(visibleNodes.length - 1, prev + 1));
    }
    if (key.return) {
      const current = visibleNodes[safeCursorIndex];
      if (current) {
        onSelect(current.node);
      }
    }
    if (input === ' ') {
      const current = visibleNodes[safeCursorIndex];
      if (current) {
        if (onToggleSelect) {
          onToggleSelect(current.node);
        } else {
          onSelect(current.node);
        }
      }
    }
    if (key.rightArrow) {
      const current = visibleNodes[safeCursorIndex];
      if (current?.node.children && !current.node.isExpanded) {
        onToggleExpand?.(current.node);
      }
    }
    if (key.leftArrow) {
      const current = visibleNodes[safeCursorIndex];
      if (current?.node.children && current.node.isExpanded) {
        onToggleExpand?.(current.node);
      }
    }
  });

  const renderNode = (node: TreeNode, depth: number, index: number): JSX.Element => {
    const absoluteIndex = index + scrollOffset;
    const isSelected = safeCursorIndex === absoluteIndex;
    const hasChildren = node.children && node.children.length > 0;
    const prefix = hasChildren ? (node.isExpanded ? '▼ ' : '▶ ') : '  ';
    const indent = '  '.repeat(depth);
    const countText = node.count !== undefined ? ` (${node.count})` : '';
    const isMarked = selectedId ? node.id === selectedId : false;
    const checkbox = node.selectionState
      ? node.selectionState === 'all'
        ? '[x] '
        : node.selectionState === 'partial'
        ? '[-] '
        : '[ ] '
      : '';

    return (
      <Box key={node.id} paddingLeft={1}>
        <Text color={isSelected && isActive ? 'green' : node.color ?? 'white'} bold={isSelected || isMarked}>
          {isSelected && isActive ? '>' : ' '} {indent}
          {prefix}
          {checkbox}
          {node.label}
          {countText}
        </Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" height={height}>
      {virtualNodes.map(({ node, depth }, index) => renderNode(node, depth, index))}
      {virtualNodes.length === 0 && (
        <Box paddingX={1}>
          <Text color="gray">{emptyMessage ?? 'No metadata types found'}</Text>
        </Box>
      )}
      {visibleNodes.length > 0 && (
        <Box paddingX={1} marginTop={1}>
          <Text color="gray">
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + windowSize, visibleNodes.length)} of{' '}
            {visibleNodes.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default TreeView;
