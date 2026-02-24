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

import { AuthInfo, Config, ConfigAggregator, Connection, Org } from '@salesforce/core';
import { OrgInfo } from '../types/index.js';

export class OrgService {
  private projectPath?: string;

  public constructor(projectPath?: string) {
    this.projectPath = projectPath;
  }

  public async listOrgs(): Promise<OrgInfo[]> {
    const authInfos = await AuthInfo.listAllAuthorizations();
    const config = await ConfigAggregator.create(this.projectPath ? { projectPath: this.projectPath } : undefined);
    await config.reload();
    const defaultUsername = config.getPropertyValue('target-org') as string | undefined;

    const orgs = await Promise.all(
      authInfos.map(async (auth): Promise<OrgInfo | null> => {
        try {
          await Org.create({ aliasOrUsername: auth.username });
          const orgInfo: OrgInfo = {
            username: auth.username,
            orgId: auth.orgId ?? '',
            instanceUrl: auth.instanceUrl ?? '',
            isDefault: auth.username === defaultUsername,
            isScratch: auth.isScratchOrg ?? false,
            isDevHub: auth.isDevHub ?? false,
          };

          if (auth.aliases?.[0]) {
            orgInfo.alias = auth.aliases[0];
          }

          return orgInfo;
        } catch (error) {
          void error;
          return null;
        }
      })
    );

    return orgs.filter((org): org is OrgInfo => org !== null);
  }

  public async getDefaultOrg(): Promise<OrgInfo | null> {
    const orgs = await this.listOrgs();
    return orgs.find((org) => org.isDefault) ?? orgs[0] ?? null;
  }

  public async getConnection(usernameOrAlias: string): Promise<Connection> {
    void this.projectPath;
    const org = await Org.create({ aliasOrUsername: usernameOrAlias });
    return org.getConnection();
  }

  public async setDefaultOrg(usernameOrAlias: string): Promise<void> {
    void this.projectPath;
    await Config.update(false, 'target-org', usernameOrAlias);
  }
}

export const orgService = new OrgService();
