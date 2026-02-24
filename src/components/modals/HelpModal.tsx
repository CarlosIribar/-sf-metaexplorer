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
import { Box, Text, useInput } from 'ink';

export type HelpModalProps = {
  onClose: () => void;
};

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  useInput(() => {
    onClose();
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} width={60}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Help & Shortcuts
        </Text>
      </Box>

      <Box flexDirection="column">
        <Text>
          <Text color="yellow">Tab / h / l</Text> Switch panel
        </Text>
        <Text>
          <Text color="yellow">j / k</Text> Move cursor
        </Text>
        <Text>
          <Text color="yellow">Space</Text> Toggle selection
        </Text>
        <Text>
          <Text color="yellow">a</Text> Toggle all in list
        </Text>
        <Text>
          <Text color="yellow">n</Text> Clear selection
        </Text>
        <Text>
          <Text color="yellow">/</Text> Search components
        </Text>
        <Text>
          <Text color="yellow">t</Text> Manage types
        </Text>
        <Text>
          <Text color="yellow">g</Text> Toggle grouping
        </Text>
        <Text>
          <Text color="yellow">o</Text> Select org
        </Text>
        <Text>
          <Text color="yellow">r</Text> Retrieve selected
        </Text>
        <Text>
          <Text color="yellow">d</Text> Deploy selected
        </Text>
        <Text>
          <Text color="yellow">s</Text> Sync metadata
        </Text>
        <Text>
          <Text color="yellow">c / Esc</Text> Cancel deploy/retrieve
        </Text>
        <Text>
          <Text color="yellow">v</Text> Toggle selected view
        </Text>
        <Text>
          <Text color="yellow">q</Text> Quit
        </Text>
      </Box>

      <Box marginTop={1} borderTop borderColor="gray" paddingTop={1}>
        <Text color="gray">Press any key to close</Text>
      </Box>
    </Box>
  );
};

export default HelpModal;
