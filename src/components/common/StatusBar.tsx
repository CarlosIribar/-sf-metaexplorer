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

import React from 'react';
import { Box, Text } from 'ink';
import { STATUS_ICONS, STATUS_LABELS } from '../../utils/colors.js';

interface StatusBarProps {
  orgName: string;
  selectedCount: number;
  lastSync: string;
  lastSyncOrg: string | null;
  cacheStatus: 'fresh' | 'stale' | 'empty';
  viewMode: 'all' | 'selected';
  enabledTypesCount?: number;
  groupingAvailable?: boolean;
  groupByObject?: boolean;
  behindInfo?: {
    count: number;
    upstream: string;
  } | null;
  isLoading?: boolean;
  loadingMessage?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  orgName,
  selectedCount,
  lastSync,
  lastSyncOrg,
  cacheStatus,
  viewMode,
  enabledTypesCount,
  groupingAvailable,
  groupByObject,
  behindInfo,
  isLoading,
  loadingMessage,
}) => (
  <Box flexDirection="column">
    <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Text>
        <Text color="yellow">[Tab/h/l]</Text> Panel
        <Text color="yellow"> [j/k]</Text> Move
        <Text color="yellow"> [Space]</Text> Select
        <Text color="yellow"> [n]</Text> Clear
        <Text color="yellow"> [r]</Text> Retrieve
        <Text color="yellow"> [d]</Text> Deploy
        <Text color="yellow"> [c]</Text> Cancel
        <Text color="yellow"> [s]</Text> Sync
        <Text color="yellow"> [t]</Text> Types
        <Text color="yellow"> [v]</Text> View
        <Text color="yellow"> [g]</Text> Group
        <Text color="yellow"> [o]</Text> Org
        <Text color="yellow"> [q]</Text> Quit
      </Text>
      <Text>
        Selected: <Text color="cyan">{selectedCount}</Text>
        <Text color="gray"> View: {viewMode === 'selected' ? 'Selected' : 'All'}</Text>
        {enabledTypesCount !== undefined && <Text color="gray"> Types: {enabledTypesCount}</Text>}
        {groupingAvailable && groupByObject !== undefined && (
          <Text color="gray"> Group: {groupByObject ? 'Object' : 'Flat'}</Text>
        )}
      </Text>
    </Box>

    <Box paddingX={1} justifyContent="space-between">
      <Text>
        Org: <Text color="green">{orgName}</Text>
      </Text>
      {isLoading ? (
        <Text color="yellow">{loadingMessage ?? 'Loading...'}</Text>
      ) : (
        <Text color={cacheStatus === 'stale' || (behindInfo?.count ?? 0) > 0 ? 'yellow' : 'gray'}>
          Last sync: {lastSync}
          {lastSyncOrg ? ` (${lastSyncOrg})` : ''} | Cache: {cacheStatus}
          {behindInfo ? ` | Behind: ${behindInfo.count} (${behindInfo.upstream})` : ''}
        </Text>
      )}
    </Box>
    <Box paddingX={1}>
      <Text color="gray">
        Status: {STATUS_ICONS['local-only']} {STATUS_LABELS['local-only']} {STATUS_ICONS['remote-only']}{' '}
        {STATUS_LABELS['remote-only']} {STATUS_ICONS.synced} {STATUS_LABELS.synced} {STATUS_ICONS.conflict}{' '}
        {STATUS_LABELS.conflict}
      </Text>
    </Box>
  </Box>
);

export default StatusBar;
