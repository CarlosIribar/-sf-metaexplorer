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
import { MetadataComponent } from '../../src/types/index.js';
import { useSelection } from '../../src/hooks/useSelection.js';
import { act, renderHook } from './renderHook.js';

describe('useSelection', () => {
  const components: MetadataComponent[] = [
    { id: '1', type: 'ApexClass', fullName: 'ClassA', status: 'local-only' },
    { id: '2', type: 'ApexClass', fullName: 'ClassB', status: 'remote-only' },
  ];

  it('toggle adds and removes ids', () => {
    const { result } = renderHook(() => useSelection(components));

    void act(() => {
      result.current.toggle('1');
    });

    expect(result.current.isSelected('1')).to.equal(true);
    expect(result.current.count).to.equal(1);

    void act(() => {
      result.current.toggle('1');
    });

    expect(result.current.isSelected('1')).to.equal(false);
    expect(result.current.count).to.equal(0);
  });

  it('selectAll and deselectAll update selection', () => {
    const { result } = renderHook(() => useSelection(components));

    void act(() => {
      result.current.selectAll(components);
    });

    expect(result.current.count).to.equal(2);
    expect(result.current.selectedComponents).to.have.lengthOf(2);

    void act(() => {
      result.current.deselectAll();
    });

    expect(result.current.count).to.equal(0);
    expect(result.current.selectedComponents).to.have.lengthOf(0);
  });

  it('toggleMultiple toggles group selection', () => {
    const { result } = renderHook(() => useSelection(components));

    void act(() => {
      result.current.toggleMultiple(['1', '2']);
    });

    expect(result.current.count).to.equal(2);

    void act(() => {
      result.current.toggleMultiple(['1', '2']);
    });

    expect(result.current.count).to.equal(0);
  });
});
