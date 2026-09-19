import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import type { CorePluginEventsComponent } from './core-plugin-events-component.ts';
import type { MoreEventsApiImplConstructorParams } from './more-events-api-impl.ts';

import { MoreEventsApiImpl } from './more-events-api-impl.ts';

describe('MoreEventsApiImpl', () => {
  it('should hand back the component\'s enabled core plugin ids', () => {
    const getEnabledCorePluginIds = vi.fn(() => ['backlink', 'canvas']);
    const api = new MoreEventsApiImpl(createParams({ corePluginEventsComponentStub: { getEnabledCorePluginIds } }));

    expect(api.getEnabledCorePluginIds()).toEqual(['backlink', 'canvas']);
    expect(getEnabledCorePluginIds).toHaveBeenCalledOnce();
  });

  it('should ask the component whether a core plugin is enabled', () => {
    const isCorePluginEnabled = vi.fn((corePluginId: string) => corePluginId === 'backlink');
    const api = new MoreEventsApiImpl(createParams({ corePluginEventsComponentStub: { isCorePluginEnabled } }));

    expect(api.isCorePluginEnabled('backlink')).toBe(true);
    expect(api.isCorePluginEnabled('canvas')).toBe(false);
    expect(isCorePluginEnabled).toHaveBeenCalledTimes(2);
  });

  it('should hand back the component\'s enabled community plugin ids', () => {
    const getEnabledCommunityPluginIds = vi.fn(() => ['dataview', 'more-events']);
    const api = new MoreEventsApiImpl(createParams({ communityPluginEventsComponentStub: { getEnabledCommunityPluginIds } }));

    expect(api.getEnabledCommunityPluginIds()).toEqual(['dataview', 'more-events']);
    expect(getEnabledCommunityPluginIds).toHaveBeenCalledOnce();
  });

  it('should ask the component whether a community plugin is enabled', () => {
    const isCommunityPluginEnabled = vi.fn((communityPluginId: string) => communityPluginId === 'dataview');
    const api = new MoreEventsApiImpl(createParams({ communityPluginEventsComponentStub: { isCommunityPluginEnabled } }));

    expect(api.isCommunityPluginEnabled('dataview')).toBe(true);
    expect(api.isCommunityPluginEnabled('more-events')).toBe(false);
    expect(isCommunityPluginEnabled).toHaveBeenCalledTimes(2);
  });
});

interface CreateParamsParams {
  readonly communityPluginEventsComponentStub?: Partial<CommunityPluginEventsComponent>;
  readonly corePluginEventsComponentStub?: Partial<CorePluginEventsComponent>;
}

/**
 * Builds the constructor params with both components stubbed, so a test names only the half it exercises.
 *
 * The delegate takes two components now, and each read must reach the RIGHT one — a stub for the other side
 * is what makes a test that crosses the wires fail rather than merely throw on an undefined member.
 *
 * @param params - The stubbed members, per component.
 * @returns The constructor params.
 */
function createParams(params: CreateParamsParams): MoreEventsApiImplConstructorParams {
  return {
    communityPluginEventsComponent: castTo<CommunityPluginEventsComponent>(params.communityPluginEventsComponentStub ?? {}),
    corePluginEventsComponent: castTo<CorePluginEventsComponent>(params.corePluginEventsComponentStub ?? {})
  };
}
