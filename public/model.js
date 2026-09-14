export const DEMO_EMAIL = 'demo@loop.test';
export const DEMO_PASSWORD = 'Test123!';
export const DATA_KEY = 'loop.demo.v1';
export const SESSION_KEY = 'loop.session.v1';
export const STATUSES = ['To do', 'In progress', 'Done'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
export const PROJECTS = ['Website launch', 'Mobile app', 'Internal ops'];
export const ASSIGNEES = ['Alex Morgan', 'Jamie Chen', 'Sam Rivera'];
export const ROLES = ['Product designer', 'Product manager', 'Engineer', 'QA specialist'];

export function seedState() {
  return {
    version: 1,
    nextId: 7,
    profile: { name: 'Alex Morgan', role: 'Product designer', weeklyEmail: true, compact: false },
    tasks: [
      { id: 'TSK-001', title: 'Design the new homepage', description: 'Explore a clear, welcoming direction for the website homepage.', project: 'Website launch', status: 'In progress', priority: 'High', assignee: 'Alex Morgan', due: '2026-09-18' },
      { id: 'TSK-002', title: 'Review onboarding flow', description: 'Walk through the first-run experience and collect feedback.', project: 'Mobile app', status: 'To do', priority: 'High', assignee: 'Jamie Chen', due: '2026-09-21' },
      { id: 'TSK-003', title: 'Update the component library', description: 'Document the latest buttons, inputs, and navigation patterns.', project: 'Website launch', status: 'In progress', priority: 'Medium', assignee: 'Alex Morgan', due: '2026-09-23' },
      { id: 'TSK-004', title: 'Write release notes', description: 'Summarize the changes in the next mobile release.', project: 'Mobile app', status: 'To do', priority: 'Low', assignee: 'Sam Rivera', due: '2026-09-25' },
      { id: 'TSK-005', title: 'Set up the team workspace', description: 'Organize the shared workspace for the new project.', project: 'Internal ops', status: 'Done', priority: 'Medium', assignee: 'Jamie Chen', due: '2026-09-14' },
      { id: 'TSK-006', title: 'Publish the brand guidelines', description: 'Share the approved colors, typography, and brand assets.', project: 'Website launch', status: 'Done', priority: 'Low', assignee: 'Sam Rivera', due: '2026-09-15' }
    ],
    activity: [{ text: 'Jamie completed “Set up the team workspace”', at: '2026-09-14T09:00:00.000Z' }, { text: 'Sam completed “Publish the brand guidelines”', at: '2026-09-14T08:30:00.000Z' }, { text: 'Alex started “Design the new homepage”', at: '2026-09-14T08:00:00.000Z' }]
  };
}

export function validLogin(email, password) {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

export function validateTask(task) {
  const errors = {};
  if (!task.title || task.title.trim().length < 3) errors.title = 'Enter a task name with at least 3 characters.';
  else if (task.title.trim().length > 80) errors.title = 'Keep the task name to 80 characters or fewer.';
  if (typeof task.description !== 'string' || task.description.length > 500) errors.description = 'Keep the description to 500 characters or fewer.';
  if (!PROJECTS.includes(task.project)) errors.project = 'Choose a project.';
  if (!STATUSES.includes(task.status)) errors.status = 'Choose a status.';
  if (!PRIORITIES.includes(task.priority)) errors.priority = 'Choose a priority.';
  if (!ASSIGNEES.includes(task.assignee)) errors.assignee = 'Choose an assignee.';
  if (task.due && (!/^\d{4}-\d{2}-\d{2}$/.test(task.due) || !Number.isFinite(Date.parse(task.due)) || new Date(task.due).toISOString().slice(0, 10) !== task.due)) errors.due = 'Enter a valid due date.';
  return errors;
}

export function validateProfile(profile) {
  const errors = {};
  if (typeof profile.name !== 'string' || profile.name.trim().length < 2 || profile.name.trim().length > 40) errors.name = 'Enter a display name between 2 and 40 characters.';
  if (!ROLES.includes(profile.role)) errors.role = 'Choose a role.';
  return errors;
}

export function filterTasks(tasks, { search = '', status = '', project = '', sort = 'newest' } = {}) {
  const query = search.trim().toLowerCase();
  const filtered = tasks.filter(t => (!status || t.status === status) && (!project || t.project === project) && `${t.id} ${t.title} ${t.description} ${t.assignee}`.toLowerCase().includes(query));
  return filtered.sort((a, b) => {
    if (sort === 'name') return a.title.localeCompare(b.title);
    if (sort === 'due') return (a.due || '9999').localeCompare(b.due || '9999') || a.id.localeCompare(b.id);
    return Number(b.id.slice(4)) - Number(a.id.slice(4));
  });
}

export function stats(tasks) {
  return { total: tasks.length, todo: tasks.filter(t => t.status === 'To do').length, progress: tasks.filter(t => t.status === 'In progress').length, done: tasks.filter(t => t.status === 'Done').length };
}

function record(state, text) {
  state.activity.unshift({ text, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 8);
}

export function saveTask(state, input, id = null) {
  const errors = validateTask(input);
  if (Object.keys(errors).length) return { errors };
  const task = { ...input, title: input.title.trim(), description: input.description.trim() };
  if (id) {
    const index = state.tasks.findIndex(t => t.id === id);
    if (index < 0) return { errors: { title: 'This task no longer exists.' } };
    state.tasks[index] = { ...task, id };
    record(state, `Updated “${task.title}”`);
  } else {
    id = `TSK-${String(state.nextId++).padStart(3, '0')}`;
    state.tasks.push({ ...task, id });
    record(state, `Created “${task.title}”`);
  }
  return { id };
}

export function deleteTask(state, id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return false;
  state.tasks = state.tasks.filter(t => t.id !== id);
  record(state, `Deleted “${task.title}”`);
  return true;
}

export function decodeState(raw) {
  try {
    const state = JSON.parse(raw);
    if (!state || state.version !== 1 || !Number.isSafeInteger(state.nextId) || state.nextId < 1 || !Array.isArray(state.tasks) || !Array.isArray(state.activity) || !state.profile) return null;
    if (Object.keys(validateProfile(state.profile)).length || typeof state.profile.weeklyEmail !== 'boolean' || typeof state.profile.compact !== 'boolean') return null;
    const ids = new Set();
    for (const task of state.tasks) {
      if (!task || typeof task.title !== 'string' || typeof task.due !== 'string' || Object.keys(validateTask(task)).length || !/^TSK-\d{3,}$/.test(task.id) || Number(task.id.slice(4)) >= state.nextId || ids.has(task.id)) return null;
      ids.add(task.id);
    }
    if (!state.activity.every(a => a && typeof a.text === 'string' && typeof a.at === 'string' && Number.isFinite(Date.parse(a.at)))) return null;
    return state;
  } catch { return null; }
}
