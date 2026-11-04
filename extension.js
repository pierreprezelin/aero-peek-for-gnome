import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const POSITION_MAP = {
    'extreme-left': {box: 'left', index: 0},
    left: {box: 'left', index: -1},
    center: {box: 'center', index: 0},
    right: {box: 'right', index: 0},
    'extreme-right': {box: 'right', index: -1},
};

const AeroPeekButton = GObject.registerClass(
    class AeroPeekButton extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, extension.metadata.name, true);
            this._extension = extension;

            this._icon = new St.Icon({style_class: 'system-status-icon'});
            this.add_child(this._icon);

            this.connect('enter-event', () => {
                this._extension.previewDesktop(true);
            });
            this.connect('leave-event', () => {
                this._extension.previewDesktop(false);
            });
        }

        setIcon(iconName) {
            this._icon.gicon = Gio.icon_new_for_string(iconName);
        }

        vfunc_event(event) {
            if (event.type() === Clutter.EventType.BUTTON_PRESS) {
                this._extension.toggleWindows();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        }
    }
);

export default class AeroPeekForWindows extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._signalConnections = [];

        this._connect(this._settings, 'changed::position-in-panel', () =>
            this._refreshIndicator()
        );
        this._connect(this._settings, 'changed::windows-shown-icon', () =>
            this._updateIcon()
        );
        this._connect(this._settings, 'changed::windows-collapsed-icon', () =>
            this._updateIcon()
        );

        for (const signal of ['minimize', 'unminimize', 'map']) {
            this._connect(global.window_manager, signal, () =>
                this._updateIcon()
            );
        }
        this._connect(global.window_manager, 'destroy', (_wm, actor) =>
            this._updateIcon(actor.meta_window)
        );
        this._connect(
            global.workspace_manager,
            'active-workspace-changed',
            () => this._updateIcon()
        );
        this._connect(global.display, 'notify::focus-window', () =>
            this._updateIcon()
        );

        this._createIndicator();

        Main.wm.addKeybinding(
            'toggle-shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => {
                this.toggleWindows();
            }
        );
    }

    disable() {
        this.previewDesktop(false);

        this._indicator?.destroy();
        this._indicator = null;

        for (const [object, id] of this._signalConnections ?? [])
            object.disconnect(id);
        this._signalConnections = null;
        this._settings = null;

        Main.wm.removeKeybinding('toggle-shortcut');
    }

    previewDesktop(enable) {
        if (!this._settings) return;
        if (enable && !this._settings.get_boolean('peek-on-hover')) return;

        const workspace = global.workspace_manager.get_active_workspace();
        const windows = workspace.list_windows();
        const peekOpacity = enable
            ? (this._settings.get_int('peek-opacity') / 100) * 255
            : 255;
        const peekDuration = this._settings.get_int('peek-duration');
        const peekDelay = enable ? this._settings.get_int('peek-delay') : 0;

        windows.forEach(w => {
            if (w.minimized) return;
            if (this._shouldIgnore(w)) return;

            const actor = w.get_compositor_private();
            if (actor) {
                actor.remove_all_transitions();
                actor.ease({
                    opacity: peekOpacity,
                    duration: peekDuration,
                    delay: peekDelay,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                });
            }
        });
    }

    toggleWindows() {
        const toggleableWindows = this._getToggleableWindows();
        const hasUnminimized = toggleableWindows.some(w => !w.minimized);

        for (const w of toggleableWindows) {
            if (hasUnminimized) w.minimize();
            else w.unminimize();
        }
    }

    _connect(object, signal, callback) {
        this._signalConnections.push([
            object,
            object.connect(signal, callback),
        ]);
    }

    _getToggleableWindows() {
        const workspace = global.workspace_manager.get_active_workspace();
        return workspace.list_windows().filter(w => !this._shouldIgnore(w));
    }

    _updateIcon(closingWindow = null) {
        const hasUnminimized = this._getToggleableWindows().some(
            w => w !== closingWindow && !w.minimized
        );
        const iconKey = hasUnminimized
            ? 'windows-shown-icon'
            : 'windows-collapsed-icon';

        this._indicator?.setIcon(this._settings.get_string(iconKey));
    }

    _createIndicator() {
        this._indicator = new AeroPeekButton(this);
        this._addIndicatorToPanel();
        this._updateIcon();
    }

    _addIndicatorToPanel() {
        const position =
            POSITION_MAP[this._settings.get_string('position-in-panel')] ??
            POSITION_MAP['extreme-left'];

        Main.panel.addToStatusArea(
            this.uuid,
            this._indicator,
            position.index,
            position.box
        );
    }

    _refreshIndicator() {
        this.previewDesktop(false);

        this._indicator?.destroy();
        this._createIndicator();
    }

    /**
     * Filter out windows that should be excluded from toggle behaviour, such as system windows.
     * (from https://github.com/amivaleo/Show-Desktop-Button)
     */
    _shouldIgnore(window) {
        if (!window) return true;

        const focusedWindow = global.display.get_focus_window();
        if (
            window === focusedWindow &&
            this._settings.get_boolean('keep-active-window')
        ) {
            return true;
        }

        const windowType = window.get_window_type();
        if (
            windowType === Meta.WindowType.DESKTOP ||
            windowType === Meta.WindowType.DOCK ||
            windowType === Meta.WindowType.MODAL_DIALOG
        ) {
            return true;
        }

        const wmClass = (window.get_wm_class() ?? '').toLowerCase();
        if (wmClass.includes('gjs') || wmClass.includes('prefs')) {
            return true;
        }

        return false;
    }
}
