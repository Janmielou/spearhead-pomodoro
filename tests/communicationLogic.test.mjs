/**
 * Plain Node tests for Para-RAID communication logic. Run with:
 * node tests/communicationLogic.test.mjs
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_PREFERENCES,
  appendMessage,
  buildMessage,
  clearTransmissionHistory,
  latestMessage,
  sanitizeKeyList,
  sanitizeMessages,
  sanitizePreferences,
  shouldEmit,
} from '../src/hooks/communicationLogic.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

const prefs = (patch = {}) => sanitizePreferences({ ...DEFAULT_PREFERENCES, ...patch });
const msg = (type, at = 1000, context = {}) => buildMessage({ type, at, context }, `id-${type}-${at}`);

check('events are worded and categorised as specified', () => {
  const started = msg('timer.focus.started');
  assert.equal(started.category, 'handler');
  assert.equal(started.text, 'Operation authorized. Begin assigned objectives.');
  assert.equal(msg('timer.focus.paused').category, 'system');
  assert.equal(msg('timer.focus.completed').text, 'Operation concluded. Results successfully recorded.');
  assert.equal(msg('timer.break.started').text, 'Respite period authorized. Stand by for the next operational cycle.');
  assert.equal(msg('timer.break.completed').category, 'squadron');
  const created = msg('mission.created', 1000, { title: 'Capstone', code: 'MSN-001' });
  assert.equal(created.category, 'mission');
  assert.match(created.text, /Capstone \(MSN-001\)/);
  assert.equal(msg('made.up.event'), null);
});

check('turning Para-RAID off blocks every message', () => {
  const off = prefs({ enabled: false });
  for (const type of ['timer.focus.started', 'timer.focus.completed', 'mission.completed']) {
    assert.equal(shouldEmit(msg(type), off), false);
  }
});

check('a disabled channel blocks only its own messages', () => {
  const noMission = prefs({ frequency: 'frequent', categories: { handler: true, squadron: true, system: true, mission: false } });
  assert.equal(shouldEmit(msg('mission.created', 1, { title: 'X', code: 'MSN-001' }), noMission), false);
  assert.equal(shouldEmit(msg('timer.focus.started'), noMission), true);
  const noHandler = prefs({ frequency: 'frequent', categories: { handler: false, squadron: true, system: true, mission: true } });
  assert.equal(shouldEmit(msg('timer.focus.started'), noHandler), false);
  assert.equal(shouldEmit(msg('timer.focus.paused'), noHandler), true);
});

check('frequency levels filter by tier', () => {
  const minimal = prefs({ frequency: 'minimal' });
  assert.equal(shouldEmit(msg('timer.focus.completed'), minimal), true); // tier 1
  assert.equal(shouldEmit(msg('timer.focus.started'), minimal), false); // tier 2
  assert.equal(shouldEmit(msg('timer.focus.paused'), minimal), false); // tier 3

  const standard = prefs({ frequency: 'standard' });
  assert.equal(shouldEmit(msg('timer.focus.started'), standard), true);
  assert.equal(shouldEmit(msg('mission.created', 1, { title: 'X', code: 'MSN-001' }), standard), true);
  assert.equal(shouldEmit(msg('timer.focus.paused'), standard), false);
  assert.equal(shouldEmit(msg('timer.focus.milestone'), standard), false);

  const frequent = prefs({ frequency: 'frequent' });
  assert.equal(shouldEmit(msg('timer.focus.paused'), frequent), true);
  assert.equal(shouldEmit(msg('timer.focus.milestone'), frequent), true);
  assert.equal(shouldEmit(msg('mission.edited', 1, { title: 'X', code: 'MSN-001' }), frequent), true);
});

check('the same event can only produce one message', () => {
  let list = [];
  const event = { type: 'timer.focus.started', at: 5000, eventKey: 'timer-1-started-focus' };
  list = appendMessage(list, buildMessage(event, 'a'));
  list = appendMessage(list, buildMessage(event, 'b'));
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'a');
});

check('corrupt preferences fall back to standard defaults', () => {
  assert.deepEqual(sanitizePreferences(null), DEFAULT_PREFERENCES);
  assert.deepEqual(sanitizePreferences('junk'), DEFAULT_PREFERENCES);
  const fixed = sanitizePreferences({ frequency: 'loud', categories: { mission: false } });
  assert.equal(fixed.frequency, 'standard');
  assert.equal(fixed.categories.mission, false);
  assert.equal(fixed.categories.handler, true);
  assert.equal(fixed.enabled, true);
});

check('corrupt history is cleaned, duplicates dropped, good messages kept', () => {
  const messy = [
    { id: 'm1', eventKey: 'k1', type: 'timer.focus.started', text: 'Operation authorized. Begin assigned objectives.', at: 100 },
    { id: 'm2', eventKey: 'k1', type: 'timer.focus.started', text: 'duplicate', at: 100 },
    { id: 'm3', type: 'not.real', text: 'fake', at: 100 },
    { id: 'm4', type: 'timer.focus.completed', text: '', at: 100 },
    'garbage',
    null,
  ];
  const clean = sanitizeMessages(messy);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].category, 'handler');
  assert.deepEqual(sanitizeMessages('nope'), []);
});

check('processed event keys are cleaned and capped', () => {
  const keys = sanitizeKeyList(['a', 'a', 5, '', 'b']);
  assert.deepEqual(keys, ['a', 'b']);
});

check('timestamps survive a save and restore round trip', () => {
  const original = [msg('timer.focus.completed', 1730000000000), msg('timer.break.started', 1730001000000)];
  const restored = sanitizeMessages(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(restored.map((m) => m.at), [1730000000000, 1730001000000]);
});

check('clearing history empties the log and the latest message', () => {
  const before = [
    buildMessage({ type: 'timer.focus.started', at: 100, eventKey: 'a' }, 'm1'),
    buildMessage({ type: 'timer.focus.completed', at: 200, eventKey: 'b' }, 'm2'),
  ];
  assert.equal(latestMessage(before).id, 'm2');
  const after = clearTransmissionHistory(before);
  assert.deepEqual(after, []);
  assert.equal(latestMessage(after), null); // the page shows its empty state
});

check('clearing history leaves preferences and processed keys alone', () => {
  const prefsBefore = sanitizePreferences({ frequency: 'frequent', categories: { mission: false }, sound: true });
  const keysBefore = sanitizeKeyList(['timer-1-started', 'mission-x']);
  clearTransmissionHistory([buildMessage({ type: 'timer.focus.started', at: 1, eventKey: 'z' }, 'm')]);
  assert.deepEqual(sanitizePreferences(prefsBefore), prefsBefore);
  assert.deepEqual(sanitizeKeyList(keysBefore), ['timer-1-started', 'mission-x']);
});

check('the all objectives milestone is a Mission Control message at Standard', () => {
  const milestone = buildMessage(
    { type: 'mission.objectivesCompleted', at: 300, context: { title: 'Capstone', code: 'MSN-001' } },
    'm9',
  );
  assert.equal(milestone.category, 'mission');
  assert.match(milestone.text, /All objectives completed\. Mission completion is awaiting operator authorization\./);
  assert.equal(shouldEmit(milestone, prefs()), true); // standard
  assert.equal(shouldEmit(milestone, prefs({ frequency: 'minimal' })), false);
  assert.equal(
    shouldEmit(milestone, prefs({ categories: { handler: true, squadron: true, system: true, mission: false } })),
    false,
  );
});

check('the milestone event can only be recorded once', () => {
  const key = 'mission-objectivesCompleted-m1-o1-o2';
  const first = buildMessage({ type: 'mission.objectivesCompleted', at: 1, eventKey: key, context: { title: 'X', code: 'MSN-001' } }, 'one');
  const again = buildMessage({ type: 'mission.objectivesCompleted', at: 2, eventKey: key, context: { title: 'X', code: 'MSN-001' } }, 'two');
  let list = appendMessage([], first);
  list = appendMessage(list, again);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'one');
});

check('edit announcements use the updated mission title', () => {
  const edited = buildMessage(
    { type: 'mission.edited', at: 5, context: { title: 'Capstone Development', code: 'MSN-002' } },
    'm7',
  );
  assert.match(edited.text, /Capstone Development \(MSN-002\)/);
  assert.doesNotMatch(edited.text, /Old Project/);
});

console.log(`\nAll ${passed} communication logic tests passed.`);
