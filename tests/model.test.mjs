import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState, stats, filterTasks, validLogin, validateTask, validateProfile, saveTask, deleteTask, decodeState } from '../public/model.js';

const input = (overrides = {}) => ({ title: 'Test checkout flow', description: 'Test the happy path.', project: 'Website launch', status: 'To do', priority: 'High', assignee: 'Alex Morgan', due: '2026-10-01', ...overrides });

test('demo credentials accept normalized email and reject wrong or empty passwords', () => {
  assert.equal(validLogin(' demo@LOOP.test ', 'Test123!'), true);
  assert.equal(validLogin('demo@loop.test', 'wrong'), false);
  assert.equal(validLogin('other@loop.test', 'Test123!'), false);
  assert.equal(validLogin('', ''), false);
});

test('reset produces independent, deterministic data and counts', () => {
  const state = seedState();
  assert.deepEqual(stats(state.tasks), { total: 6, todo: 2, progress: 2, done: 2 });
  state.tasks[0].title = 'Changed';
  state.profile.name = 'Changed';
  assert.equal(seedState().tasks[0].title, 'Design the new homepage');
  assert.equal(seedState().profile.name, 'Alex Morgan');
});

test('task validation rejects invalid names, choices, and impossible dates', () => {
  assert.ok(validateTask(input({ title: '  ' })).title);
  assert.ok(validateTask(input({ title: 'a'.repeat(81) })).title);
  assert.ok(validateTask(input({ project: 'Unknown', status: 'Unknown', priority: 'Urgent', assignee: 'Unknown' })).status);
  assert.ok(validateTask(input({ due: '2026-02-30' })).due);
  assert.ok(validateTask(input({ due: 'not-a-date' })).due);
  assert.deepEqual(validateTask(input({ due: '' })), {});
  assert.deepEqual(validateTask(input({ due: '2024-02-29' })), {});
});

test('invalid submissions leave tasks, activity, and the ID counter unchanged', () => {
  const state = seedState();
  const before = structuredClone(state);
  assert.ok(saveTask(state, input({ title: '' })).errors);
  assert.deepEqual(state, before);
});

test('create, reload, edit, complete, delete, and create again keep consistent IDs and counts', () => {
  let state = seedState();
  const { id } = saveTask(state, input({ title: '  Test checkout flow  ' }));
  assert.equal(id, 'TSK-007');
  assert.equal(state.tasks.at(-1).title, 'Test checkout flow');
  state = decodeState(JSON.stringify(state));
  assert.ok(state);
  saveTask(state, input({ title: 'Updated checkout', status: 'Done' }), id);
  assert.equal(stats(state.tasks).done, 3);
  assert.equal(state.tasks.find(t => t.id === id).title, 'Updated checkout');
  assert.equal(deleteTask(state, id), true);
  assert.equal(stats(state.tasks).total, 6);
  assert.equal(saveTask(state, input()).id, 'TSK-008');
  assert.match(state.activity[0].text, /Created/);
});

test('updating or deleting a missing task does not mutate state', () => {
  const state = seedState();
  const before = structuredClone(state);
  assert.ok(saveTask(state, input(), 'TSK-999').errors);
  assert.equal(deleteTask(state, 'TSK-999'), false);
  assert.deepEqual(state, before);
});

test('combined filters, case-insensitive search, IDs, and empty results', () => {
  const tasks = seedState().tasks;
  assert.equal(filterTasks(tasks, { status: 'In progress', project: 'Website launch' }).length, 2);
  assert.equal(filterTasks(tasks, { search: 'HOMEPAGE' })[0].id, 'TSK-001');
  assert.equal(filterTasks(tasks, { search: 'TSK-004' })[0].title, 'Write release notes');
  assert.equal(filterTasks(tasks, { search: 'no such task exists' }).length, 0);
  assert.equal(filterTasks(tasks, { search: 'Jamie', status: 'Done' }).length, 1);
});

test('sorting does not reorder underlying data; missing due dates sort last', () => {
  const state = seedState();
  saveTask(state, input({ due: '' }));
  const before = structuredClone(state.tasks);
  assert.equal(filterTasks(state.tasks)[0].id, 'TSK-007');
  assert.equal(filterTasks(state.tasks, { sort: 'name' })[0].title, 'Design the new homepage');
  assert.equal(filterTasks(state.tasks, { sort: 'due' }).at(-1).id, 'TSK-007');
  assert.deepEqual(state.tasks, before);
});

test('saved preferences round-trip and invalid profile names are rejected', () => {
  assert.ok(validateProfile({ name: ' ', role: 'Engineer' }).name);
  const state = seedState();
  state.profile = { name: 'Taylor Test', role: 'QA specialist', weeklyEmail: false, compact: true };
  assert.deepEqual(decodeState(JSON.stringify(state)).profile, state.profile);
});

test('malformed, outdated, duplicate-ID, and counter-conflicting saved data are rejected', () => {
  for (const raw of ['broken JSON', 'null', '{}', '{"version":2}']) assert.equal(decodeState(raw), null);
  const duplicate = seedState();
  duplicate.tasks[1].id = duplicate.tasks[0].id;
  assert.equal(decodeState(JSON.stringify(duplicate)), null);
  const badCounter = seedState();
  badCounter.nextId = 3;
  assert.equal(decodeState(JSON.stringify(badCounter)), null);
  const badField = seedState();
  badField.tasks[0].title = { unsafe: 'shape' };
  assert.equal(decodeState(JSON.stringify(badField)), null);
});

test('activity stays bounded and empty workspaces have valid statistics', () => {
  const state = seedState();
  for (let i = 0; i < 12; i++) saveTask(state, input());
  assert.equal(state.activity.length, 8);
  for (const task of [...state.tasks]) deleteTask(state, task.id);
  assert.deepEqual(stats(state.tasks), { total: 0, todo: 0, progress: 0, done: 0 });
  assert.deepEqual(filterTasks(state.tasks), []);
  assert.ok(decodeState(JSON.stringify(state)));
});
