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

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

export type RenderHookResult<T> = {
  result: { current: T };
  rerender: () => void;
  unmount: () => void;
};

export const flushPromises = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

export const renderHook = <T>(hook: () => T): RenderHookResult<T> => {
  const result = { current: null as unknown as T };

  const TestComponent: React.FC = () => {
    result.current = hook();
    return null;
  };

  const renderer = TestRenderer.create(React.createElement(TestComponent));

  return {
    result,
    rerender: () => renderer.update(React.createElement(TestComponent)),
    unmount: () => renderer.unmount(),
  };
};

export { act };
