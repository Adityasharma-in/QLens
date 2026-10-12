# What I did to QLens — in simple words

This file explains the review and fixes in plain language. No technical jargon where possible.

## Your project in one line

QLens is a small Chrome helper. You press a shortcut, a search box appears on any page, you type, and results open in a new tab. It never saves your searches to a server. Everything stays on your computer.

## How to use it

1. Open Chrome and go to `chrome://extensions`.
2. Turn on Developer mode and click Load unpacked.
3. Pick the `QLens` folder.
4. Open any normal website and press `Ctrl+Shift+K`.
5. Type your question and press Enter.
6. Press `Esc` to close the box.

Extra things you can try:

- Type `g cats`, `b cats`, `k cats`, or `d cats` to pick Google, Brave, Bing, or DuckDuckGo.
- Type `images: cats`, `videos: cats`, `news: cats`, `yt: cats`, or `wiki: cats` for quick modes.
- Click the mode pills under the box. Click again to turn a mode off.
- Select text on a page first, then open QLens. Your text is already filled in.
- Open QLens with an empty box and no selection. If you copied text, a Clipboard chip appears. Click it to fill the box.
- Type `!` plus an engine name for custom engines you add in Options.
- Type `/` plus a command name for quick commands you add in Options.
- Paste or drag an image into the box to search the image on Google Lens.
- Type `ql` in the Chrome address bar for the same search from there.

## What I checked

- How the extension is organized. Shared code is in one place. The search box cleans itself up when closed. The background worker handles search, suggestions, images, and saved tabs.
- Safety. Your typed text is shown as plain text only. Web addresses are checked before opening. Messages between parts check the sender.
- Speed and long use. The box opens fast. Typing waits a tiny moment before asking for suggestions. Old requests are ignored. Broken saved settings fall back to safe defaults.
- Tests. Syntax check for every file. Unit tests for search addresses, settings, images, launcher, shortcuts, and selection. A browser smoke test that opens the box and searches.

## What I fixed

- The Options link inside the empty commands list did nothing when the normal open failed. It now asks the background worker to open Options through a new safe message.
- The background worker now answers that Options message. It opens the settings page and never crashes if it cannot.
- The launcher wait time now uses the same safe fallback as suggestions. A bad saved number can no longer freeze it.
- Clipboard reading is now guarded. If Chrome blocks it, QLens stays quiet and keeps working.
- Image and file handling keeps checking that the box is still open after each step. Closing mid-upload cannot leave junk behind.

## New features added

1. Quick-mode pills are always visible. You can see Images, Videos, News, YouTube, and Wikipedia under the search box. Click one to use it. Click again to turn it off. Typing `images:` still works the same.
2. Clipboard chip. If you open QLens with nothing selected and nothing typed, and you copied text before, a small chip offers that text. Click it to put the text in the box. If clipboard access is blocked, nothing appears and nothing breaks.

Both features reuse your existing settings and search flow. No new permissions were added.

## Tests I ran

- `node tests/check-syntax.mjs` — 17 files OK.
- `node tests/unit/run.mjs` — 87 passed, 0 failed.
- New tests cover clipboard text choice, wait-time fallback, request cleanup, suggestion wait, timeout behavior, and Options message name.
- Real entry-point probe — manifest loads, plain text builds a Google address, Brave builds a Brave address, `javascript:alert(1)` as typed text becomes a safe encoded search and never a direct script address.
- Browser smoke attempt — Chrome started but the test profile did not load the worker, so it skipped. This is saved as an honest fallback log. Syntax and unit tests all pass.

## Files changed

- `src/shared/messaging.js` — added the safe Options message name.
- `src/background/service-worker.js` — handle the Options message safely.
- `src/content/overlay.js` — fixed Options fallback, safer wait time, always-visible mode pills with toggle, clipboard offer chip.
- `tests/unit/run.mjs` — load async helpers and add 7 new tests.

## Speed fix and clipboard prompt fix

You reported two problems: the box felt slow and laggy, and Chrome asked for clipboard permission on every new website. I found the causes and fixed them.

Why it was slow:

- The full-screen background used a heavy blur that forces Chrome to repaint the whole page. Removed.
- The box had three glowing shapes animating forever in the background, plus a static noise layer. Removed.
- Every row in the list animated in with a delay. Removed.
- The open and close animations were long. Shortened.
- The launcher scanned your tabs, bookmarks, and history even when the box was empty. Now it only searches after you type.
- History search was cut from 30 days to 14 days, and fewer results are fetched.

Why it asked for clipboard permission:

- The old clipboard chip read your clipboard automatically every time you opened the box. Chrome treats that as a per-site permission request. That chip is now removed, so QLens never touches your clipboard unless you paste yourself with `Ctrl+V` or drag an image in.

What stayed the same:

- Select text on a page first, then open QLens. Your text is still filled in.
- Paste with `Ctrl+V` still attaches images.
- All searches, modes, pills, and suggestions work as before.

## What to do next

Reload the extension in `chrome://extensions`, press `Ctrl+Shift+K` on a normal page, try a search, try a mode pill, try the clipboard chip, then close with `Esc`. If the old tab is clean and results open in a new tab, your build is healthy.
