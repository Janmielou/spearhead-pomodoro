# SPEARHEAD

A Pomodoro and task app with a military command theme, inspired by 86.

You set up missions, break them into objectives, and run focus sessions
against them. Short status messages appear in the Para-RAID panel when
sessions start, finish, or a break ends. There is no character in the
app. The messages come from a plain system voice.

This is an unofficial fan project. It is not connected to the creators
of 86, and none of the text or artwork is taken from the show.

## Running it

```bash
npm install
npm run dev     # start the dev server
npm run build   # build for production
```

You need Node 18 or newer. There is no account and no server. From
Phase 2 on, your data is saved in the browser with localStorage.

## How the code is organised

```
src/
  components/
    layout/         Sidebar, Topbar, MainLayout
    timer/          FocusTimer (display; the logic is in hooks/useTimer.js)
    missions/       MissionPanel, MissionCard, MissionForm, MissionDetails,
                    ObjectiveList, ObjectiveItem, MissionFilters,
                    MissionProgress, DeleteMissionDialog
    communication/  ParaRaidPreview, CommunicationSettings, TransmissionList
    statistics/     DailyStats, OperationStats, WeeklyChart,
                    ActivityCalendar, OperationFilters, OperationsLog
    settings/       TimerSettings, DataManagement
    common/         StatusBadge, statusTones, TargetCursor
  hooks/            useTimer, useMissions, useCommunications,
                    useOperations, useInterfacePreferences, and their
                    pure logic helpers
  pages/            CommandCenter, MissionControl, ParaRaid,
                    OperationsHistory, Settings
  services/         storageService (the only place that touches
                    localStorage) and dataService (backup, restore,
                    and reset using the same keys)
  styles/           variables, global, layout, components, responsive
```

Components do not call localStorage directly. The hooks save through
`storageService`, each under its own key.

## Pages

1. Command Center
2. Mission Control
3. Para-RAID
4. Operations History
5. System Configuration

## Progress

A phase only gets ticked off once it is finished and checked.

- [x] Phase 1: Command Center. Layout, colours, fonts, and screens
      that work on desktop and mobile. Build checked on 2026-11-20.
- [x] Phase 2: Timer. Start, pause, resume, reset, focus sessions and
      breaks. Uses timestamps so it stays accurate in a background tab.
      State is saved in the browser, so a refresh keeps your place.
      Logic tests: `node tests/timerLogic.test.mjs` (14 checks).
- [x] Phase 3: Mission Control. Add and edit missions and objectives,
      set priorities, mark things done, all saved. Search, filters, and
      sorting included. Logic tests: `node tests/missionLogic.test.mjs`
      (25 checks). The Command Center now shows your real missions.
- [x] Phase 4: Para-RAID. Short status messages tied to real timer and
      mission events, in four channels (Handler Command, Squadron
      Channel, System Notifications, Mission Control). History and
      preferences are saved. Frequency can be Minimal, Standard, or
      Frequent, and each channel can be turned off on its own. Logic
      tests: `node tests/communicationLogic.test.mjs` (14 checks).
- [x] Phase 5: Operations History. Every finished, skipped, or reset
      timer session is recorded once, with real start and end times,
      actual active duration (pauses excluded), and the assigned
      mission snapshot if there was one. Stats, the Monday to Sunday
      chart, the 35 day calendar, streaks, and the grouped log all
      come from those records. Sessions finished before this phase
      only exist as the timer's total count and are noted as such.
      Logic tests: `node tests/operationLogic.test.mjs` (34 checks).
- [ ] Phase 6.11: Reference-based mosaic tile flip reveal. The
      WebGL2 renderer now uses medium rectangular black panels,
      approximately 39 by 29 CSS pixels on desktop, with occasional
      two-cell blocks, genuine perspective rotation, backface
      culling, complete stationary coverage, and a top-to-bottom
      reveal wave. Implementation and automated tests are complete;
      real browser visual verification is still pending.
- [x] Phase 6.9: Micro-tile 3D flip transition. Superseded by
      Phase 6.11. Navigation gained the cover, swap, reveal state
      machine, instant WebGL2 fallback, and settings integration
      that the mosaic renderer continues to use.
- [x] Phase 6.7: Tactical Monitor Refresh page transitions. A
      segmented grid and cyan scan sweep in the content area only,
      triggered by genuine primary navigation, with latest-wins
      rapid-click handling and an Enhanced Page Transitions toggle
      that respects Interface Animations and reduced motion.
- [x] Phase 6.5: Unified Handler color system and themes. The
      Para-RAID terminal treatment is now a shared terminal surface
      used selectively across modules, and System Configuration
      offers Handler Light and Tactical Dark themes saved in the
      existing interface preferences and included in backups.
- [x] Phase 6.4: Redundancy cleanup. The sidebar unit strip and
      navigation caption, the topbar brand kicker, the welcome
      panel's repeated operator, unit, and timer status details,
      and the duplicate empty-state Create Mission button were
      removed. Information now appears once, in its primary
      location, and Mission Control has a single creation flow.
- [x] Phase 6.3: Timer HUD activation. Starting a focus session
      plays a short authorization and deployment sequence (scan
      sweep, rotating HUD rings, sequential markers, status
      overlay) triggered only by genuine state transitions, with a
      shorter restoration sequence on resume and a green pulse on
      completion. The countdown starts immediately and is never
      delayed by the animation.
- [x] Phase 6.1: Second visual refinement. The targeting cursor is
      now always visible on desktop pointer devices, hides the
      native pointer inside the application, stays cyan in its
      neutral state, locks vermilion over interactive elements at
      1.45x scale, pulses on click, and keeps a trailing tracking
      ring. Global hover, pressed, selected, and arrival feedback
      was strengthened, with extra responsive rules down to 360px.
- [x] Phase 6: System refinement and immersion. Development labels
      removed from the interface, semantic status colors, refined
      navigation and page hierarchy, a complete System Configuration
      page (timer durations, shared communication preferences,
      interface preferences, and export/import/clear for browser
      data), an optional original targeting cursor for desktop
      pointer devices, and restrained atmosphere and transition
      polish. Logic tests: `node tests/interfaceAndData.test.mjs`
      (10 checks). All earlier suites still pass.

## Notes on the current build

- All five modules are implemented. The dashboard, Mission Control,
  Para-RAID, and Operations History all use your real saved data.
- Data stays in this browser. Use System Configuration to export a
  JSON backup, import a previous backup, or clear SPEARHEAD data.
- Known limitations: storage is local to one browser, imported data
  is applied section by section from a validated backup, and the
  targeting cursor is intentionally limited to desktop style pointer
  devices and can be turned off in System Configuration.

## Look and feel

The sidebar and top bar are dark metal. The panels are light, close to
white with a pale blue tint, and the text on them is dark. Blue and
cyan are used for highlights like the timer ring, the selected menu
item, and progress bars.

Colours were checked for contrast. Body text on the light panels is
13.8:1, and the smaller grey text is about 5:1.

The shell carries a `data-atmosphere` attribute with three planned
values: standby, active, and sanctuary. Only standby is used right
now. The others get switched on when the timer lands.

## Phase 3 refinement (2026-11-20)

Two rules were tightened after Phase 3 first shipped:

- The Command Center mission panel is read only now. Objectives there
  show a small DONE or TO DO marker instead of a checkbox. All adding,
  editing, and ticking happens in Mission Control. Both screens read
  the same state, so changes show up on the dashboard right away.
- A mission can only be marked complete when it has at least one
  objective and all of them are done. The rule is enforced in
  `missionLogic.js`, so the buttons, the edit form, and the saved data
  all agree. When it is not allowed, the app says why: "Add at least
  one objective before completing this mission." or "Complete all
  objectives before marking this mission as completed."
- Saved missions that were marked completed without meeting that rule
  are fixed the next time they load: status goes back to pending, the
  completion stamp is cleared, and everything else (id, title, notes,
  priority, deadline) is kept.

## Phase 4 refinements (2026-11-20)

- The Para-RAID page can clear its transmission history, with a
  confirmation first. Preferences and the processed event keys (the
  duplicate protection) are kept, so wiping the log does not make old
  events reappear. Timer and mission data are not touched.
- When the last unfinished objective of a mission is ticked off, a
  separate transmission is recorded: "All objectives completed.
  Mission completion is awaiting operator authorization." It fires
  once per mission and objective set, never for missions with no
  objectives, and it does not complete the mission. That still needs
  Mark Complete, with the usual rules.
- Mission edit announcements now use the updated mission details, so
  a renamed mission is announced by its new title.
