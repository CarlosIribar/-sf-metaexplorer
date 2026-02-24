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

interface HeaderProps {
  title: string;
  orgName: string;
  version?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, orgName, version = '0.1.0' }) => (
  <Box borderStyle="double" borderColor="blue" paddingX={1} justifyContent="space-between">
    <Box>
      <Text bold color="cyan">
        {title}
      </Text>
      <Text color="gray"> v{version}</Text>
    </Box>
    <Text>
      Org:{' '}
      <Text color="green" bold>
        {orgName}
      </Text>
    </Text>
  </Box>
);

export default Header;
