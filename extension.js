import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';

export default class ExampleExtension extends Extension {
    constructor(ext) {
        super(ext);
        this._indicator = null;
        this._aboveIcon = null;
        this._belowIcon = null;
        this._oldGlobalDisplayFocusWindow = null;
        this._handlerId = 0;
    }

    enable() {
        // Create the PanelMenu button and icons for above and below states for the extension
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
        this._indicator.connect('button-press-event', this._buttonClicked.bind(this));

        this._aboveIcon = this._createIcon(`${this.path}/icons/Above-symbolic.svg`);
        this._belowIcon = this._createIcon(`${this.path}/icons/Under-symbolic.svg`);

        // Initialize and update icons and connect event handlers for focus changes
        this._initializeIcons();
        this._updateIconPosition();

        this._focusAppHandlerId = Shell.WindowTracker.get_default().connectObject('notify::focus-app',
            this._focusAppChanged.bind(this), this);

        this._switchWorkspaceHandleId = global.window_manager.connectObject('switch-workspace',
            this._focusAppChanged.bind(this), this);

        // Add the extension to the status area
        Main.panel.addToStatusArea(this.uuid, this._indicator, 2, 'left');
    }

    disable() {
        // Destroy icons and the PanelMenu button and disconnect event handlers
        this._aboveIcon?.destroy();
        this._belowIcon?.destroy();

        global.window_manager.disconnectObject(this._switchWorkspaceHandleId);
        Shell.WindowTracker.get_default().disconnectObject(this._focusAppHandlerId);

        this._indicator?.destroy();
    }

    // Event handler for focus app changes
    _focusAppChanged() {
        this._isWindowChange_Handler();
        this._changeIcon();
    }

    // Check if the window is above and update the icon
    _isAboveFunction() {
        this._changeIcon();
    }

    // Handle changes in the focused window
    _isWindowChange_Handler() {
        if (this._oldGlobalDisplayFocusWindow) {
            this._oldGlobalDisplayFocusWindow.disconnect(this._handlerId);
        }
        this._newFocusedWindow();
    }

    // Get the newly focused window and connect to its 'above' property
    _newFocusedWindow() {
        this._oldGlobalDisplayFocusWindow = global.display.focus_window ? global.display.focus_window : null;
        this._handlerId = global.display.focus_window ? global.display.focus_window.connect('notify::above', this._isAboveFunction.bind(this)) : 0;
    }

    // Change the icon based on the above state
    _changeIcon() {
        this._updateIconPosition();
    }

    // Handle button click event to toggle 'above' state
    _buttonClicked() {
        global.display.focus_window.is_above() ? global.display.focus_window.unmake_above() : global.display.focus_window.make_above();
    }

    // Initialize icons and make the extension invisible
    _initializeIcons() {
        this._indicator.add_child(this._aboveIcon);
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

    // Update the position of the icon based on the 'above' state
    _updateIconPosition() {
        try {
            if (global.display.focus_window) {
                this._indicator.visible = true;
                if (global.display.focus_window.is_above()) {
                    this._indicator.remove_child(this._belowIcon);
                    this._indicator.add_child(this._aboveIcon);
                } else {
                    this._indicator.remove_child(this._aboveIcon);
                    this._indicator.add_child(this._belowIcon);
                }
            } else {
                this._indicator.visible = false;
            }
        } catch (error) {
            this._indicator.visible = false;
        }
    }
}
