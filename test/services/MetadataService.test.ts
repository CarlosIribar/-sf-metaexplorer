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
import { MetadataResolver } from '@salesforce/source-deploy-retrieve';
import { MetadataService } from '../../src/services/MetadataService.js';
import { MetadataComponent } from '../../src/types/index.js';

describe('MetadataService', () => {
  const projectPath = '/tmp/project';
  let connection: Connection;
  let service: MetadataService;

  beforeEach(() => {
    connection = { metadata: { list: () => Promise.resolve([]) } } as unknown as Connection;
    service = new MetadataService(connection, projectPath);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getMetadataTypes returns supported types', () => {
    const types = service.getMetadataTypes();
    const names = types.map((type) => type.name);
    expect(types.length).to.be.greaterThan(0);
    expect(names).to.include('ApexClass');
  });

  it('listRemoteComponents maps metadata list results', async () => {
    const listStub = sinon.stub(connection.metadata, 'list') as sinon.SinonStub<unknown[], Promise<unknown>>;
    listStub.resolves([
      {
        fullName: 'MyClass',
        fileName: 'classes/MyClass.cls',
        lastModifiedDate: '2024-01-01T00:00:00Z',
        lastModifiedByName: 'Test User',
      },
    ]);

    const components = await service.listRemoteComponents('ApexClass');

    expect(components).to.have.lengthOf(1);
    expect(components[0]).to.include({
      type: 'ApexClass',
      fullName: 'MyClass',
      status: 'remote-only',
      lastModifiedBy: 'Test User',
    });
  });

  it('listLocalComponents resolves components from source', async () => {
    sinon
      .stub(service as unknown as { getPackagePaths: () => Promise<string[]> }, 'getPackagePaths')
      .resolves(['/tmp/project/force-app']);

    const resolverStub = sinon.stub(MetadataResolver.prototype, 'getComponentsFromPath').returns([
      {
        type: { id: 'apexclass', name: 'ApexClass', directoryName: 'classes' },
        fullName: 'LocalClass',
        xml: 'classes/LocalClass.cls-meta.xml',
        content: 'classes/LocalClass.cls',
      },
      {
        type: { id: 'apextrigger', name: 'ApexTrigger', directoryName: 'triggers' },
        fullName: 'OtherTrigger',
        xml: 'triggers/OtherTrigger.trigger-meta.xml',
        content: 'triggers/OtherTrigger.trigger',
      },
    ] as unknown as ReturnType<MetadataResolver['getComponentsFromPath']>);

    const components = await service.listLocalComponents('ApexClass');

    expect(resolverStub.called).to.equal(true);
    expect(components).to.have.lengthOf(1);
    expect(components[0]).to.include({
      type: 'ApexClass',
      fullName: 'LocalClass',
      status: 'local-only',
    });
  });

  it('listLocalComponentsByTypes buckets requested types only', async () => {
    sinon
      .stub(service as unknown as { getPackagePaths: () => Promise<string[]> }, 'getPackagePaths')
      .resolves(['/tmp/project/force-app']);

    sinon.stub(MetadataResolver.prototype, 'getComponentsFromPath').returns([
      {
        type: { id: 'apexclass', name: 'ApexClass', directoryName: 'classes' },
        fullName: 'LocalClass',
        xml: 'classes/LocalClass.cls-meta.xml',
        content: 'classes/LocalClass.cls',
      },
      {
        type: { id: 'customfield', name: 'CustomField', directoryName: 'objects' },
        fullName: 'Account.Test__c',
        xml: 'objects/Account/fields/Test__c.field-meta.xml',
        content: 'objects/Account/fields/Test__c.field-meta.xml',
      },
    ] as unknown as ReturnType<MetadataResolver['getComponentsFromPath']>);

    const result = await service.listLocalComponentsByTypes(['CustomField']);

    expect(Object.keys(result)).to.deep.equal(['CustomField']);
    expect(result.CustomField).to.have.lengthOf(1);
    expect(result.CustomField[0]).to.include({
      type: 'CustomField',
      fullName: 'Account.Test__c',
      status: 'local-only',
    });
  });

  it('compareMetadata builds comparison buckets', async () => {
    const local: MetadataComponent[] = [
      { id: '1', type: 'ApexClass', fullName: 'LocalOnly', status: 'local-only' },
      { id: '2', type: 'ApexClass', fullName: 'Shared', status: 'local-only' },
    ];
    const remote: MetadataComponent[] = [
      { id: '3', type: 'ApexClass', fullName: 'RemoteOnly', status: 'remote-only' },
      { id: '4', type: 'ApexClass', fullName: 'Shared', status: 'remote-only' },
    ];

    sinon.stub(service, 'listLocalComponents').resolves(local);
    sinon.stub(service, 'listRemoteComponents').resolves(remote);

    const comparison = await service.compareMetadata('ApexClass');

    expect(comparison.localOnly.map((item) => item.fullName)).to.deep.equal(['LocalOnly']);
    expect(comparison.remoteOnly.map((item) => item.fullName)).to.deep.equal(['RemoteOnly']);
    expect(comparison.synced.map((item) => item.fullName)).to.deep.equal(['Shared']);
  });
});
