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
import { useSyncState } from '../../src/hooks/useSyncState.js';
import { act, flushPromises, renderHook } from './renderHook.js';

describe('useSyncState', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-hook-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns Never when no sync', async () => {
    const { result } = renderHook(() => useSyncState(tempDir));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.lastSyncFormatted).to.equal('Never');
  });

  it('updateSync updates last sync data', async () => {
    const { result } = renderHook(() => useSyncState(tempDir));

    await act(async () => {
      await result.current.updateSync('user@org.com', ['ApexClass']);
    });

    expect(result.current.lastSyncOrg).to.equal('user@org.com');
    expect(result.current.lastSyncFormatted).to.not.equal('Never');
  });

  it('clearCache empties cache in state file', async () => {
    const service = new SyncStateService(tempDir);
    await service.setCachedMetadata('ApexClass', {
      lastFetched: new Date(),
      components: [],
    });

    const { result } = renderHook(() => useSyncState(tempDir));

    await act(async () => {
      await result.current.clearCache();
    });

    const statePath = path.join(tempDir, '.sf-metaexplorer', 'state.json');
    const content = JSON.parse(fs.readFileSync(statePath, 'utf-8')) as { cache: Record<string, unknown> };
    expect(Object.keys(content.cache)).to.have.lengthOf(0);
  });
});
