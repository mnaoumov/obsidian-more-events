import type {
  App,
  MarkdownView,
  WorkspaceLeaf
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import type { TaskCheckboxClick } from '../api/more-events-api.ts';

import { TASK_CHECKBOX_CLICKED_EVENT_NAME } from '../api/more-events-api.ts';

/**
 * Parameters for the {@link TaskCheckboxEventsComponent} constructor.
 */
export interface TaskCheckboxEventsComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * What a capture-phase listener saw before Obsidian's own listeners ran.
 */
interface CheckboxEventSnapshot {
  /**
   * The leaf holding the Markdown view the checkbox is in.
   */
  readonly leaf: WorkspaceLeaf;

  /**
   * The view's mode before the event.
   */
  readonly mode: TaskCheckboxClick['mode'];

  /**
   * The view's data before the event.
   */
  readonly text: string;

  /**
   * The Markdown view the checkbox is in.
   */
  readonly view: MarkdownView;
}

/**
 * The selector of a task's checkbox, in Reading view and in Live Preview alike.
 */
const TASK_CHECKBOX_SELECTOR = '.task-list-item-checkbox';

/**
 * The view type of the Markdown view.
 */
const MARKDOWN_VIEW_TYPE = 'markdown';

/**
 * The events a task checkbox is toggled from: `click` in Reading view and in a block Live Preview renders, `input`
 * for a Live Preview task's own checkbox.
 */
const CHECKBOX_EVENT_TYPES = ['click', 'input'] as const;

/**
 * Announces `more-events:task-checkbox-clicked` after a task's checkbox was clicked and Obsidian wrote the toggle.
 *
 * Obsidian toggles a task from three listeners and announces none of them. Reading view delegates `click` on
 * `.task-list-item-checkbox` to the renderer's `onCheckboxClick`, which calls `preventDefault` and sets the renderer's
 * text at once. A Live Preview task's checkbox has its own `input` listener, which dispatches the toggle to the
 * editor. A block Live Preview renders, such as a callout, delegates `click` the way Reading view does and dispatches
 * the block's new text. Each runs synchronously inside the event's dispatch.
 *
 * **So this component needs no patch.** A capture-phase listener on every window keeps the Markdown view's data
 * before any of those listeners runs, and a bubble-phase one reads it again after they all ran. A click that changed
 * exactly one character, between a `[` and a `]`, is the toggle, and that is what is announced: what Obsidian wrote,
 * rather than a guess at what it would write. A click that changed nothing, such as one on an embedded note's checkbox
 * (which writes the embedded file), announces nothing.
 */
export class TaskCheckboxEventsComponent extends Component {
  private readonly app: App;
  private readonly listenedWindows = new Map<Window, () => void>();
  private readonly snapshots = new WeakMap<Event, CheckboxEventSnapshot>();

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: TaskCheckboxEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Starts listening on every window.
   */
  public override onload(): void {
    super.onload();

    this.listenToWindow(window);
    this.app.workspace.iterateAllLeaves((leaf) => {
      this.listenToWindow(leaf.getContainer().win);
    });
    this.registerEvent(this.app.workspace.on('window-open', (workspaceWindow) => {
      this.listenToWindow(workspaceWindow.win);
    }));
    this.registerEvent(this.app.workspace.on('window-close', (workspaceWindow) => {
      this.listenedWindows.get(workspaceWindow.win)?.();
    }));
    this.register(() => {
      for (const stopListening of this.listenedWindows.values()) {
        stopListening();
      }
    });
  }

  private announceChange($event: Event): void {
    const snapshot = this.snapshots.get($event);
    if (!snapshot) {
      return;
    }
    this.snapshots.delete($event);

    const { file } = snapshot.view;
    if (!file) {
      return;
    }

    const task = findToggledTask(snapshot.text, snapshot.view.getViewData(), snapshot.mode);
    if (task) {
      this.app.workspace.trigger(TASK_CHECKBOX_CLICKED_EVENT_NAME, snapshot.leaf, file, task);
    }
  }

  private findMarkdownLeaf(el: Element): null | WorkspaceLeaf {
    for (const leaf of this.app.workspace.getLeavesOfType(MARKDOWN_VIEW_TYPE)) {
      if (leaf.view.containerEl.contains(el)) {
        return leaf;
      }
    }
    return null;
  }

  private listenToWindow(win: Window): void {
    if (this.listenedWindows.has(win)) {
      return;
    }

    const takeSnapshot = ($event: Event): void => {
      this.takeSnapshot($event);
    };
    const announceChange = ($event: Event): void => {
      this.announceChange($event);
    };
    for (const eventType of CHECKBOX_EVENT_TYPES) {
      win.addEventListener(eventType, takeSnapshot, { capture: true });
      win.addEventListener(eventType, announceChange);
    }
    this.listenedWindows.set(win, () => {
      for (const eventType of CHECKBOX_EVENT_TYPES) {
        win.removeEventListener(eventType, takeSnapshot, { capture: true });
        win.removeEventListener(eventType, announceChange);
      }
      this.listenedWindows.delete(win);
    });
  }

  private takeSnapshot($event: Event): void {
    const { target } = $event;
    // Duck-typed rather than `instanceof Element`, which is false for an element of another window.
    if (!target || !castTo<Partial<Element>>(target).matches?.(TASK_CHECKBOX_SELECTOR)) {
      return;
    }

    const leaf = this.findMarkdownLeaf(castTo<Element>(target));
    if (!leaf) {
      return;
    }

    // A deferred leaf reports the view type before its real view exists.
    const view = castTo<Partial<MarkdownView>>(leaf.view);
    if (!view.getViewData || !view.getMode) {
      return;
    }

    this.snapshots.set($event, {
      leaf,
      mode: view.getMode(),
      text: view.getViewData(),
      view: castTo<MarkdownView>(view)
    });
  }
}

/**
 * Finds the task a checkbox click toggled, from the view's data before and after it.
 *
 * @param before - The data before the click.
 * @param after - The data after it.
 * @param mode - The view's mode.
 * @returns The toggled task, or `null` when the data did not change by exactly one task's status character.
 */
export function findToggledTask(before: string, after: string, mode: TaskCheckboxClick['mode']): null | TaskCheckboxClick {
  if (before.length !== after.length || before === after) {
    return null;
  }

  let index = 0;
  while (before[index] === after[index]) {
    index++;
  }

  if ((before.slice(index + 1) !== after.slice(index + 1)) || after[index - 1] !== '[' || after[index + 1] !== ']') {
    return null;
  }

  const lineStart = after.lastIndexOf('\n', index) + 1;
  const lineEnd = after.indexOf('\n', index);
  const lineText = after.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).replace(/\r$/, '');
  const char = after.charAt(index);

  return {
    char,
    isChecked: char !== ' ',
    line: countLineBreaks(after, lineStart),
    lineText,
    mode,
    previousChar: before.charAt(index)
  };
}

function countLineBreaks(text: string, end: number): number {
  let count = 0;
  for (let index = text.indexOf('\n'); index !== -1 && index < end; index = text.indexOf('\n', index + 1)) {
    count++;
  }
  return count;
}
