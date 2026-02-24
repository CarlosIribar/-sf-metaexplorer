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
import InkSpinner from 'ink-spinner';

export type OperationType = 'retrieve' | 'deploy' | 'sync';

export type ProgressModalProps = {
  operation: OperationType;
  message?: string;
  progress?: {
    current: number;
    total: number;
  };
  elapsedSeconds?: number;
  cancellable?: boolean;
  cancelling?: boolean;
};

const formatElapsed = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

export const ProgressModal: React.FC<ProgressModalProps> = ({
  operation,
  message,
  progress,
  elapsedSeconds,
  cancellable,
  cancelling,
}) => {
  const operationLabels: Record<OperationType, string> = {
    retrieve: 'Retrieving',
    deploy: 'Deploying',
    sync: 'Synchronizing',
  };

  const operationColors: Record<OperationType, string> = {
    retrieve: 'cyan',
    deploy: 'green',
    sync: 'yellow',
  };

  const label = operationLabels[operation];
  const color = operationColors[operation];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} padding={1} width={50}>
      <Box>
        <Text color={color}>
          <InkSpinner type="dots" />
        </Text>
        <Text bold color={color}>
          {' '}
          {label}...
        </Text>
      </Box>

      {message && (
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
      )}

      {progress && (
        <Box marginTop={1}>
          <Text color="gray">
            Progress: {progress.current}/{progress.total}
          </Text>
        </Box>
      )}

      {elapsedSeconds !== undefined && (
        <Box marginTop={1}>
          <Text color="gray">Elapsed: {formatElapsed(elapsedSeconds)}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Please wait, do not close the terminal.</Text>
      </Box>

      {cancellable && (
        <Box marginTop={1}>
          <Text color={cancelling ? 'yellow' : 'gray'}>
            {cancelling ? 'Cancelling operation...' : 'Press [c] or [Esc] to cancel'}
          </Text>
        </Box>
      )}

      {!cancellable && (
        <Box marginTop={1}>
          <Text color="gray">This operation cannot be cancelled.</Text>
        </Box>
      )}
    </Box>
  );
};

export default ProgressModal;
