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

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type ActionType = 'retrieve' | 'deploy';

export type ConfirmActionModalProps = {
  action: ActionType;
  items: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({ action, items, onConfirm, onCancel }) => {
  const [selectedButton, setSelectedButton] = useState<'confirm' | 'cancel'>('confirm');

  const actionLabel = action === 'retrieve' ? 'Retrieve' : 'Deploy';
  const actionColor = action === 'retrieve' ? 'cyan' : 'green';

  useInput((input, key) => {
    if (key.escape || input === 'n') {
      onCancel();
    }
    if (input === 'y' || (key.return && selectedButton === 'confirm')) {
      onConfirm();
    }
    if (key.return && selectedButton === 'cancel') {
      onCancel();
    }
    if (key.leftArrow || key.rightArrow) {
      setSelectedButton((prev) => (prev === 'confirm' ? 'cancel' : 'confirm'));
    }
  });

  const maxItems = 10;
  const displayItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={actionColor} padding={1} width={50}>
      <Box marginBottom={1}>
        <Text bold color={actionColor}>
          Confirm {actionLabel}
        </Text>
      </Box>

      <Text>
        You are about to {action} <Text bold>{items.length}</Text> component(s):
      </Text>

      <Box flexDirection="column" marginY={1} paddingLeft={2}>
        {displayItems.map((item) => (
          <Text key={item} color="gray">
            - {item}
          </Text>
        ))}
        {remainingCount > 0 && <Text color="gray"> ...and {remainingCount} more</Text>}
      </Box>

      <Box marginTop={1}>
        <Text>Continue? </Text>
        <Text color={selectedButton === 'confirm' ? 'green' : 'gray'} bold={selectedButton === 'confirm'}>
          [Y]es
        </Text>
        <Text> / </Text>
        <Text color={selectedButton === 'cancel' ? 'red' : 'gray'} bold={selectedButton === 'cancel'}>
          [N]o
        </Text>
      </Box>
    </Box>
  );
};

export default ConfirmActionModal;
