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

export type ResultModalProps = {
  success: boolean;
  title: string;
  message: string;
  details?: string[];
  onClose: () => void;
};

export const ResultModal: React.FC<ResultModalProps> = ({ success, title, message, details, onClose }) => {
  useInput((input, key) => {
    if (key.return || key.escape || input === ' ') {
      onClose();
    }
  });

  const borderColor = success ? 'green' : 'red';
  const icon = success ? 'v' : 'x';
  const iconColor = success ? 'green' : 'red';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} padding={1} width={60}>
      <Box marginBottom={1}>
        <Text color={iconColor}>{icon} </Text>
        <Text bold color={iconColor}>
          {title}
        </Text>
      </Box>

      <Text>{message}</Text>

      {details && details.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="gray">
            Details:
          </Text>
          {details.slice(0, 10).map((detail, index) => (
            <Text key={`${index}-${detail}`} color="gray">
              {'  - '} {detail}
            </Text>
          ))}
          {details.length > 10 && <Text color="gray"> ...and {details.length - 10} more</Text>}
        </Box>
      )}

      <Box marginTop={1} borderTop borderColor="gray" paddingTop={1}>
        <Text color="gray">
          Press <Text color="yellow">[Enter]</Text> to continue
        </Text>
      </Box>
    </Box>
  );
};

export default ResultModal;
