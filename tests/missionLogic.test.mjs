/**
 * Plain Node tests for mission logic. Run with:
 * node tests/missionLogic.test.mjs
 */
import assert from 'node:assert/strict';
import {
  addMission,
  addObjective,
  deleteMission,
  deleteObjective,
  filterMissions,
  missionCompletionCheck,
  missionCounts,
  missionProgress,
  sanitizeMissions,
  setMissionStatus,
  setObjectiveCompleted,
  updateMission,
  updateObjective,
  willCompleteAllObjectives,
} from '../src/hooks/missionLogic.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

const T = 1700000000000;
let list = [];
let mission;

check('1. creating a mission trims the title and uses sensible defaults', () => {
  const result = addMission([], { title: '  Capstone Project  ' }, T, 'm1');
  list = result.missions;
  mission = result.mission;
  assert.equal(mission.title, 'Capstone Project');
  assert.equal(mission.priority, 'normal');
  assert.equal(mission.status, 'pending');
  assert.equal(mission.code, 'MSN-001');
  assert.deepEqual(mission.objectives, []);
  assert.equal(addMission(list, { title: '   ' }, T, 'bad').mission, null);
});

check('2. editing a mission updates fields and the updated time', () => {
  list = updateMission(list, 'm1', { title: 'Capstone', priority: 'high', deadline: '2030-01-01' }, T + 10);
  const m = list[0];
  assert.equal(m.title, 'Capstone');
  assert.equal(m.priority, 'high');
  assert.equal(m.deadline, '2030-01-01');
  assert.equal(m.updatedAt, T + 10);
  assert.equal(updateMission(list, 'm1', { deadline: 'not a date' }, T + 11)[0].deadline, null);
});

check('8. adding an objective works, blank titles do not', () => {
  list = addObjective(list, 'm1', { title: ' Design the database ' }, T + 20, 'o1');
  list = addObjective(list, 'm1', { title: 'Write tests', estimatedSessions: 2 }, T + 21, 'o2');
  list = addObjective(list, 'm1', { title: '   ' }, T + 22, 'bad');
  assert.equal(list[0].objectives.length, 2);
  assert.equal(list[0].objectives[0].title, 'Design the database');
});

check('9. editing an objective changes its text and estimate', () => {
  list = updateObjective(list, 'm1', 'o1', { title: 'Design the schema', estimatedSessions: 3 }, T + 30);
  const o = list[0].objectives[0];
  assert.equal(o.title, 'Design the schema');
  assert.equal(o.estimatedSessions, 3);
});

check('10 and 13. completing an objective stamps it and updates progress', () => {
  list = setObjectiveCompleted(list, 'm1', 'o1', true, T + 40);
  const o = list[0].objectives[0];
  assert.equal(o.completed, true);
  assert.equal(o.completedAt, T + 40);
  assert.deepEqual(missionProgress(list[0]), { total: 2, completed: 1, percent: 50 });
});

check('finishing every objective does not complete the mission by itself', () => {
  list = setObjectiveCompleted(list, 'm1', 'o2', true, T + 41);
  assert.equal(missionProgress(list[0]).percent, 100);
  assert.equal(list[0].status, 'pending');
});

check('11. reopening an objective clears its stamp and progress drops', () => {
  list = setObjectiveCompleted(list, 'm1', 'o2', false, T + 50);
  const o = list[0].objectives[1];
  assert.equal(o.completed, false);
  assert.equal(o.completedAt, null);
  assert.equal(missionProgress(list[0]).percent, 50);
});

check('12. deleting an objective removes only that one', () => {
  list = deleteObjective(list, 'm1', 'o2', T + 60);
  assert.deepEqual(list[0].objectives.map((o) => o.id), ['o1']);
});

check('14. a mission with no objectives reports zero progress, not an error', () => {
  const empty = addMission([], { title: 'Empty' }, T, 'm2').missions[0];
  assert.deepEqual(missionProgress(empty), { total: 0, completed: 0, percent: 0 });
});

check('6. completing a mission stamps it', () => {
  list = setMissionStatus(list, 'm1', 'completed', T + 70);
  assert.equal(list[0].status, 'completed');
  assert.equal(list[0].completedAt, T + 70);
});

check('7. reopening a completed mission clears the stamp', () => {
  list = setMissionStatus(list, 'm1', 'active', T + 80);
  assert.equal(list[0].status, 'active');
  assert.equal(list[0].completedAt, null);
});

check('4. archiving a mission stamps it and takes it out of the active count', () => {
  list = setMissionStatus(list, 'm1', 'archived', T + 90);
  assert.equal(list[0].archivedAt, T + 90);
  assert.equal(missionCounts(list).archived, 1);
  assert.equal(missionCounts(list).active, 0);
});

check('5. restoring an archived mission clears the stamp', () => {
  list = setMissionStatus(list, 'm1', 'pending', T + 100);
  assert.equal(list[0].status, 'pending');
  assert.equal(list[0].archivedAt, null);
});

check('15 and 16. search and status filtering work together', () => {
  let data = [];
  data = addMission(data, { title: 'Study Python', description: 'loops and lists' }, T, 'a').missions;
  data = addMission(data, { title: 'Capstone', description: 'final year project' }, T + 1, 'b').missions;
  data = setMissionStatus(data, 'b', 'active', T + 2);
  assert.deepEqual(filterMissions(data, { query: 'python' }).map((m) => m.id), ['a']);
  assert.deepEqual(filterMissions(data, { query: 'PYTHON' }).map((m) => m.id), ['a']);
  assert.deepEqual(filterMissions(data, { query: 'final' }).map((m) => m.id), ['b']);
  assert.deepEqual(filterMissions(data, { status: 'active' }).map((m) => m.id), ['b']);
  assert.deepEqual(filterMissions(data, { status: 'active', query: 'python' }), []);
});

check('17. sorting by priority, deadline, and title', () => {
  let data = [];
  data = addMission(data, { title: 'Bravo', priority: 'low', deadline: '2030-06-01' }, T, 'a').missions;
  data = addMission(data, { title: 'Alpha', priority: 'critical' }, T + 1, 'b').missions;
  data = addMission(data, { title: 'Charlie', priority: 'high', deadline: '2030-01-01' }, T + 2, 'c').missions;
  assert.deepEqual(filterMissions(data, { sort: 'priority' }).map((m) => m.title), ['Alpha', 'Charlie', 'Bravo']);
  assert.deepEqual(filterMissions(data, { sort: 'deadline' }).map((m) => m.title), ['Charlie', 'Bravo', 'Alpha']);
  assert.deepEqual(filterMissions(data, { sort: 'title' }).map((m) => m.title), ['Alpha', 'Bravo', 'Charlie']);
});

check('18. missions survive a save and restore round trip', () => {
  const restored = sanitizeMissions(JSON.parse(JSON.stringify(list)), T + 200);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].title, 'Capstone');
  assert.equal(restored[0].objectives.length, 1);
  assert.equal(restored[0].objectives[0].completed, true);
});

check('19. corrupt stored data is repaired without losing good records', () => {
  const messy = [
    { id: 'x', title: 'Good one', priority: 'wrong', status: 'active', deadline: 'nope', objectives: [{ id: 'o', title: 'Keep me', completed: true }] },
    { id: 'x', title: 'Duplicate id', objectives: [{ title: '   ' }, { id: 'o', title: 'First' }, { id: 'o', title: 'Deduped' }] },
    { title: '' },
    'not a mission',
    null,
  ];
  const clean = sanitizeMissions(messy, T);
  assert.equal(clean.length, 2);
  assert.equal(clean[0].priority, 'normal');
  assert.equal(clean[0].deadline, null);
  assert.notEqual(clean[0].id, clean[1].id);
  assert.notEqual(clean[0].code, clean[1].code);
  assert.equal(clean[1].objectives.length, 2);
  assert.notEqual(clean[1].objectives[0].id, clean[1].objectives[1].id);
  assert.deepEqual(sanitizeMissions('garbage'), []);
});

check('3. deleting a mission removes it and its objectives', () => {
  const smaller = deleteMission(list, 'm1');
  assert.equal(smaller.length, 0);
});

check('5. a mission with zero objectives cannot be completed', () => {
  let data = addMission([], { title: 'No objectives yet' }, T, 'z1').missions;
  assert.equal(missionCompletionCheck(data[0]).canComplete, false);
  assert.equal(
    missionCompletionCheck(data[0]).message,
    'Add at least one objective before completing this mission.',
  );
  data = setMissionStatus(data, 'z1', 'completed', T + 1);
  assert.equal(data[0].status, 'pending');
});

check('6. a mission with incomplete objectives cannot be completed', () => {
  let data = addMission([], { title: 'Half done' }, T, 'z2').missions;
  data = addObjective(data, 'z2', { title: 'Step one' }, T, 'za');
  data = addObjective(data, 'z2', { title: 'Step two' }, T, 'zb');
  data = setObjectiveCompleted(data, 'z2', 'za', true, T + 1);
  assert.equal(
    missionCompletionCheck(data[0]).message,
    'Complete all objectives before marking this mission as completed.',
  );
  data = setMissionStatus(data, 'z2', 'completed', T + 2);
  assert.equal(data[0].status, 'pending');
  // The edit form path is blocked too
  data = updateMission(data, 'z2', { status: 'completed' }, T + 3);
  assert.equal(data[0].status, 'pending');
});

check('7. a mission with all objectives done can be completed', () => {
  let data = addMission([], { title: 'All done' }, T, 'z3').missions;
  data = addObjective(data, 'z3', { title: 'Only step' }, T, 'za');
  data = setObjectiveCompleted(data, 'z3', 'za', true, T + 1);
  assert.equal(data[0].status, 'pending'); // still not automatic
  assert.equal(missionCompletionCheck(data[0]).canComplete, true);
  data = setMissionStatus(data, 'z3', 'completed', T + 2);
  assert.equal(data[0].status, 'completed');
  assert.equal(data[0].completedAt, T + 2);
});

check('9. saved completed missions with no objectives are corrected, data kept', () => {
  const saved = [{
    id: 'keep-this-id',
    code: 'MSN-002',
    title: 'test',
    description: 'my notes',
    priority: 'critical',
    status: 'completed',
    deadline: '2026-11-20',
    estimatedSessions: 5,
    createdAt: T,
    updatedAt: T,
    completedAt: T,
    objectives: [],
  }];
  const fixed = sanitizeMissions(saved, T + 500);
  assert.equal(fixed[0].id, 'keep-this-id');
  assert.equal(fixed[0].title, 'test');
  assert.equal(fixed[0].description, 'my notes');
  assert.equal(fixed[0].priority, 'critical');
  assert.equal(fixed[0].deadline, '2026-11-20');
  assert.equal(fixed[0].status, 'pending');
  assert.equal(fixed[0].completedAt, null);
});

check('9b. saved completed missions with unfinished objectives are corrected too', () => {
  const saved = [{
    id: 'half', title: 'Half', status: 'completed', completedAt: T, createdAt: T,
    objectives: [
      { id: 'a', title: 'Done', completed: true, createdAt: T },
      { id: 'b', title: 'Not done', completed: false, createdAt: T },
    ],
  }];
  assert.equal(sanitizeMissions(saved, T)[0].status, 'pending');
  const good = [{
    id: 'full', title: 'Full', status: 'completed', completedAt: T, createdAt: T,
    objectives: [{ id: 'a', title: 'Done', completed: true, createdAt: T }],
  }];
  assert.equal(sanitizeMissions(good, T)[0].status, 'completed');
});

check('the all objectives milestone triggers only on the last unfinished objective', () => {
  const mission = {
    id: 'mm', title: 'Milestone', objectives: [
      { id: 'a', title: 'One', completed: true },
      { id: 'b', title: 'Two', completed: false },
    ],
  };
  assert.equal(willCompleteAllObjectives(mission, 'b'), true);
  assert.equal(willCompleteAllObjectives(mission, 'a'), false); // already done
  assert.equal(willCompleteAllObjectives({ id: 'e', objectives: [] }, 'a'), false); // zero objectives
  assert.equal(
    willCompleteAllObjectives({ id: 'h', objectives: [{ id: 'a', completed: false }, { id: 'b', completed: false }] }, 'a'),
    false,
  );
});

check('reaching all objectives does not complete the mission by itself', () => {
  let data = addMission([], { title: 'Manual finish' }, T, 'mf').missions;
  data = addObjective(data, 'mf', { title: 'Only step' }, T, 'mo');
  data = setObjectiveCompleted(data, 'mf', 'mo', true, T + 1);
  assert.deepEqual(missionProgress(data[0]), { total: 1, completed: 1, percent: 100 });
  assert.equal(data[0].status, 'pending');
});

console.log(`\nAll ${passed} mission logic tests passed.`);
