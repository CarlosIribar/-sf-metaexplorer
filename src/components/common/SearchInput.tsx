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
import TextInput from 'ink-text-input';

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  isActive: boolean;
};

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  isActive,
}) => (
  <Box>
    <Text color="yellow">/</Text>
    <Text> </Text>
    {isActive ? (
      <TextInput value={value} onChange={onChange} onSubmit={onSubmit} placeholder={placeholder} />
    ) : (
      <Text color="gray">{value || placeholder}</Text>
    )}
  </Box>
);

export default SearchInput;
