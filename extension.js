import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';

export default class WindowOnTopExtension extends Extension {
    constructor(ext) {
        super(ext);
        this._indicator = null;
        this._topIcon = null;
        this._defaultIcon = null;
        this._oldGlobalDisplayFocusWindow = null;
        this._handlerId = 0;
    }

    enable() {
        // Create the PanelMenu button and icons for 'on top' and 'default' states
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
        this._indicator.connect('button-press-event', this._buttonClicked.bind(this));
        this._indicator.connect('captured-event', this._handleCapturedEvent.bind(this));  // Add captured event connection

        this._topIcon = this._createIcon(`${this.path}/icons/top-symbolic.svg`);
        this._defaultIcon = this._createIcon(`${this.path}/icons/default-symbolic.svg`);

        // Initialize icons and update icon position, connect event handlers for focus changes
        this._initializeIcons();
        this._updateIconPosition();

        // Connect focus change and workspace switch events
        this._focusAppHandlerId = Shell.WindowTracker.get_default().connectObject('notify::focus-app',
            this._windowFocusChanged.bind(this), this);

        this._switchWorkspaceHandleId = global.window_manager.connectObject('switch-workspace',
            this._windowFocusChanged.bind(this), this);

        // Add the extension to the top panel
        Main.panel.addToStatusArea(this.uuid, this._indicator, 2, 'left');
    }

    disable() {
        // Clean up resources and disconnect event handlers
        this._oldGlobalDisplayFocusWindow = null;

        this._topIcon?.destroy();
        this._topIcon = null;
        this._defaultIcon?.destroy();
        this._defaultIcon = null;

        if (global.display.focus_window && this._handlerId !== null) {
            global.display.focus_window.disconnect(this._handlerId);
            this._handlerId = null;
        }

        global.window_manager.disconnectObject(this._switchWorkspaceHandleId);
        Shell.WindowTracker.get_default().disconnectObject(this._focusAppHandlerId);

        this._indicator?.destroy();
        this._indicator = null;
    }

    // Event handler for app focus changes
    _windowFocusChanged() {
        this._handleWindowChange();
        this._changeIcon();
    }

    // Check if the window is on top and update the icon
    _isWindowOnTop() {
        this._changeIcon();
    }

    // Handle changes in the focused window
    _handleWindowChange() {
        if (this._oldGlobalDisplayFocusWindow) {
            this._oldGlobalDisplayFocusWindow.disconnect(this._handlerId);
        }
        this._trackFocusedWindow();
    }

    // Get the newly focused window and connect to its 'on top' state
    _trackFocusedWindow() {
        this._oldGlobalDisplayFocusWindow = global.display.focus_window ? global.display.focus_window : null;
        this._handlerId = global.display.focus_window ? global.display.focus_window.connect('notify::above', this._isWindowOnTop.bind(this)) : 0;
    }

    // Change the icon based on the window state
    _changeIcon() {
        this._updateIconPosition();
    }

    // Handle button click event to toggle the window state
    _buttonClicked() {
        global.display.focus_window.is_above() ? global.display.focus_window.unmake_above() : global.display.focus_window.make_above();
    }

    // Handle captured event to detect touch events
    _handleCapturedEvent(actor, event) {
        if (event.type() === Clutter.EventType.TOUCH_BEGIN) {
            this._buttonClicked();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    // Initialize icons and make the extension invisible
    _initializeIcons() {
        this._indicator.add_child(this._topIcon);
        this._indicator.visible = false;
    }

    // Create a St.Icon instance based on the provided GIcon path
    _createIcon(giconPath) {
        const icon = Gio.icon_new_for_string(giconPath);
        return new St.Icon({
            gicon: icon,
            style_class: 'system-status-icon',
            icon_size: 20,
        });
    }

    // Update the position of the icon based on the window state
    _updateIconPosition() {
        try {
            if (global.display.focus_window) {
                this._indicator.visible = true;
                if (global.display.focus_window.is_above()) {
                    this._indicator.remove_child(this._defaultIcon);
                    this._indicator.add_child(this._topIcon);
                } else {
                    this._indicator.remove_child(this._topIcon);
                    this._indicator.add_child(this._defaultIcon);
                }
            } else {
                this._indicator.visible = false;
            }
        } catch (error) {
            this._indicator.visible = false;
        }
    }
}
