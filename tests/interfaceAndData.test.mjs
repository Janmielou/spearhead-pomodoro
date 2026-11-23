/**
 * Plain Node tests for Phase 6 interface preferences, semantic
 * status tones, and backup validation. Run with:
 * node tests/interfaceAndData.test.mjs
 */
import assert from 'node:assert/strict';
import { sanitizeInterfacePreferences } from '../src/hooks/interfaceLogic.js';
import { validateBackup } from '../src/services/dataService.js';
import { navigationChange, resolveTransitionRequest, startTransition } from '../src/hooks/navigationLogic.js';
import { buildMosaicLayout, getMosaicTilePitch } from '../src/components/layout/microTileRenderer.js';
import {
  CHANNEL_TONES,
  MISSION_STATUS_TONES,
  OUTCOME_TONES,
  PRIORITY_TONES,
  TIMER_STATUS_TONES,
} from '../src/components/common/statusTones.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

check('interface preferences default to cursor and animations on', () => {
  assert.deepEqual(sanitizeInterfacePreferences(null), { targetCursor: true, animations: true, theme: 'light', pageTransitionsEnabled: true });
  assert.deepEqual(sanitizeInterfacePreferences('garbage'), { targetCursor: true, animations: true, theme: 'light', pageTransitionsEnabled: true });
});

check('interface preferences keep explicit choices and repair damaged values', () => {
  assert.deepEqual(sanitizeInterfacePreferences({ targetCursor: false, animations: false, theme: 'dark' }), {
    targetCursor: false,
    animations: false,
    theme: 'dark',
    pageTransitionsEnabled: true,
  });
  assert.deepEqual(sanitizeInterfacePreferences({ targetCursor: 'yes', animations: 1 }), {
    targetCursor: true,
    animations: true,
    theme: 'light',
    pageTransitionsEnabled: true,
  });
});

check('Theme 1 to 4. missing theme defaults to Light, valid themes survive, invalid defaults safely', () => {
  assert.equal(sanitizeInterfacePreferences({}).theme, 'light');
  assert.equal(sanitizeInterfacePreferences({ theme: 'light' }).theme, 'light');
  assert.equal(sanitizeInterfacePreferences({ theme: 'dark' }).theme, 'dark');
  assert.equal(sanitizeInterfacePreferences({ theme: 'midnight' }).theme, 'light');
  assert.equal(sanitizeInterfacePreferences({ theme: 42 }).theme, 'light');
});

check('Theme 5 and 6. cursor and animation preferences remain intact beside the theme', () => {
  const prefs = sanitizeInterfacePreferences({ targetCursor: false, animations: false, theme: 'dark' });
  assert.equal(prefs.targetCursor, false);
  assert.equal(prefs.animations, false);
  assert.equal(prefs.theme, 'dark');
});

check('Transitions 1 to 3. page transition preference defaults on, persists, and repairs safely', () => {
  assert.equal(sanitizeInterfacePreferences({}).pageTransitionsEnabled, true);
  assert.equal(sanitizeInterfacePreferences({ pageTransitionsEnabled: false }).pageTransitionsEnabled, false);
  assert.equal(sanitizeInterfacePreferences({ pageTransitionsEnabled: 'yes' }).pageTransitionsEnabled, true);
  const restored = sanitizeInterfacePreferences(
    JSON.parse(JSON.stringify({ pageTransitionsEnabled: false, theme: 'dark' })),
  );
  assert.equal(restored.pageTransitionsEnabled, false);
});

check('Transitions 4. older backups without the preference remain valid and default on', () => {
  const older = backup({ data: { 'interface-preferences': { targetCursor: true, animations: true } } });
  assert.equal(validateBackup(older).ok, true);
  assert.equal(
    sanitizeInterfacePreferences(older.data['interface-preferences']).pageTransitionsEnabled,
    true,
  );
});

check('Transitions 5 and 6. same-page navigation is excluded and the latest navigation wins', () => {
  assert.deepEqual(navigationChange('command', 'command'), { page: 'command', changed: false });
  assert.deepEqual(navigationChange('command', 'missions'), { page: 'missions', changed: true });
  assert.deepEqual(navigationChange('missions', ''), { page: 'missions', changed: false });
  const first = startTransition('missions', 1);
  const latest = startTransition('paraid', 2);
  assert.notEqual(first, latest);
  assert.deepEqual(latest, { page: 'paraid', id: 2 });
});

check('Transition machine. requests follow cover, swap, reveal, queue, and cancel rules', () => {
  const base = { displayedPage: 'command', destination: 'command' };
  assert.deepEqual(resolveTransitionRequest({ ...base, phase: 'idle', requestedPage: 'command' }), { action: 'none' });
  assert.deepEqual(resolveTransitionRequest({ ...base, phase: 'idle', requestedPage: 'missions' }), { action: 'start', destination: 'missions' });
  assert.deepEqual(
    resolveTransitionRequest({ displayedPage: 'command', phase: 'covering', destination: 'missions', requestedPage: 'paraid' }),
    { action: 'retarget', destination: 'paraid' },
  );
  assert.deepEqual(
    resolveTransitionRequest({ displayedPage: 'command', phase: 'covering', destination: 'missions', requestedPage: 'command' }),
    { action: 'cancel' },
  );
  assert.deepEqual(
    resolveTransitionRequest({ displayedPage: 'missions', phase: 'revealing', destination: 'missions', requestedPage: 'history' }),
    { action: 'queue', destination: 'history' },
  );
  assert.deepEqual(
    resolveTransitionRequest({ displayedPage: 'missions', phase: 'revealing', destination: 'missions', requestedPage: 'missions' }),
    { action: 'none' },
  );
});

check('Mosaic layout. medium rectangular tiles cover the grid without oversized panels', () => {
  assert.deepEqual(getMosaicTilePitch(1440), { width: 39, height: 29 });
  assert.deepEqual(getMosaicTilePitch(390), { width: 31, height: 23 });

  const desktop = buildMosaicLayout(1440, 900);
  assert.ok(desktop.tileCount >= 900 && desktop.tileCount <= 1500);
  assert.equal(
    desktop.tiles.reduce((sum, tile) => sum + tile.spanColumns * tile.spanRows, 0),
    desktop.columns * desktop.rows,
  );
  for (const tile of desktop.tiles) {
    assert.ok(tile.width <= 82 && tile.height <= 60);
    if (tile.spanColumns === 1 && tile.spanRows === 1) {
      assert.ok(tile.width >= 39 && tile.width <= 42);
      assert.ok(tile.height >= 29 && tile.height <= 31);
    }
  }

  const mobile = buildMosaicLayout(390, 700);
  assert.ok(mobile.tileCount > 250);
  for (const tile of mobile.tiles) {
    if (tile.spanColumns === 1 && tile.spanRows === 1) {
      assert.ok(tile.width >= 31 && tile.width <= 34);
    }
  }
});

check('mission status tones follow the semantic system', () => {
  assert.equal(MISSION_STATUS_TONES.pending, 'steel');
  assert.equal(MISSION_STATUS_TONES.active, 'cyan');
  assert.equal(MISSION_STATUS_TONES.completed, 'green');
  assert.equal(MISSION_STATUS_TONES.archived, 'gray');
  assert.equal(new Set(Object.values(MISSION_STATUS_TONES)).size, 4);
});

check('priority stays separate from mission status', () => {
  assert.deepEqual(PRIORITY_TONES, { low: 'gray', normal: 'info', high: 'amber', critical: 'red' });
  assert.equal(PRIORITY_TONES.high, OUTCOME_TONES.skipped);
  assert.notEqual(PRIORITY_TONES.normal, MISSION_STATUS_TONES.completed);
});

check('outcome and timer tones are consistent', () => {
  assert.deepEqual(OUTCOME_TONES, { completed: 'green', skipped: 'amber', abandoned: 'red' });
  assert.equal(TIMER_STATUS_TONES.running, 'cyan');
  assert.equal(TIMER_STATUS_TONES.paused, 'amber');
  assert.equal(TIMER_STATUS_TONES.completed, 'green');
  assert.equal(TIMER_STATUS_TONES.standby, 'steel');
});

check('channel tones stay in the blue family and away from outcome colors', () => {
  const tones = Object.values(CHANNEL_TONES);
  assert.equal(new Set(tones).size, 4);
  assert.ok(!tones.includes('green'));
  assert.ok(!tones.includes('amber'));
  assert.ok(!tones.includes('red'));
});

function backup(patch = {}) {
  return {
    app: 'SPEARHEAD',
    kind: 'spearhead-backup',
    version: 1,
    exportedAt: '2026-11-20T12:00:00.000Z',
    data: {
      missions: [{ id: 'm1' }, { id: 'm2' }],
      operations: [{ id: 'op1' }],
      communications: [],
      'timer-settings': { focusMinutes: 25 },
    },
    ...patch,
  };
}

check('a valid backup validates and previews its counts', () => {
  const result = validateBackup(backup());
  assert.equal(result.ok, true);
  assert.equal(result.preview.missions, 2);
  assert.equal(result.preview.operations, 1);
  assert.equal(result.preview.transmissions, 0);
  assert.ok(result.preview.sections.includes('timer-settings'));
});

check('malformed and foreign files are rejected before anything applies', () => {
  assert.equal(validateBackup(null).ok, false);
  assert.equal(validateBackup('text').ok, false);
  assert.equal(validateBackup(backup({ app: 'OTHER' })).ok, false);
  assert.equal(validateBackup(backup({ version: 99 })).ok, false);
  assert.equal(validateBackup(backup({ data: null })).ok, false);
});

check('unknown sections and wrong section types are rejected', () => {
  assert.equal(validateBackup(backup({ data: { secrets: [] } })).ok, false);
  assert.equal(validateBackup(backup({ data: { missions: {} } })).ok, false);
  assert.equal(validateBackup(backup({ data: { 'timer-settings': [] } })).ok, false);
});

check('Backup 13 to 18. theme survives backups and older backups stay valid', () => {
  // A backup carrying dark theme preferences validates as an object section.
  const withTheme = backup({
    data: {
      missions: [],
      'interface-preferences': { targetCursor: true, animations: true, theme: 'dark' },
      'communication-preferences': { enabled: true },
    },
  });
  assert.equal(validateBackup(withTheme).ok, true);
  // An older backup with no theme, or no interface section at all, is still valid.
  const older = backup({ data: { missions: [], 'interface-preferences': { targetCursor: false } } });
  assert.equal(validateBackup(older).ok, true);
  const noInterface = backup({ data: { missions: [] } });
  assert.equal(validateBackup(noInterface).ok, true);
  // Restoring either repairs to a safe theme instead of rejecting the file.
  assert.equal(sanitizeInterfacePreferences(older.data['interface-preferences']).theme, 'light');
  assert.equal(sanitizeInterfacePreferences(withTheme.data['interface-preferences']).theme, 'dark');
  assert.equal(
    sanitizeInterfacePreferences(withTheme.data['interface-preferences']).targetCursor,
    true,
  );
});

check('validation does not mutate the backup it inspected', () => {
  const candidate = backup();
  const frozen = JSON.stringify(candidate);
  validateBackup(candidate);
  assert.equal(JSON.stringify(candidate), frozen);
});

console.log(`\nAll ${passed} interface and data tests passed.`);
