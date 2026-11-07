import { App } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { MobileKeyboardEventsComponent } from './mobile-keyboard-events-component.ts';

function dispatchNative(win: Window, name: string, data: Record<string, unknown>): void {
  // The shape `Capacitor.triggerEvent` builds: a plain `Event` with the data copied onto it.
  const nativeEvent = new Event(name);
  Object.assign(nativeEvent, data);
  win.dispatchEvent(nativeEvent);
}

describe('MobileKeyboardEventsComponent', () => {
  it('should relay each native keyboard event as a plain copy and stop on unload', () => {
    const app = App.createConfigured__().asOriginalType__();
    const win = new EventTarget() as Window;
    const component = new MobileKeyboardEventsComponent({ app, win });
    const calls: unknown[][] = [];
    app.workspace.on('more-events:mobile-keyboard-will-show', (state) => {
      calls.push(['more-events:mobile-keyboard-will-show', state]);
    });
    app.workspace.on('more-events:mobile-keyboard-shown', (state) => {
      calls.push(['more-events:mobile-keyboard-shown', state]);
    });
    app.workspace.on('more-events:mobile-keyboard-will-hide', (state) => {
      calls.push(['more-events:mobile-keyboard-will-hide', state]);
    });
    app.workspace.on('more-events:mobile-keyboard-hidden', (state) => {
      calls.push(['more-events:mobile-keyboard-hidden', state]);
    });

    dispatchNative(win, 'keyboardWillShow', { hasPhysicalKeyboard: false, keyboardHeight: 300, screenHeight: 800 });
    expect(calls).toEqual([]);

    component.load();
    dispatchNative(win, 'keyboardWillShow', { hasPhysicalKeyboard: false, keyboardHeight: 300, screenHeight: 800 });
    dispatchNative(win, 'keyboardDidShow', { hasPhysicalKeyboard: false, keyboardHeight: 301, screenHeight: 800 });
    dispatchNative(win, 'keyboardWillHide', { hasPhysicalKeyboard: true, keyboardHeight: 0, screenHeight: 800 });
    dispatchNative(win, 'keyboardDidHide', { hasPhysicalKeyboard: true, keyboardHeight: 0, screenHeight: 800 });

    expect(calls).toEqual([
      ['more-events:mobile-keyboard-will-show', { hasPhysicalKeyboard: false, keyboardHeight: 300, screenHeight: 800 }],
      ['more-events:mobile-keyboard-shown', { hasPhysicalKeyboard: false, keyboardHeight: 301, screenHeight: 800 }],
      ['more-events:mobile-keyboard-will-hide', { hasPhysicalKeyboard: true, keyboardHeight: 0, screenHeight: 800 }],
      ['more-events:mobile-keyboard-hidden', { hasPhysicalKeyboard: true, keyboardHeight: 0, screenHeight: 800 }]
    ]);

    component.unload();
    dispatchNative(win, 'keyboardDidShow', { keyboardHeight: 1 });
    expect(calls).toHaveLength(4);
  });

  it('should default missing or malformed fields rather than pass them through', () => {
    const app = App.createConfigured__().asOriginalType__();
    const win = new EventTarget() as Window;
    const component = new MobileKeyboardEventsComponent({ app, win });
    const handler = vi.fn();
    app.workspace.on('more-events:mobile-keyboard-shown', handler);
    component.load();

    dispatchNative(win, 'keyboardDidShow', { hasPhysicalKeyboard: 'yes', keyboardHeight: NaN });

    expect(handler.mock.calls).toEqual([[{ hasPhysicalKeyboard: false, keyboardHeight: 0, screenHeight: 0 }]]);
    const [[state]] = handler.mock.calls as [[object]];
    expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
    component.unload();
  });
});
