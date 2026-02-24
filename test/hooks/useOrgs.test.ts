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

import { expect } from 'chai';
import sinon from 'sinon';
import { Connection } from '@salesforce/core';
import { OrgInfo } from '../../src/types/index.js';
import { orgService } from '../../src/services/index.js';
import { useOrgs } from '../../src/hooks/useOrgs.js';
import { act, flushPromises, renderHook } from './renderHook.js';

describe('useOrgs', () => {
  const orgs: OrgInfo[] = [
    {
      username: 'user1@example.com',
      alias: 'alias1',
      orgId: '00D1',
      instanceUrl: 'https://example.com',
      isDefault: true,
      isScratch: false,
      isDevHub: false,
    },
    {
      username: 'user2@example.com',
      alias: 'alias2',
      orgId: '00D2',
      instanceUrl: 'https://example.com',
      isDefault: false,
      isScratch: false,
      isDevHub: false,
    },
  ];

  let listStub: sinon.SinonStub;
  let connStub: sinon.SinonStub;

  beforeEach(() => {
    listStub = sinon.stub(orgService, 'listOrgs').resolves(orgs);
    connStub = sinon.stub(orgService, 'getConnection').resolves({} as Connection);
  });

  afterEach(() => {
    listStub.restore();
    connStub.restore();
  });

  it('loads org list and sets default org', async () => {
    const { result } = renderHook(() => useOrgs());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.orgs).to.have.lengthOf(2);
    expect(result.current.currentOrg?.username).to.equal('user1@example.com');
    expect(result.current.connection).to.not.equal(null);
    expect(result.current.isLoading).to.equal(false);
    expect(result.current.error).to.equal(null);
  });

  it('switchOrg updates current org', async () => {
    const { result } = renderHook(() => useOrgs());

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await result.current.switchOrg('alias2');
    });

    expect(result.current.currentOrg?.username).to.equal('user2@example.com');
  });

  it('sets error when loading fails', async () => {
    listStub.restore();
    listStub = sinon.stub(orgService, 'listOrgs').rejects(new Error('fail'));

    const { result } = renderHook(() => useOrgs());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.error).to.not.equal(null);
  });
});
