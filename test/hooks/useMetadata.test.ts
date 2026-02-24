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
import { MetadataService } from '../../src/services/MetadataService.js';
import { MetadataComponent, MetadataComparison, MetadataType } from '../../src/types/index.js';
import { useMetadata } from '../../src/hooks/useMetadata.js';
import { act, flushPromises, renderHook } from './renderHook.js';

describe('useMetadata', () => {
  let typesStub: sinon.SinonStub;
  let compareStub: sinon.SinonStub;
  let retrieveStub: sinon.SinonStub;
  let deployStub: sinon.SinonStub;

  const types: MetadataType[] = [{ name: 'ApexClass', directoryName: 'classes', suffix: 'cls' }];

  const comparison: MetadataComparison = {
    localOnly: [{ id: '1', type: 'ApexClass', fullName: 'ClassA', status: 'local-only' }],
    remoteOnly: [{ id: '2', type: 'ApexClass', fullName: 'ClassB', status: 'remote-only' }],
    synced: [],
    conflicts: [],
  };

  beforeEach(() => {
    typesStub = sinon.stub(MetadataService.prototype, 'getMetadataTypes').returns(types);
    compareStub = sinon.stub(MetadataService.prototype, 'compareMetadata').resolves(comparison);
    retrieveStub = sinon.stub(MetadataService.prototype, 'retrieve').resolves({ success: true, message: 'ok' });
    deployStub = sinon.stub(MetadataService.prototype, 'deploy').resolves({ success: true, message: 'ok' });
  });

  afterEach(() => {
    typesStub.restore();
    compareStub.restore();
    retrieveStub.restore();
    deployStub.restore();
  });

  it('loads metadata types when connection exists', async () => {
    const { result } = renderHook(() => useMetadata({} as Connection, '/tmp'));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.types).to.have.lengthOf(1);
    expect(result.current.types[0].name).to.equal('ApexClass');
  });

  it('loads components when selected type changes', async () => {
    const { result } = renderHook(() => useMetadata({} as Connection, '/tmp'));

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      result.current.setSelectedType('ApexClass');
      await flushPromises();
    });

    expect(compareStub.calledWith('ApexClass')).to.equal(true);
    expect(result.current.components).to.have.lengthOf(2);
  });

  it('refresh reloads metadata', async () => {
    const { result } = renderHook(() => useMetadata({} as Connection, '/tmp'));

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(typesStub.called).to.equal(true);
  });

  it('retrieve and deploy forward to service', async () => {
    const { result } = renderHook(() => useMetadata({} as Connection, '/tmp'));
    const components: MetadataComponent[] = [{ id: '1', type: 'ApexClass', fullName: 'ClassA', status: 'local-only' }];

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await result.current.retrieve(components);
      await result.current.deploy(components);
    });

    expect(retrieveStub.called).to.equal(true);
    expect(deployStub.called).to.equal(true);
  });
});
