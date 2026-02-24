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

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { SfProject } from '@salesforce/core';

export type GitFileResult = {
  files: string[];
  warnings: string[];
};

export type GitBehindInfo = {
  count: number;
  upstream: string;
};

const normalizePath = (value: string): string => value.replace(/\\/g, '/');
const COMMIT_HASH_REGEX = /^[0-9a-f]{7,40}$/i;

const filterFilesToPackages = (files: string[], packageDirs: string[]): string[] => {
  if (packageDirs.length === 0) {
    return files;
  }

  const normalizedDirs = packageDirs.map((dir) => normalizePath(dir).replace(/\/$/, ''));
  return files.filter((file) => normalizedDirs.some((dir) => file === dir || file.startsWith(`${dir}/`)));
};

export class GitService {
  public static async getPackageDirectories(projectPath: string): Promise<string[]> {
    try {
      const project = await SfProject.resolve(projectPath);
      const packages = project.getUniquePackageDirectories();
      return packages
        .map((pkg) => normalizePath(path.relative(projectPath, pkg.fullPath)))
        .filter((dir) => dir.length > 0 && dir !== '.');
    } catch {
      return [];
    }
  }

  public static async getModifiedFilesFromCommits(projectPath: string, commitHashes: string[]): Promise<GitFileResult> {
    const warnings: string[] = [];
    const packageDirs = await GitService.getPackageDirectories(projectPath);
    let allFiles: string[] = [];

    for (const commitHash of commitHashes) {
      const { files, warning } = GitService.getModifiedFilesFromCommit(projectPath, commitHash);
      if (warning) {
        warnings.push(warning);
      }
      allFiles = allFiles.concat(files);
    }

    const uniqueFiles = Array.from(new Set(allFiles.map(normalizePath))).filter((file) => file.length > 0);
    const filtered = filterFilesToPackages(uniqueFiles, packageDirs);

    if (uniqueFiles.length > 0 && filtered.length === 0 && packageDirs.length > 0) {
      warnings.push('No files matched the configured packageDirectories.');
    }

    return { files: filtered, warnings };
  }

  public static getBehindCount(projectPath: string): GitBehindInfo | null {
    try {
      const upstream = execFileSync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
        encoding: 'utf8',
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();

      if (!upstream) {
        return null;
      }

      const countRaw = execFileSync('git', ['rev-list', 'HEAD..@{u}', '--count'], {
        encoding: 'utf8',
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();

      const count = Number.parseInt(countRaw, 10);
      if (!Number.isFinite(count) || count <= 0) {
        return null;
      }

      return { count, upstream };
    } catch {
      return null;
    }
  }

  private static getModifiedFilesFromCommit(
    projectPath: string,
    commitHash: string
  ): { files: string[]; warning?: string } {
    if (!COMMIT_HASH_REGEX.test(commitHash)) {
      return {
        files: [],
        warning: `Invalid commit hash format: ${commitHash}`,
      };
    }

    try {
      const output = execFileSync(
        'git',
        ['diff-tree', '-r', '--no-commit-id', '--name-only', '--diff-filter=ACMRT', commitHash],
        { encoding: 'utf8', cwd: projectPath }
      )
        .split('\n')
        .map((file) => file.trim())
        .filter((file) => file.length > 0);

      if (output.length > 0) {
        return { files: output };
      }

      try {
        const mergeParent = execFileSync('git', ['rev-parse', `${commitHash}^2`], {
          encoding: 'utf8',
          cwd: projectPath,
        }).trim();
        const mergeBase = execFileSync('git', ['merge-base', `${commitHash}^1`, mergeParent], {
          encoding: 'utf8',
          cwd: projectPath,
        }).trim();
        const mergeOutput = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRT', mergeBase, commitHash], {
          encoding: 'utf8',
          cwd: projectPath,
        })
          .split('\n')
          .map((file) => file.trim())
          .filter((file) => file.length > 0);

        return { files: mergeOutput };
      } catch {
        return { files: [], warning: `Could not resolve merge files for ${commitHash}.` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { files: [], warning: `Error processing commit ${commitHash}: ${message}` };
    }
  }
}
