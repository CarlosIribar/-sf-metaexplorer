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

import { useState, useEffect, useCallback } from 'react';
import { Connection } from '@salesforce/core';
import { OrgInfo } from '../types/index.js';
import { orgService } from '../services/index.js';

export type UseOrgsReturn = {
  orgs: OrgInfo[];
  currentOrg: OrgInfo | null;
  connection: Connection | null;
  isLoading: boolean;
  error: Error | null;
  switchOrg: (usernameOrAlias: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useOrgs(initialUsername?: string): UseOrgsReturn {
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgInfo | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOrgs = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const orgList = await orgService.listOrgs();
      setOrgs(orgList);

      let current: OrgInfo | null = null;
      if (initialUsername) {
        current = orgList.find((org) => org.username === initialUsername || org.alias === initialUsername) ?? null;
      }
      if (!current) {
        current = orgList.find((org) => org.isDefault) ?? orgList[0] ?? null;
      }

      if (current) {
        setCurrentOrg(current);
        const conn = await orgService.getConnection(current.username);
        setConnection(conn);
      } else {
        setCurrentOrg(null);
        setConnection(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load orgs'));
    } finally {
      setIsLoading(false);
    }
  }, [initialUsername]);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  const switchOrg = useCallback(
    async (usernameOrAlias: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const conn = await orgService.getConnection(usernameOrAlias);
        const targetOrg = orgs.find((org) => org.username === usernameOrAlias || org.alias === usernameOrAlias);

        if (targetOrg) {
          setCurrentOrg(targetOrg);
          setConnection(conn);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to switch org'));
      } finally {
        setIsLoading(false);
      }
    },
    [orgs]
  );

  return {
    orgs,
    currentOrg,
    connection,
    isLoading,
    error,
    switchOrg,
    refresh: loadOrgs,
  };
}
