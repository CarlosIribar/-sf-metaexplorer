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

import { MetadataStatus } from '../types/index.js';

export const STATUS_COLORS: Record<MetadataStatus, string> = {
  'local-only': 'green',
  'remote-only': 'cyan',
  synced: 'white',
  conflict: 'yellow',
};

export const STATUS_ICONS: Record<MetadataStatus, string> = {
  'local-only': '^',
  'remote-only': 'v',
  synced: '=',
  conflict: '!',
};

export const STATUS_LABELS: Record<MetadataStatus, string> = {
  'local-only': 'Local Only',
  'remote-only': 'Remote Only',
  synced: 'Synced',
  conflict: 'Conflict',
};
