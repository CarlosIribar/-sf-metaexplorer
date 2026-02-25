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

import { Connection, SfProject } from '@salesforce/core';
import { ComponentSet, MetadataResolver, SourceComponent, registry } from '@salesforce/source-deploy-retrieve';
import { MetadataComponent, MetadataComparison, MetadataProgress, MetadataType } from '../types/index.js';

const SUPPORTED_TYPES: MetadataType[] = [
  {
    name: 'ApexClass',
    directoryName: 'classes',
    suffix: 'cls',
  },
  {
    name: 'ApexTrigger',
    directoryName: 'triggers',
    suffix: 'trigger',
  },
  {
    name: 'ApexComponent',
    directoryName: 'components',
    suffix: 'component',
  },
  {
    name: 'ApexPage',
    directoryName: 'pages',
    suffix: 'page',
  },
  {
    name: 'LightningComponentBundle',
    directoryName: 'lwc',
    suffix: 'js',
  },
  {
    name: 'AuraDefinitionBundle',
    directoryName: 'aura',
    suffix: 'cmp',
  },
  {
    name: 'CustomObject',
    directoryName: 'objects',
    suffix: 'object',
  },
  {
    name: 'CustomField',
    directoryName: 'objects',
    suffix: 'field-meta.xml',
  },
  {
    name: 'ValidationRule',
    directoryName: 'objects',
    suffix: 'validationRule-meta.xml',
  },
  {
    name: 'RecordType',
    directoryName: 'objects',
    suffix: 'recordType-meta.xml',
  },
  {
    name: 'BusinessProcess',
    directoryName: 'objects',
    suffix: 'businessProcess-meta.xml',
  },
  {
    name: 'FieldSet',
    directoryName: 'objects',
    suffix: 'fieldSet-meta.xml',
  },
  {
    name: 'CompactLayout',
    directoryName: 'objects',
    suffix: 'compactLayout-meta.xml',
  },
  {
    name: 'ListView',
    directoryName: 'objects',
    suffix: 'listView-meta.xml',
  },
  {
    name: 'WebLink',
    directoryName: 'objects',
    suffix: 'webLink-meta.xml',
  },
  {
    name: 'Layout',
    directoryName: 'layouts',
    suffix: 'layout',
  },
  {
    name: 'SharingReason',
    directoryName: 'objects',
    suffix: 'sharingReason-meta.xml',
  },
  {
    name: 'CustomLabels',
    directoryName: 'labels',
    suffix: 'labels',
  },
  {
    name: 'EmailTemplate',
    directoryName: 'email',
    suffix: 'email',
  },
  {
    name: 'Flow',
    directoryName: 'flows',
    suffix: 'flow',
  },
  {
    name: 'Profile',
    directoryName: 'profiles',
    suffix: 'profile',
  },
  {
    name: 'PermissionSet',
    directoryName: 'permissionsets',
    suffix: 'permissionset',
  },
  {
    name: 'StaticResource',
    directoryName: 'staticresources',
    suffix: 'resource',
  },
];

export class MetadataService {
  private connection: Connection;
  private projectPath: string;
  private registry = registry;

  public constructor(connection: Connection, projectPath: string) {
    this.connection = connection;
    this.projectPath = projectPath;
  }

  private static isCanceled(value: string | undefined): boolean {
    if (!value) {
      return false;
    }

    return /cancelled|canceled/i.test(value);
  }

  private static getPackageName(type: string, fullName: string): string | undefined {
    if (
      [
        'CustomObject',
        'CustomField',
        'ValidationRule',
        'RecordType',
        'BusinessProcess',
        'FieldSet',
        'CompactLayout',
        'ListView',
        'WebLink',
        'SharingReason',
      ].includes(type)
    ) {
      return undefined;
    }

    const match = /^([A-Za-z0-9_]+)__/.exec(fullName);
    return match ? match[1] : undefined;
  }

  private static localComponentKey(component: SourceComponent): string {
    return `${component.type.name}:${component.fullName}:${component.xml ?? component.content ?? ''}`;
  }

  private static toLocalMetadataComponent(component: SourceComponent, index: number): MetadataComponent {
    const type = component.type.name;
    const packageName = MetadataService.getPackageName(type, component.fullName);

    return {
      packageName,
      isThirdParty: packageName !== undefined,
      id: `local-${type}-${component.fullName}-${index}`,
      type,
      fullName: component.fullName,
      fileName: component.xml ?? component.content,
      status: 'local-only',
    };
  }

  private static collectComponentTree(root: SourceComponent): SourceComponent[] {
    const stack: SourceComponent[] = [root];
    const collected: SourceComponent[] = [];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }

      collected.push(current);
      const children = current.getChildren();
      if (children.length > 0) {
        stack.push(...children);
      }
    }

    return collected;
  }

  public getMetadataTypes(): MetadataType[] {
    const types: MetadataType[] = [];

    for (const type of SUPPORTED_TYPES) {
      const typeInfo = this.registry.types[type.name.toLowerCase()];
      if (typeInfo) {
        types.push({
          name: typeInfo.name,
          directoryName: typeInfo.directoryName,
          suffix: typeInfo.suffix ?? '',
          inFolder: typeInfo.inFolder,
        });
      } else {
        types.push({ ...type });
      }
    }

    return types;
  }

  public async listRemoteComponents(type: string): Promise<MetadataComponent[]> {
    try {
      const listResult = await this.connection.metadata.list([{ type }]);
      const items = Array.isArray(listResult) ? listResult : listResult ? [listResult] : [];

      return items.map((item, index) => {
        const packageName = MetadataService.getPackageName(type, item.fullName);
        return {
          packageName,
          isThirdParty: packageName !== undefined,
          id: `remote-${type}-${item.fullName}-${index}`,
          type,
          fullName: item.fullName,
          fileName: item.fileName,
          lastModifiedDate: item.lastModifiedDate ? new Date(item.lastModifiedDate) : undefined,
          lastModifiedBy: item.lastModifiedByName,
          status: 'remote-only',
        };
      });
    } catch (error) {
      void error;
      return [];
    }
  }

  public async listLocalComponents(type: string): Promise<MetadataComponent[]> {
    try {
      const components = await this.listAllLocalSourceComponents();

      return components
        .filter((component) => component.type.name === type)
        .map((component, index) => MetadataService.toLocalMetadataComponent(component, index));
    } catch (error) {
      void error;
      return [];
    }
  }

  public async listLocalComponentsByTypes(typeNames: string[]): Promise<Record<string, MetadataComponent[]>> {
    const requested = new Set(typeNames);
    const buckets = new Map<string, MetadataComponent[]>();
    typeNames.forEach((typeName) => buckets.set(typeName, []));

    try {
      const components = await this.listAllLocalSourceComponents();

      let index = 0;
      for (const component of components) {
        if (!requested.has(component.type.name)) {
          continue;
        }

        const mapped = MetadataService.toLocalMetadataComponent(component, index);
        index += 1;

        const current = buckets.get(component.type.name);
        if (current) {
          current.push(mapped);
        } else {
          buckets.set(component.type.name, [mapped]);
        }
      }
    } catch (error) {
      void error;
    }

    return Object.fromEntries(buckets);
  }

  public async compareMetadata(type: string): Promise<MetadataComparison> {
    const [remoteComponents, localComponents] = await Promise.all([
      this.listRemoteComponents(type),
      this.listLocalComponents(type),
    ]);

    const remoteNames = new Set(remoteComponents.map((component) => component.fullName));
    const localNames = new Set(localComponents.map((component) => component.fullName));

    const comparison: MetadataComparison = {
      localOnly: [],
      remoteOnly: [],
      synced: [],
      conflicts: [],
    };

    for (const component of localComponents) {
      if (!remoteNames.has(component.fullName)) {
        comparison.localOnly.push({ ...component, status: 'local-only' });
      }
    }

    for (const component of remoteComponents) {
      if (!localNames.has(component.fullName)) {
        comparison.remoteOnly.push({ ...component, status: 'remote-only' });
      }
    }

    for (const component of localComponents) {
      if (remoteNames.has(component.fullName)) {
        const remoteComponent = remoteComponents.find((remote) => remote.fullName === component.fullName);
        comparison.synced.push({
          ...component,
          status: 'synced',
          lastModifiedDate: remoteComponent?.lastModifiedDate,
          lastModifiedBy: remoteComponent?.lastModifiedBy,
        });
      }
    }

    return comparison;
  }

  public async getAllComponents(): Promise<MetadataComponent[]> {
    const types = this.getMetadataTypes();
    const comparisons = await Promise.all(types.map((type) => this.compareMetadata(type.name)));
    return comparisons.flatMap((comparison) => [
      ...comparison.localOnly,
      ...comparison.remoteOnly,
      ...comparison.synced,
      ...comparison.conflicts,
    ]);
  }

  public async retrieve(
    components: MetadataComponent[],
    onProgress?: (progress: MetadataProgress) => void,
    onCancelable?: (cancel: () => Promise<void>) => void
  ): Promise<{ success: boolean; message: string; details?: string[] }> {
    try {
      const componentSet = new ComponentSet();

      for (const component of components) {
        componentSet.add({
          type: component.type,
          fullName: component.fullName,
        });
      }

      const retrieve = await componentSet.retrieve({
        usernameOrConnection: this.connection,
        output: this.projectPath,
        merge: true,
      });

      onCancelable?.(async () => {
        const cancel = (retrieve as { cancel?: () => Promise<unknown> }).cancel;
        if (typeof cancel === 'function') {
          await cancel.call(retrieve);
        }
      });

      const total = components.length;
      const resolveRetrieveMessage = (payload: {
        status?: string;
        messages?: { fileName?: string; problem?: string } | Array<{ fileName?: string; problem?: string }>;
      }): string | undefined => {
        if (payload.messages) {
          const messageList = Array.isArray(payload.messages) ? payload.messages : [payload.messages];
          const first = messageList[0];
          if (first?.problem) {
            return `Retrieve warning: ${first.problem}`;
          }
        }
        return payload.status ? `Status: ${payload.status}` : undefined;
      };

      if (typeof (retrieve as { onUpdate?: (cb: (update: unknown) => void) => void }).onUpdate === 'function') {
        retrieve.onUpdate((update: unknown) => {
          if (!onProgress) return;
          const payload = update as {
            numberComponentsRetrieved?: number;
            numberComponentsTotal?: number;
            status?: string;
            messages?: { fileName?: string; problem?: string } | Array<{ fileName?: string; problem?: string }>;
          };
          const current = payload.numberComponentsRetrieved;
          const totalFromUpdate = payload.numberComponentsTotal ?? total;
          const message = resolveRetrieveMessage(payload);
          if (typeof current === 'number') {
            onProgress({
              current,
              total: totalFromUpdate,
              message,
            });
          }
        });
      }

      const result = await retrieve.pollStatus();
      if (onProgress && total > 0) {
        onProgress({ current: total, total, message: 'Status: Completed' });
      }

      if (MetadataService.isCanceled(result.response.status)) {
        return {
          success: false,
          message: 'Retrieve cancelled',
        };
      }

      if (result.response.success) {
        return {
          success: true,
          message: `Successfully retrieved ${components.length} component(s)`,
          details: components.map((component) => `${component.type}: ${component.fullName}`),
        };
      }

      const messages = result.response.messages;
      const details = Array.isArray(messages)
        ? messages.map((message) => (typeof message === 'string' ? message : message.problem ?? 'Unknown error'))
        : messages
        ? [typeof messages === 'string' ? messages : messages.problem ?? 'Unknown error']
        : ['Unknown error'];

      return {
        success: false,
        message: 'Retrieve failed',
        details,
      };
    } catch (error) {
      if (MetadataService.isCanceled(error instanceof Error ? error.message : undefined)) {
        return {
          success: false,
          message: 'Retrieve cancelled',
        };
      }

      return {
        success: false,
        message: `Retrieve error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  public async deploy(
    components: MetadataComponent[],
    onProgress?: (progress: MetadataProgress) => void,
    onCancelable?: (cancel: () => Promise<void>) => void
  ): Promise<{ success: boolean; message: string; details?: string[] }> {
    try {
      const packagePaths = await this.getPackagePaths();
      const fullComponentSet = ComponentSet.fromSource({ fsPaths: packagePaths });
      const componentSet = new ComponentSet();

      for (const component of components) {
        const sourceComponents = fullComponentSet.getSourceComponents({
          fullName: component.fullName,
          type: component.type,
        });

        for (const sourceComponent of sourceComponents) {
          componentSet.add(sourceComponent);
        }
      }

      if (componentSet.size === 0) {
        return {
          success: false,
          message: 'No local components found to deploy',
        };
      }

      const deploy = await componentSet.deploy({
        usernameOrConnection: this.connection,
      });

      onCancelable?.(async () => {
        const cancel = (deploy as { cancel?: () => Promise<unknown> }).cancel;
        if (typeof cancel === 'function') {
          await cancel.call(deploy);
        }
      });

      const total = components.length;
      const resolveDeployMessage = (payload: {
        status?: string;
        details?: {
          componentFailures?:
            | { fullName?: string; problem?: string; problemType?: 'Warning' | 'Error' }
            | Array<{ fullName?: string; problem?: string; problemType?: 'Warning' | 'Error' }>;
        };
      }): string | undefined => {
        const failures = payload.details?.componentFailures;
        if (failures) {
          const failureList = Array.isArray(failures) ? failures : [failures];
          const first = failureList[0];
          if (first?.problem) {
            const label = first.problemType ?? 'Error';
            const name = first.fullName ? ` ${first.fullName}` : '';
            return `${label}:${name} ${first.problem}`.trim();
          }
        }
        return payload.status ? `Status: ${payload.status}` : undefined;
      };

      if (typeof (deploy as { onUpdate?: (cb: (update: unknown) => void) => void }).onUpdate === 'function') {
        deploy.onUpdate((update: unknown) => {
          if (!onProgress) return;
          const payload = update as {
            numberComponentsDeployed?: number;
            numberComponentsTotal?: number;
            status?: string;
            details?: {
              componentFailures?:
                | { fullName?: string; problem?: string; problemType?: 'Warning' | 'Error' }
                | Array<{ fullName?: string; problem?: string; problemType?: 'Warning' | 'Error' }>;
            };
          };
          const current = payload.numberComponentsDeployed;
          const totalFromUpdate = payload.numberComponentsTotal ?? total;
          const message = resolveDeployMessage(payload);
          if (typeof current === 'number') {
            onProgress({
              current,
              total: totalFromUpdate,
              message,
            });
          }
        });
      }

      const result = await deploy.pollStatus();
      if (onProgress && total > 0) {
        onProgress({ current: total, total, message: 'Status: Completed' });
      }

      if (MetadataService.isCanceled(result.response.status)) {
        return {
          success: false,
          message: 'Deploy cancelled',
        };
      }

      if (result.response.success) {
        return {
          success: true,
          message: `Successfully deployed ${components.length} component(s)`,
          details: components.map((component) => `${component.type}: ${component.fullName}`),
        };
      }

      const failures = result.response.details?.componentFailures;
      const failureMessages = Array.isArray(failures)
        ? failures.map((failure) => `${failure.fullName ?? 'Unknown'}: ${failure.problem ?? 'Unknown error'}`)
        : failures
        ? [`${failures.fullName ?? 'Unknown'}: ${failures.problem ?? 'Unknown error'}`]
        : ['Unknown error'];

      return {
        success: false,
        message: 'Deploy failed',
        details: failureMessages,
      };
    } catch (error) {
      if (MetadataService.isCanceled(error instanceof Error ? error.message : undefined)) {
        return {
          success: false,
          message: 'Deploy cancelled',
        };
      }

      return {
        success: false,
        message: `Deploy error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async listAllLocalSourceComponents(): Promise<SourceComponent[]> {
    const resolver = new MetadataResolver();
    const packagePaths = await this.getPackagePaths();
    const seen = new Set<string>();
    const all: SourceComponent[] = [];

    for (const packagePath of packagePaths) {
      const roots = resolver.getComponentsFromPath(packagePath);
      for (const root of roots) {
        const tree = MetadataService.collectComponentTree(root);
        for (const component of tree) {
          const key = MetadataService.localComponentKey(component);
          if (seen.has(key)) {
            continue;
          }

          seen.add(key);
          all.push(component);
        }
      }
    }

    return all;
  }

  private async getPackagePaths(): Promise<string[]> {
    try {
      const project = await SfProject.resolve(this.projectPath);
      const packages = project.getUniquePackageDirectories();
      if (packages.length > 0) {
        return packages.map((pkg) => pkg.fullPath);
      }
    } catch (error) {
      void error;
    }

    return [this.projectPath];
  }
}
