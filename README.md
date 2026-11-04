# Aero Peek for GNOME

Show/Hide all open desktop windows with one click.

## Install

1. Download the latest release
2. Extract it in your `~/.local/share/gnome-shell/extensions` folder
3. Run `gnome-extensions enable aero-peek-for-gnome@pierreprezelin.com` in the terminal (or enable it from your favorite Extensions app)

## Features

- 🖼️ Mask (or keep) the active window
- 🎨 Bring your own icons (windows shown / collapsed) and choose their position on the panel
- 👻 Enable/Disable window opacity on button hover
- ☁️ Tweak the opacity of open windows while peeking
- ⏰ Select the hover animation duration and delay before fading open windows
- ⌨️ Choose your default keyboard shortcut to show/hide all open windows

## Available translations

- 🇩🇪 Deutsch
- 🇬🇧 English
- 🇪🇸 Español
- 🇫🇷 Français
- 🇮🇹 Italiano
- 🇳🇱 Nederlands
- 🇵🇹 Português

**How to add a new language:**

1. Copy-paste one of the `po/*.po` file into `po/[locale].po` (ex: `es.po`).
2. Open this `[locale].po` file in the [Poedit](https://poedit.com/) software and translate all strings.
3. Run `bun run translations:extract` to extract new strings to the `aero-peek-for-gnome.pot` file.
4. Run `bun run translations:compile` to compile all `*.po` files to the `locale/` folder.

## Version history

| Version | Changes                                   |
| ------- | ----------------------------------------- |
| 1       | Initial release with support for GNOME 50 |
