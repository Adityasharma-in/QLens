# MEMORY.md — Session State

## Last Updated: 2026-08-14

## Current Phase: ARCHITECT

## Last Completed Task: Planning docs (PROJECT/PLANNING/TASKS/AGENTS/MEMORY)

## Next Task: T001 — manifest.json + icons

## Active Context
- Greenfield build of QLens v1.0 (MV3 Chrome extension) from PRD (source of truth).
- Zero-build vanilla JS; shared modules use `globalThis.QLENS` namespace (SW=importScripts, CS=executeScript files, options=<script src>).
- Environment: Windows, Node v24.18.0, npm 11.16.0, Chrome at "C:\Program Files\Google\Chrome\Application\chrome.exe".
- Key decisions: nonce-based injection guard w/ removeListener swap; adoptedStyleSheets for overlay CSS; Tab-in-input cycles engines; suggestions fetched in SW; recent written by SW on OPEN_TAB; F11 clipboard chip is OUT of scope (v1.1).

## Blockers
- None. User authorized full build: "Use this PRD and build out this Project extension without any problem."

## Decisions Made This Session
- Prefix mapping: g=Google, b=Brave, k=Bing, d=DuckDuckGo (PRD A1 note).
- Context menu default action: open overlay pre-filled (setting to switch to direct).
- Suggestions ON by default (Q2).
- Ctrl+Shift+K default shortcut (A2).