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
import { AuthInfo, ConfigAggregator, Org, type OrgAuthorization } from '@salesforce/core';
import { OrgService } from '../../src/services/OrgService.js';

describe('OrgService', () => {
  let sandbox: sinon.SinonSandbox;
  let orgService: OrgService;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    orgService = new OrgService();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('listOrgs', () => {
    it('should return empty array when no orgs authenticated', async () => {
      sandbox.stub(AuthInfo, 'listAllAuthorizations').resolves([]);
      sandbox.stub(ConfigAggregator, 'create').resolves({
        reload: async () => undefined,
        getPropertyValue: () => undefined,
      } as unknown as ConfigAggregator);

      const orgs = await orgService.listOrgs();
      expect(orgs).to.be.an('array').that.is.empty;
    });

    it('should return orgs with correct structure', async () => {
      const authInfo: OrgAuthorization = {
        username: 'test@example.com',
        orgId: '00D000000000000',
        instanceUrl: 'https://test.salesforce.com',
        aliases: ['testAlias'],
        configs: [],
        oauthMethod: 'web',
        isExpired: false,
      };

      sandbox.stub(AuthInfo, 'listAllAuthorizations').resolves([authInfo]);

      sandbox.stub(ConfigAggregator, 'create').resolves({
        reload: async () => undefined,
        getPropertyValue: () => 'test@example.com',
      } as unknown as ConfigAggregator);

      sandbox.stub(Org, 'create').resolves({} as Org);

      const orgs = await orgService.listOrgs();

      expect(orgs).to.have.lengthOf(1);
      expect(orgs[0]).to.include({
        username: 'test@example.com',
        isDefault: true,
      });
    });
  });

  describe('getDefaultOrg', () => {
    it('should return null when no orgs available', async () => {
      sandbox.stub(AuthInfo, 'listAllAuthorizations').resolves([]);
      sandbox.stub(ConfigAggregator, 'create').resolves({
        reload: async () => undefined,
        getPropertyValue: () => undefined,
      } as unknown as ConfigAggregator);

      const defaultOrg = await orgService.getDefaultOrg();
      expect(defaultOrg).to.be.null;
    });
  });
});
