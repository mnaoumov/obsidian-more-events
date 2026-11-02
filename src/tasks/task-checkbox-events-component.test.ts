import type {
  App as AppOriginal,
  MarkdownViewModeType,
  TFile
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { Events } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { TASK_CHECKBOX_CLICKED_EVENT_NAME } from '../api/more-events-api.ts';
import {
  findToggledTask,
  TaskCheckboxEventsComponent
} from './task-checkbox-events-component.ts';

/* eslint-disable typescript-dev-toolkit/readonly-interface-members -- The fake view's data and mode change as the test runs. */
interface FakeView {
  containerEl: HTMLElement;
  file: null | TFile;
  getMode: () => MarkdownViewModeType;
  getViewData: () => string;
  mode: MarkdownViewModeType;
  text: string;
}
/* eslint-enable typescript-dev-toolkit/readonly-interface-members -- Only the fake view above is mutable. */

interface LoadedTestApp extends TestApp {
  readonly component: TaskCheckboxEventsComponent;
}

interface TestApp {
  readonly app: AppOriginal;
  readonly trigger: ReturnType<typeof vi.fn>;
  readonly windowHandlers: Map<string, WindowHandler>;
}

interface TestLeaf {
  readonly getContainer: () => TestWorkspaceWindow;
  readonly view: FakeView;
}

interface TestLeafWithView {
  readonly leaf: TestLeaf;
  readonly view: FakeView;
}

interface TestWorkspaceWindow {
  readonly win: Window;
}

type WindowHandler = (workspaceWindow: TestWorkspaceWindow) => void;

const FILE = castTo<TFile>({ path: 'note.md' });

describe('TaskCheckboxEventsComponent', () => {
  const loadedComponents: TaskCheckboxEventsComponent[] = [];

  afterEach(() => {
    while (loadedComponents.length > 0) {
      loadedComponents.pop()?.unload();
    }
    activeDocument.body.empty();
  });

  it('should announce a checkbox click Obsidian toggled a task for, after Obsidian\'s listener ran', () => {
    const { leaf, view } = createLeaf('# Tasks\n- [ ] One\n- [ ] Two\n', 'preview');
    const { trigger } = loadComponent([leaf]);
    const checkboxEl = createCheckbox(view);
    let triggerCountInObsidianListener = -1;
    checkboxEl.addEventListener('click', () => {
      triggerCountInObsidianListener = trigger.mock.calls.length;
      view.text = '# Tasks\n- [ ] One\n- [x] Two\n';
    });

    checkboxEl.click();

    expect(triggerCountInObsidianListener).toBe(0);
    expect(trigger.mock.calls).toEqual([[TASK_CHECKBOX_CLICKED_EVENT_NAME, leaf, FILE, {
      char: 'x',
      isChecked: true,
      line: 2,
      lineText: '- [x] Two',
      mode: 'preview',
      previousChar: ' '
    }]]);
  });

  it('should announce a Live Preview checkbox toggled from its input event', () => {
    const { leaf, view } = createLeaf('- [x] Done\n', 'source');
    const { trigger } = loadComponent([leaf]);
    const checkboxEl = createCheckbox(view);
    checkboxEl.addEventListener('input', () => {
      view.text = '- [ ] Done\n';
    });

    checkboxEl.dispatchEvent(new Event('input', { bubbles: true }));

    expect(trigger.mock.calls).toEqual([[TASK_CHECKBOX_CLICKED_EVENT_NAME, leaf, FILE, {
      char: ' ',
      isChecked: false,
      line: 0,
      lineText: '- [ ] Done',
      mode: 'source',
      previousChar: 'x'
    }]]);
  });

  it('should announce nothing for a click that changed nothing', () => {
    const { leaf, view } = createLeaf('- [ ] One\n', 'preview');
    const { trigger } = loadComponent([leaf]);

    createCheckbox(view).click();

    expect(trigger).not.toHaveBeenCalled();
  });

  it('should announce nothing for a click on anything but a task checkbox', () => {
    const { leaf, view } = createLeaf('- [ ] One\n', 'preview');
    const { trigger } = loadComponent([leaf]);
    const otherEl = view.containerEl.createEl('input', { type: 'checkbox' });
    otherEl.addEventListener('click', () => {
      view.text = '- [x] One\n';
    });

    otherEl.click();

    expect(trigger).not.toHaveBeenCalled();
  });

  it('should announce nothing for a checkbox outside every Markdown view', () => {
    const { leaf } = createLeaf('- [ ] One\n', 'preview');
    const { trigger } = loadComponent([leaf]);
    const checkboxEl = activeDocument.body.createEl('input', { cls: 'task-list-item-checkbox', type: 'checkbox' });

    checkboxEl.click();

    expect(trigger).not.toHaveBeenCalled();
  });

  it('should announce nothing for a view with no file or no data yet', () => {
    const { leaf, view } = createLeaf('- [ ] One\n', 'preview');
    view.file = null;
    const deferred = createLeaf('- [ ] One\n', 'preview');
    delete castTo<Partial<FakeView>>(deferred.view).getViewData;
    const { trigger } = loadComponent([leaf, deferred.leaf]);
    const checkboxEl = createCheckbox(view);
    checkboxEl.addEventListener('click', () => {
      view.text = '- [x] One\n';
    });

    checkboxEl.click();
    createCheckbox(deferred.view).click();

    expect(trigger).not.toHaveBeenCalled();
  });

  it('should listen on the windows of leaves and of windows opened later, and stop when a window closes or it unloads', () => {
    const leafWindow = castTo<Window>(new EventTarget());
    const laterWindow = castTo<Window>(new EventTarget());
    const addSpies = [leafWindow, laterWindow].map((win) => vi.spyOn(win, 'addEventListener'));
    const removeSpies = [leafWindow, laterWindow].map((win) => vi.spyOn(win, 'removeEventListener'));
    const { leaf } = createLeaf('', 'preview', leafWindow);
    const { component, windowHandlers } = loadComponent([leaf]);

    windowHandlers.get('window-open')?.({ win: laterWindow });
    windowHandlers.get('window-open')?.({ win: laterWindow });
    windowHandlers.get('window-close')?.({ win: laterWindow });
    component.unload();

    expect(addSpies.map((spy) => spy.mock.calls.length)).toEqual([4, 4]);
    expect(removeSpies.map((spy) => spy.mock.calls.length)).toEqual([4, 4]);
  });

  function loadComponent(leaves: TestLeaf[]): LoadedTestApp {
    const testApp = createApp(leaves);
    const component = new TaskCheckboxEventsComponent({ app: testApp.app });
    component.load();
    loadedComponents.push(component);
    return { ...testApp, component };
  }
});

describe('findToggledTask', () => {
  it('should find the toggled task on the last line with no line break after it', () => {
    expect(findToggledTask('a\r\n- [/] Doing', 'a\r\n- [ ] Doing', 'source')).toEqual({
      char: ' ',
      isChecked: false,
      line: 1,
      lineText: '- [ ] Doing',
      mode: 'source',
      previousChar: '/'
    });
  });

  it('should strip the carriage return of a line that has one', () => {
    expect(findToggledTask('- [ ] A\r\nb', '- [x] A\r\nb', 'preview')?.lineText).toBe('- [x] A');
  });

  it('should refuse anything but one status character changed', () => {
    expect(findToggledTask('same', 'same', 'source')).toBeNull();
    expect(findToggledTask('- [ ] A', '- [ ] AB', 'source')).toBeNull();
    expect(findToggledTask('- [ ] A', '- [x] B', 'source')).toBeNull();
    expect(findToggledTask('abc', 'axc', 'source')).toBeNull();
    expect(findToggledTask('[ab]', '[xb]', 'source')).toBeNull();
  });
});

function createApp(leaves: TestLeaf[]): TestApp {
  const windowHandlers = new Map<string, WindowHandler>();
  const events = new Events();
  const trigger = vi.fn();
  const app = castTo<AppOriginal>({
    workspace: {
      getLeavesOfType: (viewType: string): TestLeaf[] => viewType === 'markdown' ? leaves : [],
      iterateAllLeaves: (callback: (leaf: TestLeaf) => void): void => {
        for (const leaf of leaves) {
          callback(leaf);
        }
      },
      on: (name: string, handler: WindowHandler): unknown => {
        windowHandlers.set(name, handler);
        return events.on(name, castTo<(...data: unknown[]) => unknown>(handler));
      },
      trigger
    }
  });
  return { app, trigger, windowHandlers };
}

function createCheckbox(view: FakeView): HTMLInputElement {
  return view.containerEl.createEl('input', { cls: 'task-list-item-checkbox', type: 'checkbox' });
}

function createLeaf(text: string, mode: MarkdownViewModeType, win: Window = window): TestLeafWithView {
  const view: FakeView = {
    containerEl: activeDocument.body.createDiv(),
    file: FILE,
    getMode(): MarkdownViewModeType {
      return view.mode;
    },
    getViewData(): string {
      return view.text;
    },
    mode,
    text
  };
  return { leaf: { getContainer: () => ({ win }), view }, view };
}
