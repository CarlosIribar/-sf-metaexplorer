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

import { MetadataService } from '../src/services/MetadataService.js';
import { OrgService } from '../src/services/OrgService.js';
import { SyncStateService } from '../src/services/SyncStateService.js';

type ManualTestOptions = {
  usernameOrAlias?: string;
  projectPath: string;
};

const parseArgs = (): ManualTestOptions => {
  const args = process.argv.slice(2);
  const options: ManualTestOptions = {
    projectPath: process.cwd(),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--org' || arg === '--target-org') {
      options.usernameOrAlias = args[index + 1];
      index += 1;
    } else if (arg === '--project-path') {
      options.projectPath = args[index + 1] ?? options.projectPath;
      index += 1;
    }
  }

  return options;
};

const logSection = (title: string): void => {
  process.stdout.write(`\n=== ${title} ===\n`);
};

const logResult = (label: string, ok: boolean, details?: string): void => {
  const status = ok ? 'OK' : 'FAIL';
  const suffix = details ? ` - ${details}` : '';
  process.stdout.write(`[${status}] ${label}${suffix}\n`);
};

const testOrgService = async (service: OrgService, options: ManualTestOptions): Promise<void> => {
  logSection('OrgService');

  try {
    const orgs = await service.listOrgs();
    logResult('listOrgs returns array', Array.isArray(orgs), `count=${orgs.length}`);

    const defaultOrg = await service.getDefaultOrg();
    logResult('getDefaultOrg returns value or null', defaultOrg !== undefined, defaultOrg?.username ?? 'null');

    if (options.usernameOrAlias) {
      const connection = await service.getConnection(options.usernameOrAlias);
      logResult('getConnection works for provided org', Boolean(connection));
    } else if (defaultOrg) {
      const connection = await service.getConnection(defaultOrg.username);
      logResult('getConnection works for default org', Boolean(connection));
    } else {
      logResult('getConnection skipped', true, 'no org provided and no default org');
    }
  } catch (error) {
    logResult('OrgService tests', false, error instanceof Error ? error.message : 'unknown error');
  }
};

const testSyncStateService = async (projectPath: string): Promise<void> => {
  logSection('SyncStateService');
  const syncService = new SyncStateService(projectPath);

  try {
    await syncService.updateLastSync('test@test.com', ['ApexClass']);
    const lastSync = await syncService.getLastSyncFormatted();
    logResult('updateLastSync + getLastSyncFormatted', lastSync !== 'Never', lastSync);

    const cached = await syncService.getCachedMetadata('ApexClass');
    logResult('getCachedMetadata returns null when empty', cached === null, cached ? 'has data' : 'null');
  } catch (error) {
    logResult('SyncStateService tests', false, error instanceof Error ? error.message : 'unknown error');
  }
};

const testMetadataService = async (options: ManualTestOptions, service: OrgService): Promise<void> => {
  logSection('MetadataService');

  try {
    let usernameOrAlias = options.usernameOrAlias;
    if (!usernameOrAlias) {
      const defaultOrg = await service.getDefaultOrg();
      usernameOrAlias = defaultOrg?.username;
    }

    if (!usernameOrAlias) {
      logResult('metadata tests skipped', true, 'no org provided and no default org');
      return;
    }

    const connection = await service.getConnection(usernameOrAlias);
    const metadataService = new MetadataService(connection, options.projectPath);

    const types = await metadataService.getMetadataTypes();
    logResult('getMetadataTypes returns list', Array.isArray(types), `count=${types.length}`);
    logResult(
      'getMetadataTypes contains ApexClass',
      types.some((type) => type.name === 'ApexClass')
    );

    const remoteComponents = await metadataService.listRemoteComponents('ApexClass');
    logResult(
      'listRemoteComponents returns array',
      Array.isArray(remoteComponents),
      `count=${remoteComponents.length}`
    );
  } catch (error) {
    logResult('MetadataService tests', false, error instanceof Error ? error.message : 'unknown error');
  }
};

const main = async (): Promise<void> => {
  const options = parseArgs();
  const projectOrgService = new OrgService(options.projectPath);

  process.stdout.write('Manual tests for SF Metadata Explorer\n');
  process.stdout.write(`Project path: ${options.projectPath}\n`);
  if (options.usernameOrAlias) {
    process.stdout.write(`Target org: ${options.usernameOrAlias}\n`);
  }

  await testOrgService(projectOrgService, options);
  await testSyncStateService(options.projectPath);
  await testMetadataService(options, projectOrgService);
};

void main();
