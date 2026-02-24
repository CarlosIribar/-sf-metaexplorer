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
import { OrgInfo } from '../../types/index.js';

export type OrgSelectorModalProps = {
  orgs: OrgInfo[];
  currentOrg: OrgInfo | null;
  onSelect: (org: OrgInfo) => void;
  onClose: () => void;
};

export const OrgSelectorModal: React.FC<OrgSelectorModalProps> = ({ orgs, currentOrg, onSelect, onClose }) => {
  const sortedOrgs = useMemo(
    () =>
      [...orgs].sort((a, b) =>
        (a.alias ?? a.username).localeCompare(b.alias ?? b.username, undefined, { sensitivity: 'base' })
      ),
    [orgs]
  );

  const [cursorIndex, setCursorIndex] = useState(() => {
    const idx = sortedOrgs.findIndex((org) => org.username === currentOrg?.username);
    return idx >= 0 ? idx : 0;
  });

  const safeCursorIndex = useMemo(
    () => (sortedOrgs.length === 0 ? 0 : Math.min(cursorIndex, sortedOrgs.length - 1)),
    [cursorIndex, sortedOrgs.length]
  );

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
    if (key.upArrow) {
      setCursorIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setCursorIndex((prev) => Math.min(sortedOrgs.length - 1, prev + 1));
    }
    if (key.return) {
      const selected = sortedOrgs[safeCursorIndex];
      if (selected) {
        onSelect(selected);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1} width={60}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Select Organization
        </Text>
      </Box>

      {sortedOrgs.length === 0 ? (
        <Text color="gray">No organizations found. Run sf org login web to authenticate.</Text>
      ) : (
        sortedOrgs.map((org, index) => {
          const isActive = safeCursorIndex === index;
          const isCurrent = org.username === currentOrg?.username;
          const prefix = isActive ? '>' : ' ';
          const suffix = isCurrent ? ' (current)' : '';
          const typeLabel = org.isScratch ? '[scratch]' : org.isDevHub ? '[devhub]' : '';

          return (
            <Box key={org.username} paddingX={1}>
              <Text color={isActive ? 'green' : 'white'} bold={isActive}>
                {prefix} {org.alias ?? org.username}
                <Text color="gray">
                  {suffix} {typeLabel}
                </Text>
              </Text>
            </Box>
          );
        })
      )}

      <Box marginTop={1} borderTop borderColor="gray" paddingTop={1}>
        <Text color="gray">
          <Text color="yellow">[Enter]</Text> Select
          <Text color="yellow"> [Esc]</Text> Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default OrgSelectorModal;
