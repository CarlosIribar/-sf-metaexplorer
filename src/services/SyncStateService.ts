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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CachedMetadata, PersistedUiState } from '../types/index.js';

export interface SyncState {
  lastSync: {
    orgUsername: string;
    timestamp: string;
    metadataTypes: string[];
  } | null;
  cache: Record<string, CachedMetadata>;
  ui?: PersistedUiState;
  subscriptions?: Record<string, string[]>;
}

const DEFAULT_STATE: SyncState = {
  lastSync: null,
  cache: {},
  ui: {},
  subscriptions: {},
};

const STATE_DIR = '.sf-metaexplorer';
const STATE_FILE = 'state.json';

export class SyncStateService {
  private projectPath: string;
  private statePath: string;

  public constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.statePath = path.join(projectPath, STATE_DIR, STATE_FILE);
  }

  public getStateDir(): string {
    return path.join(this.projectPath, STATE_DIR);
  }

  public load(): Promise<SyncState> {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        return Promise.resolve(JSON.parse(content) as SyncState);
      }
    } catch (error) {
      void error;
    }

    return Promise.resolve({ ...DEFAULT_STATE });
  }

  public save(state: SyncState): Promise<void> {
    this.ensureStateDir();
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    return Promise.resolve();
  }

  public async updateLastSync(orgUsername: string, types: string[]): Promise<void> {
    const state = await this.load();
    state.lastSync = {
      orgUsername,
      timestamp: new Date().toISOString(),
      metadataTypes: types,
    };
    await this.save(state);
  }

  public async getCachedMetadata(type: string): Promise<CachedMetadata | null> {
    const state = await this.load();
    return state.cache[type] ?? null;
  }

  public async setCachedMetadata(type: string, data: CachedMetadata): Promise<void> {
    const state = await this.load();
    state.cache[type] = data;
    await this.save(state);
  }

  public async clearCache(): Promise<void> {
    const state = await this.load();
    state.cache = {};
    await this.save(state);
  }

  public async getSubscriptions(orgUsername: string): Promise<string[] | null> {
    const state = await this.load();
    return state.subscriptions?.[orgUsername] ?? null;
  }

  public async setSubscriptions(orgUsername: string, types: string[]): Promise<void> {
    const state = await this.load();
    state.subscriptions = state.subscriptions ?? {};
    state.subscriptions[orgUsername] = types;
    await this.save(state);
  }

  public async getUiState(): Promise<PersistedUiState | null> {
    const state = await this.load();
    return state.ui ?? null;
  }

  public async setUiState(data: PersistedUiState): Promise<void> {
    const state = await this.load();
    state.ui = { ...(state.ui ?? {}), ...data };
    await this.save(state);
  }

  public async getLastSyncFormatted(): Promise<string> {
    const state = await this.load();
    if (!state.lastSync) {
      return 'Never';
    }

    const date = new Date(state.lastSync.timestamp);
    return date.toLocaleString();
  }

  private ensureStateDir(): void {
    const stateDir = this.getStateDir();
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
  }
}
