import type { App } from 'obsidian';

import { Component } from 'obsidian';

import type {
  MobileKeyboardHiddenEventName,
  MobileKeyboardShownEventName,
  MobileKeyboardState,
  MobileKeyboardWillHideEventName,
  MobileKeyboardWillShowEventName
} from '../api/more-events-api.ts';

import {
  MOBILE_KEYBOARD_HIDDEN_EVENT_NAME,
  MOBILE_KEYBOARD_SHOWN_EVENT_NAME,
  MOBILE_KEYBOARD_WILL_HIDE_EVENT_NAME,
  MOBILE_KEYBOARD_WILL_SHOW_EVENT_NAME
} from '../api/more-events-api.ts';

/**
Parameters for mobile keyboard observation.
*/
export interface MobileKeyboardEventsComponentConstructorParams {
  /**
  The application whose workspace announces the events.
  */
  readonly app: App;

  /**
  The window the native bridge dispatches its keyboard events on.
  */
  readonly win: Window;
}

type MobileKeyboardEventName =
  | MobileKeyboardHiddenEventName
  | MobileKeyboardShownEventName
  | MobileKeyboardWillHideEventName
  | MobileKeyboardWillShowEventName;

/**
 * The native names Obsidian's Capacitor keyboard plugin dispatches on `window`, each with the event it is relayed as.
 */
const NATIVE_EVENT_NAMES: readonly (readonly [nativeName: string, eventName: MobileKeyboardEventName])[] = [
  ['keyboardWillShow', MOBILE_KEYBOARD_WILL_SHOW_EVENT_NAME],
  ['keyboardDidShow', MOBILE_KEYBOARD_SHOWN_EVENT_NAME],
  ['keyboardWillHide', MOBILE_KEYBOARD_WILL_HIDE_EVENT_NAME],
  ['keyboardDidHide', MOBILE_KEYBOARD_HIDDEN_EVENT_NAME]
];

/**
Relays the mobile app's native keyboard notifications, without a patch.

The native bridge copies its data onto a plain `Event` dispatched on `window`, so the payload is read off the
event's own properties and copied, defaulting what is missing rather than passing an undefined through.
*/
export class MobileKeyboardEventsComponent extends Component {
  private readonly app: App;
  private readonly win: Window;

  /** Creates the observer.
   * @param params - The application and the window to listen on.
   */
  public constructor(params: MobileKeyboardEventsComponentConstructorParams) {
    super();
    this.app = params.app;
    this.win = params.win;
  }

  /**
  Subscribes until this component unloads.
  */
  public override onload(): void {
    super.onload();
    for (const [nativeName, eventName] of NATIVE_EVENT_NAMES) {
      const listener = (nativeEvent: Event): void => {
        this.app.workspace.trigger(eventName, toMobileKeyboardState(nativeEvent));
      };
      this.win.addEventListener(nativeName, listener);
      this.register(() => {
        this.win.removeEventListener(nativeName, listener);
      });
    }
  }
}

function checkFlag(nativeEvent: Event, key: string): boolean {
  return Reflect.get(nativeEvent, key) === true;
}

function readNumber(nativeEvent: Event, key: string): number {
  const value: unknown = Reflect.get(nativeEvent, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toMobileKeyboardState(nativeEvent: Event): MobileKeyboardState {
  return {
    hasPhysicalKeyboard: checkFlag(nativeEvent, 'hasPhysicalKeyboard'),
    keyboardHeight: readNumber(nativeEvent, 'keyboardHeight'),
    screenHeight: readNumber(nativeEvent, 'screenHeight')
  };
}
