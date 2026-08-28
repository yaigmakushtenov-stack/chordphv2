# Experimental Features

## Voice-Guided Play Mode Progress

Status: first experimental implementation

Goal: add an optional play-mode feature that listens to browser speech-to-text output, estimates the current lyric position, highlights completed lyrics, and scrolls intentionally to the current part of the song.

Initial implementation:

- `BrowserSpeechTextListener` owns browser Speech Recognition setup and transcript/status output.
- The fullscreen chord performance view owns the toolbar toggle, forward lyric matching, passed-line highlight, and intentional scroll.
- The feature uses browser-native `SpeechRecognition` / `webkitSpeechRecognition` only.
- Unsupported browsers show an alert and disable the toggle.
- The first heard speech fragment starts phrase capture. The phrase is processed after a short pause, shortly after a final browser transcript, or after a max phrase duration.
- A top-center play-mode status pill shows listening, heard, processing, matched, and error feedback.

### User Experience

- Add a toggle button in the play-mode toolbar.
- When enabled, the app starts browser-native speech recognition.
- The feature should be clearly experimental and easy to turn off.
- The main content should not auto-scroll monotonously while this mode is guiding progress.
- Instead, when the matcher estimates the current lyric position, smoothly scroll that upcoming/current line toward the center of the main content.
- Previous lyric content should be colored cyan initially. The highlight color should be configurable.
- Manual section jumps should update the progress search area and should not be fought by the recognizer.

### Browser Speech Listener

Use the browser Speech Recognition API only. Do not add a package for the first experiment.

The listener should be isolated in a shared component or hook, for example:

- `BrowserSpeechTextListener`
- `useBrowserSpeechText`

Responsibilities:

- Detect support for `SpeechRecognition` or `webkitSpeechRecognition`.
- Start and stop listening from an explicit enabled state.
- Emit interim and final transcript text.
- Emit status such as `unsupported`, `idle`, `listening`, and `error`.
- Handle permission or recognition errors without breaking play mode.
- Know nothing about tracks, chords, lyrics, scrolling, or UI highlighting.

### Lyric Matching

Speech recognition will be delayed and noisy. The matcher should assume partial, imperfect text.

Normalize both transcript and lyrics:

- Lowercase text.
- Strip chords from ChordPro lines.
- Strip punctuation.
- Collapse repeated whitespace.
- Prefer meaningful words over filler words.

Search strategy:

- Keep a forward progress pointer, such as `currentLineIndex`.
- Prefer searching from the current lyric line forward.
- Search a small forward window first, for example the current line plus the next 8-16 lyric lines.
- Prefer active or visible sections, then nearby next sections.
- Avoid searching the whole song equally.
- Avoid jumping backward unless the user manually jumps sections.
- If confidence is low, do nothing.
- Start phrase capture when speech is heard. Process the phrase when no new transcript arrives for about 850ms, when the browser emits a final transcript, or when the phrase lasts about 3.5s with no pause.

Matching strategy:

- Break transcripts into short word windows.
- Score exact phrase matches highest.
- Score two-word and three-word phrase matches strongly.
- Score unique single-word matches lower.
- Penalize matches that are too far ahead.
- Prefer forward movement over revisiting completed lines.
- Let one or two useful words advance the pointer when they appear in the next likely lyric area.

### Highlighting

- Store the best matched lyric line index.
- Lines before that index are considered passed.
- Passed lines use a configurable cyan highlight for the first experiment.
- The current and upcoming lines remain in normal play-mode colors.
- Chord tokens should follow the same passed/current state as their line unless a more granular word-level model is added later.

### Scrolling

- Use intentional smooth scrolling rather than fixed-speed scrolling.
- Scroll the matched/current line toward the center of the main content viewport.
- Throttle scroll updates to avoid jitter from frequent interim transcript changes.
- Only scroll when the matched line changes meaningfully or moves outside the preferred center zone.
- Existing manual controls should still work, and manual jumps should reset the recognizer search window around the selected section.

### Isolation Boundaries

Keep the experiment replaceable:

- Browser speech listener: speech input only.
- Lyric matcher: transcript-to-line matching only.
- Play-mode component: toolbar toggle, highlight state, refs, and scrolling.

This keeps browser API quirks and future realtime/band-control work separate from the core fullscreen layout.
