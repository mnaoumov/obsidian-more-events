/**
 * @file
 *
 * The implementation behind this plugin's public API.
 *
 * Kept apart from `more-events-api.ts` so that file stays a plain description of the contract a consumer
 * reads, with no runtime behavior in it — and apart from the components so the published surface is a thin
 * delegate rather than a component itself, which would hand a consumer every internal it happens to have.
 */

import type { MoreEventsApi } from '../api.d.ts';
import type { CommunityPluginEventsComponent } from './community-plugin-events-component.ts';
import type { CorePluginEventsComponent } from './core-plugin-events-component.ts';

/**
 * Parameters for the {@link MoreEventsApiImpl} constructor.
 */
export interface MoreEventsApiImplConstructorParams {
  /**
   * The component that tracks which community plugins are loaded.
   */
  readonly communityPluginEventsComponent: CommunityPluginEventsComponent;

  /**
   * The component that tracks which core plugins are enabled.
   */
  readonly corePluginEventsComponent: CorePluginEventsComponent;
}

/**
 * This plugin's API, as it is actually implemented.
 */
export class MoreEventsApiImpl implements MoreEventsApi {
  private readonly communityPluginEventsComponent: CommunityPluginEventsComponent;
  private readonly corePluginEventsComponent: CorePluginEventsComponent;

  /**
   * Creates the API.
   *
   * @param params - The parameters.
   */
  public constructor(params: MoreEventsApiImplConstructorParams) {
    this.communityPluginEventsComponent = params.communityPluginEventsComponent;
    this.corePluginEventsComponent = params.corePluginEventsComponent;
  }

  /**
   * The ids of the community plugins that are loaded right now.
   *
   * @returns The enabled community plugin ids.
   */
  public getEnabledCommunityPluginIds(): string[] {
    return this.communityPluginEventsComponent.getEnabledCommunityPluginIds();
  }

  /**
   * The ids of the core plugins enabled right now.
   *
   * @returns The enabled core plugin ids.
   */
  public getEnabledCorePluginIds(): string[] {
    return this.corePluginEventsComponent.getEnabledCorePluginIds();
  }

  /**
   * Whether the named community plugin is loaded right now.
   *
   * @param communityPluginId - The community plugin's id.
   * @returns `true` when it is enabled.
   */
  public isCommunityPluginEnabled(communityPluginId: string): boolean {
    return this.communityPluginEventsComponent.isCommunityPluginEnabled(communityPluginId);
  }

  /**
   * Whether the named core plugin is enabled right now.
   *
   * @param corePluginId - The core plugin's id.
   * @returns `true` when it is enabled.
   */
  public isCorePluginEnabled(corePluginId: string): boolean {
    return this.corePluginEventsComponent.isCorePluginEnabled(corePluginId);
  }
}
