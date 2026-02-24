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

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Args } from '@oclif/core';
import { Messages } from '@salesforce/core';
import React from 'react';
import { render } from 'ink';
import App from '../../components/App.js';

// Enable mouse tracking in terminal
const enableMouseTracking = (): void => {
  // Enable mouse tracking (X10 compatibility mode + normal tracking + button event tracking)
  process.stdout.write('\x1b[?1000h'); // X10 mouse tracking
  process.stdout.write('\x1b[?1002h'); // Button event tracking
  process.stdout.write('\x1b[?1015h'); // UTF-8 mouse mode
  process.stdout.write('\x1b[?1006h'); // SGR mouse mode (for terminals that support it)
};

const disableMouseTracking = (): void => {
  // Disable mouse tracking
  process.stdout.write('\x1b[?1006l');
  process.stdout.write('\x1b[?1015l');
  process.stdout.write('\x1b[?1002l');
  process.stdout.write('\x1b[?1000l');
};

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-metaexplorer', 'metadata.explorer');

export default class MetadataExplorer extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.optionalOrg({
      summary: messages.getMessage('flags.target-org.summary'),
    }),
    preload: Flags.string({
      char: 'p',
      summary: messages.getMessage('flags.preload.summary'),
      multiple: true,
    }),
  };

  public static readonly args = {
    hashes: Args.string({
      description: messages.getMessage('flags.preload.summary'),
      multiple: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(MetadataExplorer);
    const projectPath = process.cwd();
    const rawArgs = this.argv;
    const hasPreloadFlag = rawArgs.includes('-p') || rawArgs.includes('--preload');
    const preloadCommits = hasPreloadFlag
      ? [...(flags.preload ?? []), ...(args.hashes ?? [])].filter((hash) => Boolean(hash))
      : [];

    enableMouseTracking();

    try {
      const { waitUntilExit } = render(
        React.createElement(App, {
          initialOrg: flags['target-org'],
          projectPath,
          preloadCommits,
        }),
        { patchConsole: true }
      );

      await waitUntilExit();
    } finally {
      disableMouseTracking();
    }
  }
}
