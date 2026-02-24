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

export type MetadataStatus = 'local-only' | 'remote-only' | 'synced' | 'conflict';

export type MetadataProgress = {
  current: number;
  total: number;
  message?: string;
};

export interface MetadataType {
  name: string;
  directoryName: string;
  suffix: string;
  childTypes?: string[];
  inFolder?: boolean;
}

export interface MetadataComponent {
  id: string;
  type: string;
  fullName: string;
  fileName?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
  packageName?: string;
  isThirdParty?: boolean;
  status: MetadataStatus;
}

export interface MetadataComparison {
  localOnly: MetadataComponent[];
  remoteOnly: MetadataComponent[];
  synced: MetadataComponent[];
  conflicts: MetadataComponent[];
}

export interface CachedMetadata {
  lastFetched: Date;
  components: MetadataComponent[];
}
