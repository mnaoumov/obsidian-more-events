import type { App } from 'obsidian';

import {
  castTo,
  getPrototypeOf
} from 'obsidian-dev-utils/object-utils';
import { MonkeyAroundComponent } from 'obsidian-dev-utils/obsidian/components/monkey-around-component';

import type { UserInitiationRecorder } from '../plugin-events-component-base.ts';

/**
 * `app.plugins`' two transition methods, with the argument they really take.
 *
 * `@obsidian-typings` declares `enablePlugin(id)` and `disablePlugin(id)` without their second parameter,
 * although it declares it on `loadPlugin` / `unloadPlugin`, which these two forward to — and it declares
 * `enablePlugin` as returning `void` where it returns `boolean`. Measured in the unminified `app.js`:
 * `enablePlugin(e, t = false)` calls `loadPlugin(e, t)` and returns `!0` / `!1`; `disablePlugin(e, t =
 * false)` calls `unloadPlugin(e, t)`. This is the shape to patch against until the typings carry it.
 */
export interface CommunityPluginManagerSeam {
  /**
   * Unloads a community plugin.
   *
   * @param communityPluginId - The community plugin's id.
   * @param isUserDisabled - Whether the user disabled it, which becomes the plugin's `_userDisabled`.
   * @returns A promise that resolves when it has been unloaded.
   */
  readonly disablePlugin: (communityPluginId: string, isUserDisabled?: boolean) => Promise<void>;

  /**
   * Loads a community plugin.
   *
   * @param communityPluginId - The community plugin's id.
   * @param isUserEnabled - Whether the user enabled it, which decides whether its `onUserEnable()` runs.
   * @returns Whether it was loaded.
   */
  readonly enablePlugin: (communityPluginId: string, isUserEnabled?: boolean) => Promise<boolean>;
}

/**
 * Parameters for the {@link PluginsPatchComponent} constructor.
 */
export interface PluginsPatchComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;

  /**
   * Where the intercepted flag is written.
   */
  readonly userInitiationRecorder: UserInitiationRecorder;
}

/**
 * Recovers the `isUserEnabled` / `isUserDisabled` argument Obsidian takes and then throws away.
 *
 * `Plugins.enablePlugin(id, isUserEnabled)` and `.disablePlugin(id, isUserDisabled)` are the entry point of
 * every community-plugin transition: they are the only callers of `loadPlugin` / `unloadPlugin`, which in
 * turn are the only writers of `app.plugins.plugins` — the record these events diff. The flag they forward
 * is what decides whether the plugin's own `onUserEnable()` runs and what its `_userDisabled` becomes, and
 * `enablePluginAndSave` / `disablePluginAndSave` — the pair the toggle in **Settings -> Community plugins**
 * calls — hardcode `true`. The `changed` signal carries no payload at all, so without this the answer is
 * simply gone.
 *
 * **The PROTOTYPE rather than `app.plugins` itself, and that is not symmetry for its own sake.** An own
 * property on `app.plugins` is what a patch of this shape reaches for first, and it does not survive:
 * `obsidian-integration-testing` saves `app.plugins.loadPlugin`, wraps it to capture load errors, enables
 * the plugin — which is when this component installs — and restores the saved original in its `finally`,
 * silently removing any own property installed in between. Measured 2026-09-19: with the patch on the
 * instance, `app.plugins.loadPlugin` was Obsidian's own again by the time the first event fired, and every
 * payload said `isUserInitiated: false`. Nothing saves and restores the prototype, and any own property a
 * third party leaves behind simply layers above this patch rather than deleting it.
 *
 * **Why these two rather than `loadPlugin` / `unloadPlugin`**, which are one level down and are the ones
 * `@obsidian-typings` already declares the flag on: those two are exactly what the harness above
 * save-and-restores, and the pair here covers every path Obsidian itself takes — including the master
 * **Community plugins** switch, whose `setEnable(false)` calls `disablePlugin` per plugin. What it does not
 * cover is a third party calling `loadPlugin` directly, which Obsidian never does; such a transition is
 * reported with `isUserInitiated: false`, which is the honest answer for one nothing recorded.
 */
export class PluginsPatchComponent extends MonkeyAroundComponent {
  private readonly app: App;
  private readonly userInitiationRecorder: UserInitiationRecorder;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: PluginsPatchComponentConstructorParams) {
    super();
    this.app = params.app;
    this.userInitiationRecorder = params.userInitiationRecorder;
  }

  /**
   * Installs both patches.
   */
  public override onload(): void {
    super.onload();

    const communityPluginManagerPrototype = castTo<CommunityPluginManagerSeam>(getPrototypeOf(this.app.plugins));

    this.registerMethodPatch({
      $object: communityPluginManagerPrototype,
      methodName: 'enablePlugin',
      patchHandler: ({
        fallback,
        originalArguments
      }) => {
        this.userInitiationRecorder.recordUserInitiation(originalArguments[0], originalArguments[1] ?? false);
        return fallback();
      }
    });

    this.registerMethodPatch({
      $object: communityPluginManagerPrototype,
      methodName: 'disablePlugin',
      patchHandler: ({
        fallback,
        originalArguments
      }) => {
        this.userInitiationRecorder.recordUserInitiation(originalArguments[0], originalArguments[1] ?? false);
        return fallback();
      }
    });
  }
}
