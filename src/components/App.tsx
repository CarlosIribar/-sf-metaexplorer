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

import * as path from 'node:path';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Org } from '@salesforce/core';
import { MetadataResolver } from '@salesforce/source-deploy-retrieve';
import { useMetadata, useOrgs, useSelection, useSyncState } from '../hooks/index.js';
import {
  MetadataComponent,
  MetadataProgress,
  OrgInfo,
  PanelType,
  PersistedUiState,
  SelectionScope,
  ViewMode,
} from '../types/index.js';
import { GitService, GitBehindInfo } from '../services/index.js';
import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS } from '../utils/colors.js';
import { Header, Loading, MultiSelectList, SearchInput, StatusBar, TreeView } from './common/index.js';
import { ListItem } from './common/MultiSelectList.js';
import { TreeNode } from './common/TreeView.js';
import {
  ConfirmActionModal,
  HelpModal,
  ManageTypesModal,
  OrgSelectorModal,
  ProgressModal,
  ResultModal,
} from './modals/index.js';

interface AppProps {
  initialOrg?: Org;
  projectPath: string;
  preloadCommits?: string[];
  appVersion: string;
}

type Panel = Exclude<PanelType, 'actions'>;
type ActionType = 'retrieve' | 'deploy';
type OperationType = 'retrieve' | 'deploy' | 'sync';

type ConfirmState = {
  action: ActionType;
  items: MetadataComponent[];
} | null;

type ProgressState = {
  operation: OperationType;
  message?: string;
  elapsedSeconds?: number;
  progress?: {
    current: number;
    total: number;
  };
} | null;

type ResultState = {
  success: boolean;
  title: string;
  message: string;
  details?: string[];
} | null;

const HEADER_HEIGHT = 3;
const STATUSBAR_HEIGHT = 5;
const SEARCH_HEIGHT = 3;
const PANEL_HEADER_HEIGHT = 1;
const BORDERS = 2;

const DEFAULT_SUBSCRIBED_TYPES = ['ApexClass', 'ApexTrigger', 'LightningComponentBundle', 'AuraDefinitionBundle'];

const OBJECT_RELATED_TYPES = new Set([
  'CustomObject',
  'CustomField',
  'ValidationRule',
  'RecordType',
  'BusinessProcess',
  'FieldSet',
  'CompactLayout',
  'ListView',
  'WebLink',
  'Layout',
  'SharingReason',
]);

// eslint-disable-next-line complexity
const App: React.FC<AppProps> = ({ initialOrg, projectPath, preloadCommits, appVersion }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const initialUsername = initialOrg?.getUsername() ?? undefined;

  const { orgs, currentOrg, connection, isLoading: orgLoading, error: orgError, switchOrg } = useOrgs(initialUsername);

  const [subscribedTypes, setSubscribedTypes] = useState<string[]>(DEFAULT_SUBSCRIBED_TYPES);

  const {
    allTypes,
    types,
    selectedType,
    isLoading: metadataLoading,
    error: metadataError,
    setSelectedType,
    refresh,
    retrieve,
    deploy,
    getTypeComponents,
    getLocalTypeComponents,
  } = useMetadata(connection, projectPath, subscribedTypes);

  const [cachedByType, setCachedByType] = useState<Record<string, MetadataComponent[]>>({});
  const allCachedComponents = useMemo(() => Object.values(cachedByType).flat(), [cachedByType]);
  const selection = useSelection(allCachedComponents);

  // Stable refs for selection methods to avoid infinite re-render loops.
  // The `selection` object is recreated each render, so using it directly
  // as a useEffect dependency causes: effect fires -> deselectAll() ->
  // new selectedIds -> new selection object -> effect fires again -> ...
  const toggleMultipleRef = useRef(selection.toggleMultiple);
  toggleMultipleRef.current = selection.toggleMultiple;
  const selectAllRef = useRef(selection.selectAll);
  selectAllRef.current = selection.selectAll;

  const {
    lastSyncFormatted,
    lastSyncOrg,
    uiState,
    updateSync,
    isLoading: syncLoading,
    getCachedMetadata,
    setCachedMetadata,
    setUiState,
    getSubscriptions,
    setSubscriptions,
  } = useSyncState(projectPath);

  const [activePanel, setActivePanel] = useState<Panel>('types');
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmState>(null);
  const [progress, setProgress] = useState<ProgressState>(null);
  const [isCancellingOperation, setIsCancellingOperation] = useState(false);
  const [result, setResult] = useState<ResultState>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [pendingTypeToggle, setPendingTypeToggle] = useState<{ typeName: string; scope: SelectionScope } | null>(null);
  const [selectionScope, setSelectionScope] = useState<SelectionScope>({ scope: 'unpackaged' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['unpackaged', 'packages']));
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [groupByObject, setGroupByObject] = useState(true);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCancelRef = useRef<(() => Promise<void>) | null>(null);
  const restoredUiRef = useRef(false);
  const preloadDoneRef = useRef(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [usingLocalBaseline, setUsingLocalBaseline] = useState(false);
  const [behindInfo, setBehindInfo] = useState<GitBehindInfo | null>(null);

  // Calculate available height for content area
  const terminalHeight = stdout?.rows ?? 24;
  const contentHeight = Math.max(10, terminalHeight - HEADER_HEIGHT - STATUSBAR_HEIGHT);
  const warningHeight = behindInfo ? 1 : 0;
  const bodyHeight = Math.max(8, contentHeight - warningHeight);
  const listHeight = bodyHeight - PANEL_HEADER_HEIGHT - BORDERS;

  const isLoading = [orgLoading, metadataLoading, syncLoading].some(Boolean);
  const hasModalOpen = [orgModalOpen, manageTypesOpen, confirmAction, progress, result, helpOpen].some(Boolean);

  const orgName = currentOrg?.alias ?? currentOrg?.username ?? (orgLoading ? 'Loading...' : 'No org connected');

  const isCacheStale = Boolean(currentOrg && lastSyncOrg && currentOrg.username !== lastSyncOrg);
  const cacheStatus: 'fresh' | 'stale' | 'empty' = isCacheStale ? 'stale' : lastSyncOrg ? 'fresh' : 'empty';

  const statusLoadingMessage =
    progress?.message ??
    (orgLoading
      ? 'Loading orgs...'
      : metadataLoading
      ? 'Loading metadata...'
      : syncLoading
      ? 'Loading sync...'
      : undefined);

  useEffect(() => {
    const loadSubscriptions = async (): Promise<void> => {
      if (!currentOrg) {
        return;
      }

      const stored = await getSubscriptions(currentOrg.username);
      if (stored && stored.length > 0) {
        setSubscribedTypes(stored);
      } else {
        setSubscribedTypes(DEFAULT_SUBSCRIBED_TYPES);
        await setSubscriptions(currentOrg.username, DEFAULT_SUBSCRIBED_TYPES);
      }
    };

    void loadSubscriptions();
  }, [currentOrg, getSubscriptions, setSubscriptions]);

  useEffect(() => {
    if (!selectedType) {
      return;
    }

    if (!subscribedTypes.includes(selectedType)) {
      setSelectedType(null);
      setSelectedNodeId(undefined);
      setSelectionScope({ scope: 'unpackaged' });
    }
  }, [selectedType, setSelectedType, subscribedTypes]);

  useEffect(() => {
    if (types.length === 0) {
      setCacheLoaded(false);
      return;
    }

    const loadCachedCounts = async (): Promise<void> => {
      const entries = await Promise.all(
        types.map(async (type) => {
          if (isCacheStale) {
            return [type.name, []] as const;
          }

          const cached = await getCachedMetadata(type.name);
          return [type.name, cached?.components ?? []] as const;
        })
      );

      const cachedMap = Object.fromEntries(entries) as Record<string, MetadataComponent[]>;
      const emptyTypeNames = types
        .map((type) => type.name)
        .filter((typeName) => (cachedMap[typeName] ?? []).length === 0);

      let hydratedLocally = false;
      if (emptyTypeNames.length > 0) {
        const localByType = await getLocalTypeComponents(emptyTypeNames);
        for (const typeName of emptyTypeNames) {
          const localComponents = localByType[typeName] ?? [];
          if (localComponents.length > 0) {
            cachedMap[typeName] = localComponents;
            hydratedLocally = true;
          }
        }
      }

      setCachedByType(cachedMap);
      setUsingLocalBaseline(hydratedLocally);
      setCacheLoaded(true);
    };

    void loadCachedCounts();
  }, [getCachedMetadata, getLocalTypeComponents, isCacheStale, types]);

  useEffect(() => {
    setBehindInfo(GitService.getBehindCount(projectPath));
  }, [projectPath]);

  useEffect(() => {
    if (restoredUiRef.current || !uiState || types.length === 0 || isCacheStale) {
      return;
    }

    restoredUiRef.current = true;

    const hasType = uiState.lastSelectedType ? types.some((type) => type.name === uiState.lastSelectedType) : false;

    if (uiState.lastPanel && uiState.lastPanel !== 'actions') {
      setActivePanel(uiState.lastPanel);
    }

    if (uiState.lastViewMode) {
      setViewMode(uiState.lastViewMode);
    }

    if (uiState.lastSelectedNodeId) {
      setSelectedNodeId(uiState.lastSelectedNodeId);
      const parsed = parseNodeId(uiState.lastSelectedNodeId);
      if (parsed?.scope) {
        setSelectionScope(parsed.scope);
      }
      if (parsed?.typeName) {
        setSelectedType(parsed.typeName);
      }
      return;
    }

    if (hasType) {
      setSelectedType(uiState.lastSelectedType ?? null);
    }

    if (uiState.lastSelectionScope) {
      setSelectionScope(uiState.lastSelectionScope);
    }
  }, [isCacheStale, setSelectedType, types, uiState]);

  useEffect(() => {
    if (restoredUiRef.current || types.length === 0 || isCacheStale) {
      return;
    }

    restoredUiRef.current = true;
  }, [isCacheStale, types.length]);

  useEffect(() => {
    if (!restoredUiRef.current) {
      return;
    }

    const payload: PersistedUiState = {
      lastPanel: activePanel,
      lastSelectedType: selectedType,
      lastSelectedNodeId: selectedNodeId,
      lastSelectionScope: selectionScope,
      lastViewMode: viewMode,
    };

    void setUiState(payload);
  }, [activePanel, selectedNodeId, selectedType, selectionScope, setUiState, viewMode]);

  useEffect(() => {
    if (!preloadCommits || preloadCommits.length === 0) {
      return;
    }

    if (preloadDoneRef.current || !cacheLoaded) {
      return;
    }

    const hasHydratedSubscribedTypes = subscribedTypes.every((typeName) =>
      Object.prototype.hasOwnProperty.call(cachedByType, typeName)
    );
    if (!hasHydratedSubscribedTypes) {
      return;
    }

    const preload = async (): Promise<void> => {
      const { files, warnings } = await GitService.getModifiedFilesFromCommits(projectPath, preloadCommits);

      if (files.length === 0) {
        setResult({
          success: false,
          title: 'No files found',
          message: 'No files were detected for the provided commits.',
          details: warnings.length > 0 ? warnings.map((warning) => `Warning: ${warning}`) : undefined,
        });
        return;
      }

      const resolver = new MetadataResolver();
      const resolvedByFile = new Map<string, ReturnType<typeof resolver.getComponentsFromPath>>();
      const resolvedTypes = new Set<string>();

      for (const file of files) {
        let resolved: ReturnType<typeof resolver.getComponentsFromPath> = [];
        try {
          resolved = resolver.getComponentsFromPath(path.join(projectPath, file));
        } catch {
          resolved = [];
        }
        resolvedByFile.set(file, resolved);
        resolved.forEach((component) => resolvedTypes.add(component.type.name));
      }

      const missingSubscribed = Array.from(resolvedTypes).filter((typeName) => !subscribedTypes.includes(typeName));
      if (missingSubscribed.length > 0) {
        const nextSubscribedTypes = Array.from(new Set([...subscribedTypes, ...missingSubscribed])).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
        setSubscribedTypes(nextSubscribedTypes);
        if (currentOrg) {
          await setSubscriptions(currentOrg.username, nextSubscribedTypes);
        }
        setResult({
          success: true,
          title: 'Types auto-added',
          message: `Added ${missingSubscribed.length} type(s) to subscriptions. Re-running preload...`,
          details: missingSubscribed.map((typeName) => `Added: ${typeName}`),
        });
        return;
      }

      preloadDoneRef.current = true;

      const componentMap = new Map<string, MetadataComponent>();
      allCachedComponents.forEach((component) => {
        componentMap.set(`${component.type}:${component.fullName}`, component);
      });

      const matchedIds = new Set<string>();
      const unmatchedFiles: string[] = [];

      for (const file of files) {
        const resolved = resolvedByFile.get(file) ?? [];
        if (resolved.length === 0) {
          unmatchedFiles.push(file);
          continue;
        }

        let matched = false;
        for (const resolvedComponent of resolved) {
          const key = `${resolvedComponent.type.name}:${resolvedComponent.fullName}`;
          const cached = componentMap.get(key);
          if (cached) {
            matchedIds.add(cached.id);
            matched = true;
          }
        }

        if (!matched) {
          unmatchedFiles.push(file);
        }
      }

      const matchedComponents = allCachedComponents.filter((component) => matchedIds.has(component.id));
      selectAllRef.current(matchedComponents);
      setViewMode('selected');
      setActivePanel('components');
      setSearchQuery('');
      setSearchActive(false);

      const details = [
        ...warnings.map((warning) => `Warning: ${warning}`),
        ...unmatchedFiles.map((file) => `Unmatched: ${file}`),
      ];

      setResult({
        success: matchedComponents.length > 0,
        title: matchedComponents.length > 0 ? 'Preload complete' : 'Preload incomplete',
        message: `Matched ${matchedComponents.length} component(s) from ${files.length} file(s) using ${
          usingLocalBaseline ? 'local baseline' : 'sync cache'
        }.`,
        details: details.length > 0 ? details : undefined,
      });
    };

    void preload();
  }, [
    allCachedComponents,
    cacheLoaded,
    preloadCommits,
    projectPath,
    cachedByType,
    currentOrg,
    setSubscriptions,
    subscribedTypes,
    usingLocalBaseline,
  ]);

  useEffect(() => {
    if (!pendingTypeToggle || pendingTypeToggle.typeName !== selectedType) {
      return;
    }

    const typeComponents = cachedByType[pendingTypeToggle.typeName] ?? [];
    const scopedComponents =
      pendingTypeToggle.scope.scope === 'unpackaged'
        ? typeComponents.filter((component) => !component.packageName)
        : typeComponents.filter((component) => component.packageName === pendingTypeToggle.scope.packageName);
    const typeIds = scopedComponents.map((component) => component.id);
    toggleMultipleRef.current(typeIds);
    setPendingTypeToggle(null);
  }, [cachedByType, pendingTypeToggle, selectedType]);

  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [types]
  );

  const packageInfo = useMemo(() => {
    const index = new Map<string, Set<string>>();
    const counts = new Map<string, Set<string>>();

    for (const type of sortedTypes) {
      const cachedComponents = cachedByType[type.name] ?? [];
      for (const component of cachedComponents) {
        if (!component.packageName) continue;
        const pkg = component.packageName;
        const typeSet = index.get(pkg) ?? new Set<string>();
        typeSet.add(type.name);
        index.set(pkg, typeSet);

        const countSet = counts.get(pkg) ?? new Set<string>();
        countSet.add(component.fullName);
        counts.set(pkg, countSet);
      }
    }

    return { index, counts };
  }, [cachedByType, sortedTypes]);

  const packageNames = useMemo(
    () => Array.from(packageInfo.index.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [packageInfo.index]
  );

  useEffect(() => {
    if (sortedTypes.length === 0) {
      return;
    }

    if (!selectedType) {
      const defaultType = sortedTypes[0].name;
      setSelectionScope({ scope: 'unpackaged' });
      setSelectedType(defaultType);
      setSelectedNodeId(`unpackaged:type:${defaultType}`);
      return;
    }

    if (!selectedNodeId) {
      setSelectedNodeId(`unpackaged:type:${selectedType}`);
    }
  }, [selectedNodeId, selectedType, setSelectedType, sortedTypes]);

  const typeComponents = useMemo(
    () => (selectedType ? cachedByType[selectedType] ?? [] : []),
    [cachedByType, selectedType]
  );

  const scopedComponents = useMemo(() => {
    if (selectionScope.scope === 'unpackaged') {
      return typeComponents.filter((component) => !component.packageName);
    }
    return typeComponents.filter((component) => component.packageName === selectionScope.packageName);
  }, [selectionScope, typeComponents]);

  const viewComponents = useMemo(
    () => (viewMode === 'selected' ? selection.selectedComponents : scopedComponents),
    [scopedComponents, selection.selectedComponents, viewMode]
  );

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) {
      return viewComponents;
    }
    const query = searchQuery.toLowerCase();
    return viewComponents.filter((component) =>
      `${component.fullName} ${component.type}`.toLowerCase().includes(query)
    );
  }, [searchQuery, viewComponents]);

  const sortedComponents = useMemo(
    () =>
      [...filteredComponents].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })),
    [filteredComponents]
  );

  const emptyMessage = useMemo(() => {
    if (viewMode === 'selected') {
      return 'No selected components';
    }
    if (isCacheStale && lastSyncOrg) {
      return `Cache belongs to ${lastSyncOrg}. Press s to sync.`;
    }
    if (cacheStatus === 'empty') {
      return 'No cache available. Press s to sync.';
    }
    return 'No components to display';
  }, [cacheStatus, isCacheStale, lastSyncOrg, viewMode]);

  const listItems = useMemo<ListItem[]>(
    () =>
      sortedComponents.map((component) => ({
        id: component.id,
        label: viewMode === 'selected' ? `${component.type}: ${component.fullName}` : component.fullName,
        status: component.status,
        selected: selection.isSelected(component.id),
      })),
    [sortedComponents, selection, viewMode]
  );

  const getSelectionState = useCallback(
    (comps: MetadataComponent[]): TreeNode['selectionState'] => {
      if (comps.length === 0) return 'none';
      const selectedCount = comps.filter((component) => selection.isSelected(component.id)).length;
      if (selectedCount === 0) return 'none';
      if (selectedCount === comps.length) return 'all';
      return 'partial';
    },
    [selection]
  );

  const groupedComponents = useMemo(() => {
    if (!selectedType || viewMode !== 'all' || !groupByObject || !OBJECT_RELATED_TYPES.has(selectedType)) {
      return null;
    }

    const groupMap = new Map<string, MetadataComponent[]>();

    for (const component of sortedComponents) {
      const objectName = ((): string => {
        if (component.type === 'CustomObject') {
          return component.fullName;
        }
        if (component.fullName.includes('.')) {
          return component.fullName.split('.')[0];
        }
        if (component.fullName.includes('-')) {
          return component.fullName.split('-')[0];
        }
        return 'Uncategorized';
      })();

      const list = groupMap.get(objectName) ?? [];
      list.push(component);
      groupMap.set(objectName, list);
    }

    const groupIds = new Map<string, string[]>();

    const nodes = Array.from(groupMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([objectName, comps]) => {
        const sortedChildren = [...comps].sort((a, b) =>
          a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
        );
        const ids = sortedChildren.map((component) => component.id);
        groupIds.set(objectName, ids);

        const children: TreeNode[] = sortedChildren.map((component) => {
          const displayName = ((): string => {
            if (component.type === 'CustomObject') {
              return component.fullName;
            }
            if (component.fullName.startsWith(`${objectName}.`)) {
              return component.fullName.slice(objectName.length + 1);
            }
            if (component.fullName.startsWith(`${objectName}-`)) {
              return component.fullName.slice(objectName.length + 1);
            }
            return component.fullName;
          })();

          const statusLabel = STATUS_LABELS[component.status];
          const statusIcon = STATUS_ICONS[component.status];

          return {
            id: `component:${component.id}`,
            label: `${statusIcon} ${displayName} [${statusLabel}]`,
            color: STATUS_COLORS[component.status],
            selectionState: selection.isSelected(component.id) ? 'all' : 'none',
          };
        });

        const selectionState = getSelectionState(comps);

        return {
          id: `object:${objectName}`,
          label: objectName,
          count: comps.length,
          children,
          isExpanded: expandedNodes.has(`object:${objectName}`),
          selectionState,
        } as TreeNode;
      });

    return { nodes, groupIds };
  }, [expandedNodes, getSelectionState, groupByObject, selectedType, selection, sortedComponents, viewMode]);

  const isGroupingAvailable = Boolean(selectedType && OBJECT_RELATED_TYPES.has(selectedType) && viewMode === 'all');
  const isGroupedView = Boolean(groupedComponents) && isGroupingAvailable && groupByObject;

  const typeNodes = useMemo<TreeNode[]>(() => {
    const unpackagedChildren = sortedTypes.map((type) => {
      const cachedComponents = cachedByType[type.name] ?? [];
      const cachedUnpackaged = cachedComponents.filter((component) => !component.packageName);
      const unpackagedCount = new Set(cachedUnpackaged.map((component) => component.fullName)).size;
      const isActive = selectionScope.scope === 'unpackaged' && selectedType === type.name;
      const selectionState = isActive ? getSelectionState(scopedComponents) : 'none';

      return {
        id: `unpackaged:type:${type.name}`,
        label: type.name,
        count: isActive ? scopedComponents.length : unpackagedCount,
        selectionState,
      };
    });

    const packageChildren = packageNames.map((packageName) => {
      const typeSet = packageInfo.index.get(packageName) ?? new Set<string>();
      const typeNames = Array.from(typeSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      const countSet = packageInfo.counts.get(packageName) ?? new Set<string>();
      const children = typeNames.map((typeName) => {
        const cachedComponents = cachedByType[typeName] ?? [];
        const packageComponents = cachedComponents.filter((component) => component.packageName === packageName);
        const packageCount = new Set(packageComponents.map((component) => component.fullName)).size;
        const isActive =
          selectionScope.scope === 'package' && selectionScope.packageName === packageName && selectedType === typeName;
        const selectionState = isActive ? getSelectionState(scopedComponents) : 'none';

        return {
          id: `package:${packageName}:type:${typeName}`,
          label: typeName,
          count: isActive ? scopedComponents.length : packageCount,
          selectionState,
        };
      });

      return {
        id: `package:${packageName}`,
        label: packageName,
        count: countSet.size,
        children,
        isExpanded: expandedNodes.has(`package:${packageName}`),
      };
    });

    return [
      {
        id: 'unpackaged',
        label: 'Unpackaged',
        children: unpackagedChildren,
        isExpanded: expandedNodes.has('unpackaged'),
      },
      {
        id: 'packages',
        label: 'Packages',
        children: packageChildren,
        isExpanded: expandedNodes.has('packages'),
      },
    ];
  }, [
    cachedByType,
    expandedNodes,
    getSelectionState,
    packageInfo,
    packageNames,
    scopedComponents,
    selectedType,
    selectionScope,
    sortedTypes,
  ]);

  const openConfirm = (action: ActionType): void => {
    if (!currentOrg || !connection) {
      setResult({
        success: false,
        title: 'No org connected',
        message: 'Connect to an org before running operations.',
      });
      return;
    }

    if (selection.selectedComponents.length === 0) {
      setResult({
        success: false,
        title: 'No components selected',
        message: `Select at least one component to ${action}.`,
      });
      return;
    }

    setConfirmAction({
      action,
      items: selection.selectedComponents,
    });
  };

  const parseNodeId = (nodeId: string): { scope: SelectionScope; typeName?: string } | null => {
    if (nodeId.startsWith('unpackaged:type:')) {
      const typeName = nodeId.replace('unpackaged:type:', '');
      return { scope: { scope: 'unpackaged' }, typeName };
    }

    if (nodeId.startsWith('package:')) {
      const remainder = nodeId.replace('package:', '');
      const [packageName, typeMarker, typeName] = remainder.split(':');
      if (typeMarker === 'type' && typeName) {
        return { scope: { scope: 'package', packageName }, typeName };
      }
      return { scope: { scope: 'package', packageName } };
    }

    return null;
  };

  const handleTypeSelect = (node: TreeNode): void => {
    const parsed = parseNodeId(node.id);
    setSelectedNodeId(node.id);

    if (!parsed?.typeName) {
      return;
    }

    setSelectionScope(parsed.scope);
    setSelectedType(parsed.typeName);
    setViewMode('all');
    setActivePanel('components');
  };

  const handleTypeToggle = (node: TreeNode): void => {
    const parsed = parseNodeId(node.id);
    setSelectedNodeId(node.id);

    if (!parsed?.typeName) {
      return;
    }

    if (
      parsed.typeName !== selectedType ||
      parsed.scope.scope !== selectionScope.scope ||
      parsed.scope.packageName !== selectionScope.packageName
    ) {
      setPendingTypeToggle({ typeName: parsed.typeName, scope: parsed.scope });
      setSelectionScope(parsed.scope);
      setSelectedType(parsed.typeName);
      setViewMode('all');
      setActivePanel('components');
      return;
    }

    const typeIds = scopedComponents.map((component) => component.id);
    selection.toggleMultiple(typeIds);
  };

  const handleToggleExpand = useCallback((node: TreeNode): void => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }, []);

  const handleGroupedSelect = useCallback(
    (node: TreeNode): void => {
      if (node.children && node.children.length > 0) {
        handleToggleExpand(node);
        return;
      }

      if (node.id.startsWith('component:')) {
        const componentId = node.id.replace('component:', '');
        selection.toggle(componentId);
      }
    },
    [handleToggleExpand, selection]
  );

  const handleGroupedToggle = useCallback(
    (node: TreeNode): void => {
      if (node.id.startsWith('component:')) {
        const componentId = node.id.replace('component:', '');
        selection.toggle(componentId);
        return;
      }

      if (node.id.startsWith('object:') && groupedComponents) {
        const objectName = node.id.replace('object:', '');
        const ids = groupedComponents.groupIds.get(objectName) ?? [];
        if (ids.length > 0) {
          selection.toggleMultiple(ids);
        }
      }
    },
    [groupedComponents, selection]
  );

  const handleToggleAll = (): void => {
    if (filteredComponents.length === 0) {
      return;
    }

    const ids = filteredComponents.map((component) => component.id);
    selection.toggleMultiple(ids);
  };

  const handleOrgSelect = async (orgInfo: OrgInfo): Promise<void> => {
    setOrgModalOpen(false);
    selection.deselectAll();
    setSelectedType(null);
    setSelectionScope({ scope: 'unpackaged' });
    setSelectedNodeId(undefined);
    setViewMode('all');
    setSearchQuery('');
    setSearchActive(false);
    setActivePanel('types');
    await switchOrg(orgInfo.username);
  };

  const handleSaveTypes = async (nextTypes: string[]): Promise<void> => {
    setManageTypesOpen(false);
    if (!currentOrg) {
      return;
    }

    await setSubscriptions(currentOrg.username, nextTypes);
    setSubscribedTypes(nextTypes);
    setSelectedType(null);
    setSelectedNodeId(undefined);
    setSelectionScope({ scope: 'unpackaged' });
    setActivePanel('types');

    if (nextTypes.length === 0) {
      setResult({
        success: false,
        title: 'No types selected',
        message: 'Select at least one metadata type to continue.',
      });
    }
  };

  const clearProgressTimer = (): void => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgress = (operation: OperationType, message: string, total?: number): void => {
    setIsCancellingOperation(false);
    clearProgressTimer();
    const startTime = Date.now();
    setProgress({
      operation,
      message,
      elapsedSeconds: 0,
      progress: total ? { current: 0, total } : undefined,
    });
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => (prev ? { ...prev, elapsedSeconds: Math.floor((Date.now() - startTime) / 1000) } : prev));
    }, 1000);
  };

  const handleProgressUpdate = (update: MetadataProgress): void => {
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            message: update.message ?? prev.message,
            progress: { current: update.current, total: update.total },
          }
        : prev
    );
  };

  const runRetrieve = async (items: MetadataComponent[]): Promise<void> => {
    setConfirmAction(null);
    startProgress('retrieve', 'Retrieving selected components...', items.length);
    try {
      const response = await retrieve(items, handleProgressUpdate, (cancel) => {
        activeCancelRef.current = cancel;
      });
      if (response.success) {
        await refresh();
      }
      setResult({
        success: response.success,
        title: response.success ? 'Retrieve complete' : 'Retrieve failed',
        message: response.message,
        details: response.details,
      });
    } catch (error) {
      setResult({
        success: false,
        title: 'Retrieve failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      activeCancelRef.current = null;
      setIsCancellingOperation(false);
      clearProgressTimer();
      setProgress(null);
    }
  };

  const runDeploy = async (items: MetadataComponent[]): Promise<void> => {
    setConfirmAction(null);
    startProgress('deploy', 'Deploying selected components...', items.length);
    try {
      const response = await deploy(items, handleProgressUpdate, (cancel) => {
        activeCancelRef.current = cancel;
      });
      if (response.success) {
        await refresh();
      }
      setResult({
        success: response.success,
        title: response.success ? 'Deploy complete' : 'Deploy failed',
        message: response.message,
        details: response.details,
      });
    } catch (error) {
      setResult({
        success: false,
        title: 'Deploy failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      activeCancelRef.current = null;
      setIsCancellingOperation(false);
      clearProgressTimer();
      setProgress(null);
    }
  };

  const cancelCurrentOperation = useCallback((): void => {
    if (!progress || (progress.operation !== 'retrieve' && progress.operation !== 'deploy')) {
      return;
    }

    if (!activeCancelRef.current || isCancellingOperation) {
      return;
    }

    setIsCancellingOperation(true);
    setProgress((prev) => (prev ? { ...prev, message: `Cancelling ${prev.operation}...` } : prev));
    void activeCancelRef.current().catch(() => {
      setIsCancellingOperation(false);
    });
  }, [isCancellingOperation, progress]);

  const togglePanel = useCallback((direction?: 'left' | 'right'): void => {
    if (direction === 'left') {
      setActivePanel('types');
      return;
    }

    if (direction === 'right') {
      setActivePanel('components');
      return;
    }

    setActivePanel((prev) => (prev === 'types' ? 'components' : 'types'));
  }, []);

  const inputHandlers: Record<string, () => void> = {
    o: () => setOrgModalOpen(true),
    r: () => openConfirm('retrieve'),
    d: () => openConfirm('deploy'),
    s: () => {
      void runSync();
    },
    v: () => {
      setViewMode((prev) => (prev === 'all' ? 'selected' : 'all'));
      setSearchActive(false);
      setActivePanel('components');
    },
    g: () => {
      setGroupByObject((prev) => !prev);
      setActivePanel('components');
    },
    t: () => setManageTypesOpen(true),
    n: () => selection.deselectAll(),
    '/': () => {
      setSearchActive(true);
      setActivePanel('components');
    },
    '?': () => setHelpOpen(true),
  };

  const runSync = async (): Promise<void> => {
    if (!currentOrg) {
      setResult({
        success: false,
        title: 'No org connected',
        message: 'Connect to an org before syncing metadata.',
      });
      return;
    }

    startProgress('sync', 'Refreshing metadata...', types.length);
    try {
      await refresh();
      const typeComponentMap = await getTypeComponents();
      const entries = Object.entries(typeComponentMap);
      await Promise.all(
        entries.map(async ([typeName, comps]) =>
          setCachedMetadata(typeName, {
            lastFetched: new Date(),
            components: comps,
          })
        )
      );
      const cachedMap = Object.fromEntries(entries);
      setCachedByType(cachedMap);
      await updateSync(
        currentOrg.username,
        types.map((type) => type.name)
      );
      setResult({
        success: true,
        title: 'Sync complete',
        message: 'Metadata refreshed successfully.',
      });
    } catch (error) {
      setResult({
        success: false,
        title: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      clearProgressTimer();
      setProgress(null);
    }
  };

  useInput(
    (input, key) => {
      if (progress && (input === 'c' || key.escape)) {
        cancelCurrentOperation();
        return;
      }

      if (hasModalOpen) {
        return;
      }

      if (searchActive) {
        if (key.escape) {
          setSearchQuery('');
          setSearchActive(false);
        }
        if (key.return) {
          setSearchActive(false);
        }
        return;
      }

      if (input === 'q') {
        exit();
        return;
      }

      if (key.tab) {
        togglePanel();
        return;
      }

      if (input === 'h') {
        togglePanel('left');
        return;
      }

      if (input === 'l') {
        togglePanel('right');
        return;
      }

      const handler = inputHandlers[input];
      if (handler) {
        handler();
      }
    },
    { isActive: true }
  );

  if ([orgError, metadataError].some(Boolean)) {
    return (
      <Box flexDirection="column">
        <Header title="SF Metadata Explorer" orgName={orgName} version={appVersion} />
        <Box padding={1}>
          <Text color="red">Failed to load metadata.</Text>
        </Box>
      </Box>
    );
  }

  if (isLoading && typeNodes.length === 0) {
    return <Loading message={statusLoadingMessage ?? 'Initializing...'} />;
  }

  return (
    <Box flexDirection="column" width="100%" height={terminalHeight}>
      <Header title="SF Metadata Explorer" orgName={orgName} version={appVersion} />

      <Box flexDirection="column" height={contentHeight}>
        {behindInfo && (
          <Box paddingX={1}>
            <Text color="yellow">
              Warning: Branch is behind {behindInfo.upstream} by {behindInfo.count} commit(s).
            </Text>
          </Box>
        )}

        {hasModalOpen ? (
          <Box width="100%" height={bodyHeight} alignItems="center" justifyContent="center">
            {orgModalOpen && (
              <OrgSelectorModal
                orgs={orgs}
                currentOrg={currentOrg}
                onSelect={(orgInfo) => {
                  void handleOrgSelect(orgInfo);
                }}
                onClose={() => setOrgModalOpen(false)}
              />
            )}

            {manageTypesOpen && (
              <ManageTypesModal
                types={allTypes}
                selected={subscribedTypes}
                coreTypes={DEFAULT_SUBSCRIBED_TYPES}
                onSave={(nextTypes) => {
                  void handleSaveTypes(nextTypes);
                }}
                onClose={() => setManageTypesOpen(false)}
              />
            )}

            {confirmAction && (
              <ConfirmActionModal
                action={confirmAction.action}
                items={confirmAction.items.map((item) => item.fullName)}
                onConfirm={() => {
                  if (confirmAction.action === 'retrieve') {
                    void runRetrieve(confirmAction.items);
                  } else {
                    void runDeploy(confirmAction.items);
                  }
                }}
                onCancel={() => setConfirmAction(null)}
              />
            )}

            {progress && (
              <ProgressModal
                operation={progress.operation}
                message={progress.message}
                progress={progress.progress}
                elapsedSeconds={progress.elapsedSeconds}
                cancellable={progress.operation === 'retrieve' || progress.operation === 'deploy'}
                cancelling={isCancellingOperation}
              />
            )}

            {result && (
              <ResultModal
                success={result.success}
                title={result.title}
                message={result.message}
                details={result.details}
                onClose={() => setResult(null)}
              />
            )}

            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
          </Box>
        ) : (
          <Box flexDirection="row" height={bodyHeight}>
            <Box
              flexDirection="column"
              width="35%"
              height="100%"
              borderStyle="single"
              borderColor={activePanel === 'types' ? 'green' : 'gray'}
            >
              <Box
                paddingX={1}
                height={PANEL_HEADER_HEIGHT + BORDERS}
                borderStyle="single"
                borderBottom
                borderColor="gray"
              >
                <Text bold>Metadata Types</Text>
              </Box>
              <Box height={listHeight}>
                <TreeView
                  nodes={typeNodes}
                  onSelect={handleTypeSelect}
                  onToggleExpand={handleToggleExpand}
                  onToggleSelect={handleTypeToggle}
                  isActive={activePanel === 'types'}
                  selectedId={selectedNodeId}
                  height={listHeight}
                  onFocus={() => setActivePanel('types')}
                />
              </Box>
            </Box>

            <Box
              flexDirection="column"
              width="65%"
              height="100%"
              borderStyle="single"
              borderColor={activePanel === 'components' ? 'green' : 'gray'}
            >
              <Box
                paddingX={1}
                height={PANEL_HEADER_HEIGHT + BORDERS}
                borderStyle="single"
                borderBottom
                borderColor="gray"
              >
                <Text bold>{viewMode === 'selected' ? 'Selected Components' : 'Components'}</Text>
                {viewMode === 'all' && selectedType && <Text color="gray"> - {selectedType}</Text>}
                {isGroupingAvailable && <Text color="gray"> {groupByObject ? '[Grouped]' : '[Flat]'}</Text>}
              </Box>
              {metadataLoading ? (
                <Box padding={1} height={listHeight - SEARCH_HEIGHT}>
                  <Loading message={statusLoadingMessage ?? 'Loading components...'} />
                </Box>
              ) : (
                <Box height={listHeight - SEARCH_HEIGHT}>
                  {isGroupedView && groupedComponents ? (
                    <TreeView
                      nodes={groupedComponents.nodes}
                      onSelect={handleGroupedSelect}
                      onToggleExpand={handleToggleExpand}
                      onToggleSelect={handleGroupedToggle}
                      isActive={activePanel === 'components' && !searchActive}
                      height={listHeight - SEARCH_HEIGHT}
                      emptyMessage={emptyMessage}
                      onFocus={() => setActivePanel('components')}
                    />
                  ) : (
                    <MultiSelectList
                      items={listItems}
                      onToggle={selection.toggle}
                      onToggleAll={handleToggleAll}
                      isActive={activePanel === 'components' && !searchActive}
                      height={listHeight - SEARCH_HEIGHT}
                      emptyMessage={emptyMessage}
                      onFocus={() => setActivePanel('components')}
                    />
                  )}
                </Box>
              )}
              <Box paddingX={1} height={SEARCH_HEIGHT}>
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSubmit={() => setSearchActive(false)}
                  isActive={searchActive}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <StatusBar
        orgName={orgName}
        selectedCount={selection.count}
        lastSync={lastSyncFormatted}
        lastSyncOrg={lastSyncOrg}
        cacheStatus={cacheStatus}
        behindInfo={behindInfo}
        isLoading={Boolean(statusLoadingMessage)}
        loadingMessage={statusLoadingMessage}
        viewMode={viewMode}
        enabledTypesCount={subscribedTypes.length}
        groupingAvailable={isGroupingAvailable}
        groupByObject={groupByObject}
      />
    </Box>
  );
};

export default App;
