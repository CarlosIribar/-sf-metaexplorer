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
import * as os from 'node:os';
import * as path from 'node:path';
import { expect } from 'chai';
import { SyncStateService } from '../../src/services/SyncStateService.js';

describe('SyncStateService', () => {
  let tempDir: string;
  let syncStateService: SyncStateService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-test-'));
    syncStateService = new SyncStateService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('should return default state when no file exists', async () => {
      const state = await syncStateService.load();
      expect(state.lastSync).to.be.null;
      expect(state.cache).to.deep.equal({});
    });

    it('should load existing state from file', async () => {
      const stateDir = syncStateService.getStateDir();
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(
        path.join(stateDir, 'state.json'),
        JSON.stringify({
          lastSync: {
            orgUsername: 'test@test.com',
            timestamp: '2024-01-01T00:00:00Z',
            metadataTypes: ['ApexClass'],
          },
          cache: {},
        })
      );

      const state = await syncStateService.load();
      expect(state.lastSync?.orgUsername).to.equal('test@test.com');
    });
  });

  describe('save', () => {
    it('should create state file and directory', async () => {
      await syncStateService.save({
        lastSync: null,
        cache: {},
      });

      const stateFile = path.join(syncStateService.getStateDir(), 'state.json');
      expect(fs.existsSync(stateFile)).to.be.true;
    });
  });

  describe('updateLastSync', () => {
    it('should update last sync timestamp', async () => {
      await syncStateService.updateLastSync('user@org.com', ['ApexClass', 'ApexTrigger']);

      const state = await syncStateService.load();
      expect(state.lastSync?.orgUsername).to.equal('user@org.com');
      expect(state.lastSync?.metadataTypes).to.deep.equal(['ApexClass', 'ApexTrigger']);
    });
  });

  describe('getLastSyncFormatted', () => {
    it('should return "Never" when no sync', async () => {
      const formatted = await syncStateService.getLastSyncFormatted();
      expect(formatted).to.equal('Never');
    });
  });
});
