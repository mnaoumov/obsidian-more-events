import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { CorePluginEventsComponent } from './core-plugin-events-component.ts';

import { MoreEventsApiImpl } from './more-events-api-impl.ts';

describe('MoreEventsApiImpl', () => {
  it('should hand back the component\'s enabled core plugin ids', () => {
    const getEnabledCorePluginIds = vi.fn(() => ['backlink', 'canvas']);
    const api = new MoreEventsApiImpl({
      corePluginEventsComponent: castTo<CorePluginEventsComponent>({ getEnabledCorePluginIds })
    });

    expect(api.getEnabledCorePluginIds()).toEqual(['backlink', 'canvas']);
    expect(getEnabledCorePluginIds).toHaveBeenCalledOnce();
  });

  it('should ask the component whether a core plugin is enabled', () => {
    const isCorePluginEnabled = vi.fn((corePluginId: string) => corePluginId === 'backlink');
    const api = new MoreEventsApiImpl({
      corePluginEventsComponent: castTo<CorePluginEventsComponent>({ isCorePluginEnabled })
    });

    expect(api.isCorePluginEnabled('backlink')).toBe(true);
    expect(api.isCorePluginEnabled('canvas')).toBe(false);
    expect(isCorePluginEnabled).toHaveBeenCalledTimes(2);
  });
});
