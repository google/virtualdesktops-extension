Virtual Desktops for ChromeOS
=============================

This extension provides virtual desktop capabilities for ChromeOS, and some
more.

Current Features
----------------

* Create virtual desktops. Move windows between them via keyboard shortcuts.
* Position windows on a tiling grid layout via keyboard shortcuts.

Note: to use the keyboard shortcuts (which is highly advisable), go to this
extension's settings and use the "Keyboard shortcuts" button to set a shortcut
to launch this extension. Alternatively, use the default shortcut of
[Shift]-[Alt]-d.

The following keyboard commands are available (where [Modifier] is any
modifier from Shift, Ctrl, Alt and Command, as per your preference, and
[Shortcut] is your configured keyboard shortcut, which is [Shift]-[Alt]-d by
default):

* [Shortcut] q: Move the current window to the top left (other position/size
  keys are displayed in the popup).
* [Shortcut] [Modifier]-q: Extract the current tab from the current window, and
  move it to the top left (other position/size keys are displayed in the
  popup).
* [Shortcut] [Left]: Switch to the previous virtual desktop.
* [Shortcut] [Modifier]-[Left]: Send the current window to the previous virtual
  desktop.
* [Shortcut] [Modifier]-[Right]: Send the current window to the next virtual
  desktop.
* [Shortcut] [Right]: Switch to the next virtual desktop.

Installation
------------

To install the extension, you can either visit
[its page](https://chrome.google.com/webstore/detail/virtual-desktops/migbdolpkobiafpigleooabjcbpkcdpd)
on the Chrome Web Store or run the included `build_using_closure_compiler.sh`
script (which requires the
[Closure compiler](https://developers.google.com/closure/compiler/))
and then load it into Chrome as an
[unpacked extension](https://developer.chrome.com/extensions/getstarted).

How It Works
------------

In this section, the inner workings, and which features of Chrome and ChromeOS
make this possible, will be explained. If you do not care for technical
details, I'd recommend you skip it.

### Browser Action Icon

The browser action icon is actually created via a `<canvas>` element. This
allows rendering the desktop number on the icon on-the-fly without needing one
image file per supported desktop.

### Moving Chrome Windows

To reposition an existing window, the
[`chrome.windows`](https://developer.chrome.com/extensions/windows) API is
used. However, one can't just call `chrome.windows.update()` on an existing
window and expect the position and size to "just work"! The problem is that
especially on X11, the window manager will add window borders and title bars to
the Chrome-specified target window size. So to actually achieve the desired
position, the following approach is taken:

* Position the window to the desired location via `chrome.windows.update()`.
* Wait a little to let the window manager actually perform the update. The
  callback of `chrome.windows.update()` is invoked after Chrome successfully
  requested the size change from the window manager, but before the window
  manager actually performed the action! In fact, on X11, the window manager
  can even silently ignore the request, so there is no safe way for Chrome to
  just "wait till the window manager is done".
* Query the actual position and size of the window. This will return the
  content area's position and size, excluding the title bars and borders.
* Observe that the new `left` and `top` coordinates of the window have been
  shifted down and right to make space for borders and title bars.
* Perform another `chrome.windows.update()`, compensating for the additional
  space.

Note that this will allow a window to overlap its neighboring window's borders.
This is intentional to save some space on the screen. It should not be possible
for a window to actually overlap into a neighboring window's content area.

No Chrome permissions are required for this action.

### Extracting Tabs to New Windows

To turn an existing window into a tab, the
[`chrome.windows`](https://developer.chrome.com/extensions/windows) API
provides a `chrome.windows.create()` method that can create a new window using
the `tabId` of an existing tab. To find the `tabId` of an existing tab,
[`chrome.tabs`](https://developer.chrome.com/extensions/tabs) API provides a
`chrome.tabs.query()` method that can ask for the `active` tab in the
`currentWindow`.

There are some pitfalls here too, though:

* On X11, `chrome.windows.create()` has a similar but not identical behavior
  regarding the requested vs final window size. To keep the code free from
  special cases, we instead create the window without a size specification, and
  move it into place using `chrome.windows.update()` as in the previous
  section.
* By default, creating a new window using the `tabId` of an incognito window
  will not become incognito, thus leaking history. To work around this, simply
  pass throgh the tab's `incognito` property to the `chrome.windows.create()`
  call.

No Chrome permissions are required for this action.

### Managing Virtual Desktops

There is currently no way in ChromeOS to manage virtual desktops a window is
on. So how can we possibly do this? Essentially using the same approach
[existing software](http://virtuawin.sourceforge.net/) can use to provide the
same feature on Windows.

Essentially, what this means is:

* To switch virtual desktops, all windows not on the current desktop will be
  _minimized_, and all windows on the target desktop will be _restored_.

Of course, there are pitfalls when doing this too:

* ChromeOS does not seem to remember previous window size and positions of a
  window. Thus we have to remember these before minimizing a window when
  switching away from its desktop.
* ChromeOS will move other windows out of the way when restoring windows. To
  work around this, we first perform all minimizing/restoring operations
  without specifying a target size, and then run a second round setting the
  window positions.
* Setting window positions needs to use the above mentioned workaround to
  `chrome.windows.update()`'s flaws as mentioned above.
* You don't want to lose information about the desktops when rebooting
  ChromeOS. So the internal information containing each window's desktop,
  position and size is persisted into `localStorage`.

No Chrome permissions are required for this action.

Limitations
-----------

* Due to X11-specific workarounds, window positioning and desktop switching is
  somewhat slow. In later versions, these workarounds might be disabled where
  not necessary.
* Only Chrome browser windows can be managed. Extensions have no access to
  windows of apps - and apps have no access to windows of other apps.
* Alt-Tabbing to a window on another virtual desktop will fetch this window to
  the current desktop. Detecting this and instead switching to the desktop this
  window is on - like many X11 window managers do - may not be possible on
  ChromeOS, as `onFocusChanged` events will be raised during the Alt-Tabbing
  already and not just when releasing the keys like what happens on most X11
  window managers.
* Empty virtual desktops are not allowed. The problem is that a Chrome window
  is required to receive deskop switch related keyboard shortcuts, and thus an
  empty desktop would no longer allow you to switch to a non-empty one. Thus
  empty desktops will be skipped when switching between desktops, and closing
  the last remaining Chrome window on a desktop will automatically switch to
  another, non-empty, desktop.
* By default, this extension is not active in incognito windows. However, it is
  safe to enable it there, which you can do on `chrome://extensions`.

License
-------

The code is released unser the Apache 2.0 license. See the LICENSE file for
more details.

This project is not an official Google project. It is not supported by Google
and Google specifically disclaims all warranties as to its quality,
merchantability, or fitness for a particular purpose.
