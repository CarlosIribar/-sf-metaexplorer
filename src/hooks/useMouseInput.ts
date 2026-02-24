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

import { useEffect, useRef } from 'react';
import { useStdin } from 'ink';

export type MouseEvent = {
  x: number;
  y: number;
  button: number;
};

export type MouseHandler = (event: MouseEvent) => void;

// Build the SGR regex using the RegExp constructor to avoid the no-control-regex lint rule.
// Matches: ESC [ < button ; x ; y M|m
const ESC = String.fromCharCode(0x1b);
const SGR_PATTERN = new RegExp(`${ESC}\\[<(\\d+);(\\d+);(\\d+)([Mm])`);

/**
 * Parses mouse events from raw terminal data.
 * Supports both SGR extended mode (ESC[<...) and X10 legacy mode (ESC[M...).
 */
const parseMouseEvent = (data: Buffer): MouseEvent | null => {
  const str = data.toString('utf-8');

  // SGR extended mode: ESC[<button;x;yM (press) or ESC[<button;x;ym (release)
  const sgrMatch = str.match(SGR_PATTERN);
  if (sgrMatch) {
    const rawButton = parseInt(sgrMatch[1], 10);
    // Only handle press events (M), ignore releases (m)
    if (sgrMatch[4] === 'm') return null;
    return {
      button: rawButton & 3,
      x: parseInt(sgrMatch[2], 10),
      y: parseInt(sgrMatch[3], 10),
    };
  }

  // X10 legacy mode: ESC [ M <button> <x> <y>
  if (data.length >= 6 && data[0] === 0x1b && data[1] === 0x5b && data[2] === 0x4d) {
    return {
      button: (data[3] - 32) & 3,
      x: data[4] - 32,
      y: data[5] - 32,
    };
  }

  return null;
};

/**
 * Hook that provides parsed mouse events from the terminal.
 *
 * Uses a ref for the handler to avoid constantly re-subscribing to stdin,
 * which would cause setRawMode toggling and visual flicker.
 */
export function useMouseInput(handler: MouseHandler): void {
  const { stdin } = useStdin();
  const handlerRef = useRef<MouseHandler>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!stdin) return;

    const onData = (data: Buffer): void => {
      const event = parseMouseEvent(data);
      if (event) {
        handlerRef.current(event);
      }
    };

    stdin.on('data', onData);

    return () => {
      stdin.off('data', onData);
    };
  }, [stdin]);
}
