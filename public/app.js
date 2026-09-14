import { DEMO_EMAIL, DEMO_PASSWORD, DATA_KEY, SESSION_KEY, STATUSES, PRIORITIES, PROJECTS, ASSIGNEES, ROLES, seedState, validLogin, validateTask, validateProfile, filterTasks, stats, saveTask, deleteTask, decodeState } from './model.js';

const $ = (selector, root = document) => root.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  tasks: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 1 1 2-2m-3 7 1 1 2-2m3-5h3m-3 6h3"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  book: '<path d="M12 5v16M12 5C9 3 5 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-2-1-6-1-9 1Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  logout: '<path d="M9 4H5v16h4m5-12 4 4-4 4m-5-4h12"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  dot: '<circle cx="12" cy="12" r="8"/>',
  folder: '<path d="M3 7V4h6l3 3h9v13H3Z"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.dot}</svg>`;
const brand = '<a class="brand" href="#/overview" aria-label="Loop home"><img src="./favicon.svg" alt="" width="36" height="36">loop<span class="brand-dot">.</span></a>';
const options = (values, selected) => values.map(value => `<option${value === selected ? ' selected' : ''}>${escape(value)}</option>`).join('');
const initials = name => name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const badge = status => `<span class="badge ${status.toLowerCase().replaceAll(' ', '-')}"><span></span>${escape(status)}</span>`;
const dateLabel = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let storageFailed = false;
function readStorage(type, key) { try { return window[type].getItem(key); } catch { storageFailed = true; return null; } }
function writeStorage(type, key, value) {
  try { value === null ? window[type].removeItem(key) : window[type].setItem(key, value); }
  catch { storageFailed = true; }
  $('#storage-warning').hidden = !storageFailed;
}
const stored = readStorage('localStorage', DATA_KEY);
let state = decodeState(stored) || seedState();
let signedIn = readStorage('sessionStorage', SESSION_KEY) === 'demo';
let filters = { search: '', status: '', project: '', sort: 'newest' };
let route = 'overview';
let modalTrigger;
let toastTimer;
let pending = false;
const modal = $('#modal');
function persist() { writeStorage('localStorage', DATA_KEY, JSON.stringify(state)); }
function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}

function loginPage() {
  document.title = 'Sign in · Loop';
  $('#app').innerHTML = `<main class="login-layout" id="main" tabindex="-1">
    <section class="login-story">${brand}<div class="story-copy"><span class="eyebrow">YOUR TEAM, IN THE LOOP</span><h1>A little less busy.<br>A lot more done.</h1><p>A shared space for the tasks, projects, and small wins that move work forward.</p><div class="story-line"></div><div class="story-note"><span class="avatar-stack"><b>AM</b><b>JC</b><b>SR</b></span><span>One workspace.<br><strong>Room for your whole team.</strong></span></div></div><span class="story-footer">A fictional workspace. Real things to try.</span></section>
    <section class="login-panel"><div class="login-card"><span class="sandbox-label">TESTING SANDBOX</span><h2>Welcome back</h2><p class="muted">Sign in to your Loop workspace.</p>
    <form id="login-form" novalidate data-testid="login-form"><div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" required data-testid="login-email" aria-describedby="email-error"><p class="field-error" id="email-error" hidden></p></div>
    <div class="field"><label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required data-testid="login-password" aria-describedby="password-error"><button type="button" class="password-toggle" data-action="toggle-password" aria-label="Show password" aria-pressed="false">Show</button></div><p class="field-error" id="password-error" hidden></p></div>
    <p class="form-error" id="login-error" role="alert" hidden></p><button class="button primary full" type="submit" data-testid="login-submit">Sign in ${icon('arrow')}</button></form>
    <div class="demo-account"><div><strong>Your demo account</strong><span>No sign-up needed. Use these details to explore.</span></div><dl><div><dt>Email</dt><dd>${DEMO_EMAIL}</dd></div><div><dt>Password</dt><dd>${DEMO_PASSWORD}</dd></div></dl><button class="button secondary full" data-action="fill-login" data-testid="fill-demo-credentials">Use demo credentials</button></div>
    <p class="login-footnote">Demo only · Changes are saved in this browser.<br>This sign-in simulates authentication.</p></div></section></main>`;
}

function shell(content) {
  const navigation = [['overview', 'grid', 'Overview'], ['tasks', 'tasks', 'All tasks'], ['settings', 'settings', 'Settings']];
  const titles = { overview: 'Overview', tasks: 'All tasks', settings: 'Settings', guide: 'Test guide' };
  document.title = `${titles[route]} · Loop`;
  $('#app').innerHTML = `<div class="app-shell ${state.profile.compact ? 'compact' : ''}"><aside class="sidebar">${brand}<div class="workspace"><div class="workspace-icon">S</div><div><strong>Studio workspace</strong><span>Demo team</span></div><span class="workspace-tag">DEMO</span></div><div class="nav-label">WORKSPACE</div><nav aria-label="Main navigation">${navigation.map(([path, name, title]) => `<a class="nav-item ${route === path ? 'active' : ''}" href="#/${path}" ${route === path ? 'aria-current="page"' : ''}>${icon(name)}${title}${path === 'tasks' ? `<span class="nav-count">${state.tasks.length}</span>` : ''}</a>`).join('')}</nav><div class="sidebar-bottom"><a href="#/guide" class="nav-item ${route === 'guide' ? 'active' : ''}" ${route === 'guide' ? 'aria-current="page"' : ''}>${icon('book')}Test guide</a><button class="nav-item" data-action="reset" data-testid="reset-demo">${icon('reset')}Reset demo data</button><div class="sidebar-note"><span class="sandbox-label">YOUR TESTING PLAYGROUND</span><p>Try things. Make changes.<br>Reset whenever you need.</p></div><div class="user-block"><span class="avatar">${escape(initials(state.profile.name))}</span><div><strong>${escape(state.profile.name)}</strong><span>Demo account</span></div><button class="icon-button" aria-label="Sign out" data-action="logout" data-testid="logout">${icon('logout')}</button></div></div></aside>
    <div class="main-column"><header class="topbar"><div><span class="muted">Workspace</span><span class="breadcrumb-separator">/</span><strong>${titles[route]}</strong></div><span class="demo-pill">Demo environment</span></header><main id="main" class="main-content" tabindex="-1">${content}</main><footer class="app-footer"><span>Loop · Demo data stored in this browser</span><span class="footer-links"><a href="#/guide">Test guide</a><button data-action="reset">Reset demo data</button></span></footer></div></div>`;
}

function taskRows(tasks) {
  return tasks.map(task => `<tr data-testid="task-row-${task.id}"><td><div class="task-name-cell"><button class="task-checkbox ${task.status === 'Done' ? 'checked' : ''}" data-action="complete" data-id="${task.id}" data-testid="task-complete-${task.id}" aria-label="Mark ${escape(task.title)} as ${task.status === 'Done' ? 'to do' : 'done'}" aria-pressed="${task.status === 'Done'}">${task.status === 'Done' ? icon('check') : ''}</button><div><button class="task-title" data-action="edit-task" data-id="${task.id}" data-testid="task-open-${task.id}">${escape(task.title)}</button><span class="task-id">${task.id}</span></div></div></td><td><span class="project-label">${escape(task.project)}</span></td><td>${badge(task.status)}</td><td><span class="priority ${task.priority.toLowerCase()}"><i></i>${task.priority}</span></td><td><span class="assignee"><span class="avatar small ${task.assignee === 'Jamie Chen' ? 'blue' : task.assignee === 'Sam Rivera' ? 'pink' : ''}" aria-hidden="true">${initials(task.assignee)}</span><span>${escape(task.assignee)}</span></span></td><td class="due-date">${dateLabel(task.due)}</td></tr>`).join('');
}
function taskTable(tasks) {
  return `<div class="table-scroll"><table><caption class="sr-only">Workspace tasks. Select a task name to edit it.</caption><thead><tr><th scope="col">Task name</th><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Assignee</th><th scope="col">Due date</th></tr></thead><tbody>${taskRows(tasks)}</tbody></table></div>`;
}
function heading(eyebrow, title, subtitle, action = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
const newTaskButton = () => `<button class="button primary" data-action="new-task" data-testid="new-task">${icon('plus')}New task</button>`;

function overviewPage() {
  const counts = stats(state.tasks);
  const progress = counts.total ? Math.round(counts.done / counts.total * 100) : 0;
  shell(`${heading('LET’S MAKE PROGRESS', `Welcome back, ${escape(state.profile.name.split(' ')[0])}`, 'Here’s what’s happening in your workspace.', newTaskButton())}<section class="stat-grid" aria-label="Task summary">${[['Total tasks', counts.total, 'tasks', '', 'Across all projects'], ['In progress', counts.progress, 'clock', 'In progress', 'Work in motion'], ['Completed', counts.done, 'check', 'Done', 'Small wins add up'], ['To do', counts.todo, 'dot', 'To do', 'Ready when you are']].map(([label, number, name, status, note], index) => `<a href="#/tasks${status ? `?status=${encodeURIComponent(status)}` : ''}" class="stat-card stat-${index}"><div class="stat-label">${label}<span class="stat-icon">${icon(name)}</span></div><strong data-testid="stat-${index}">${number}</strong><span>${note}</span></a>`).join('')}</section>
  <section class="panel"><div class="panel-heading"><div><h2>Your tasks</h2><p>A little focus goes a long way.</p></div><a class="text-link" href="#/tasks">View all tasks ${icon('arrow')}</a></div>${state.tasks.length ? taskTable(filterTasks(state.tasks).slice(0, 5)) : '<div class="empty-state"><h3>A fresh start</h3><p>Create a task to get things moving.</p></div>'}</section>
  <div class="overview-bottom"><section class="panel progress-panel"><div class="panel-heading"><h2>Project progress</h2>${icon('folder')}</div><div class="progress-total"><strong>${progress}<span>%</span></strong><p>of all tasks completed<br><b>${counts.done} of ${counts.total} tasks</b></p></div><div class="progress-track" role="progressbar" aria-label="Tasks completed" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div><div class="project-breakdown">${PROJECTS.map(project => { const tasks = state.tasks.filter(t => t.project === project); return `<div><span>${project}</span><b>${tasks.filter(t => t.status === 'Done').length} / ${tasks.length}</b></div>`; }).join('')}</div></section><section class="panel activity-panel"><div class="panel-heading"><h2>Recent activity</h2><span class="muted">Workspace updates</span></div><ul class="activity-list">${state.activity.slice(0, 4).map(a => `<li><span class="activity-icon">${icon('check')}</span><div><p>${escape(a.text)}</p><time datetime="${escape(a.at)}">${dateLabel(a.at.slice(0, 10))}</time></div></li>`).join('')}</ul></section></div>`);
}

function tasksPage() {
  shell(`${heading('A PLACE FOR EVERY NEXT STEP', 'All tasks', 'Plan the work. Keep it moving.', newTaskButton())}<section class="panel"><div class="task-toolbar"><div class="search-field">${icon('search')}<label class="sr-only" for="task-search">Search tasks</label><input id="task-search" type="search" placeholder="Search tasks…" value="${escape(filters.search)}" data-testid="task-search"></div><div class="filter-controls"><label class="sr-only" for="status-filter">Filter by status</label><select id="status-filter" data-testid="status-filter"><option value="">All statuses</option>${options(STATUSES, filters.status)}</select><label class="sr-only" for="project-filter">Filter by project</label><select id="project-filter" data-testid="project-filter"><option value="">All projects</option>${options(PROJECTS, filters.project)}</select><label class="sr-only" for="task-sort">Sort tasks</label><select id="task-sort" data-testid="task-sort"><option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>Newest first</option><option value="name" ${filters.sort === 'name' ? 'selected' : ''}>Name A–Z</option><option value="due" ${filters.sort === 'due' ? 'selected' : ''}>Due date</option></select></div></div><div id="task-results"></div><div class="table-footer"><span id="result-count" role="status" data-testid="result-count"></span><button class="text-link" data-action="clear-filters">Clear filters</button></div></section><p class="table-hint">Select a task name to edit its details. Use the checkmark to complete it.</p>`);
  renderTaskResults();
}
function renderTaskResults() {
  const tasks = filterTasks(state.tasks, filters);
  $('#task-results').innerHTML = tasks.length ? taskTable(tasks) : `<div class="empty-state" data-testid="empty-state"><div class="empty-icon">${icon('search')}</div><h2>No tasks found</h2><p>Try a different search or clear your filters.</p><button class="button secondary" data-action="clear-filters">Clear filters</button></div>`;
  $('#result-count').textContent = `${tasks.length} of ${state.tasks.length} tasks`;
}

function settingsPage() {
  const profile = state.profile;
  shell(`${heading('MAKE YOURSELF AT HOME', 'Settings', 'A few details that make this workspace yours.')}<form id="profile-form" novalidate data-testid="profile-form"><section class="panel settings-panel"><div class="panel-heading"><div><h2>Profile</h2><p>Your demo workspace identity.</p></div></div><div class="settings-body"><div class="profile-intro"><span class="avatar large">${escape(initials(profile.name))}</span><div><strong>${escape(profile.name)}</strong><span>${DEMO_EMAIL}</span></div></div><div class="form-grid"><div class="field"><label for="profile-name">Display name</label><input id="profile-name" name="name" value="${escape(profile.name)}" maxlength="40" required aria-describedby="profile-name-error" data-testid="profile-name"><p id="profile-name-error" class="field-error" hidden></p></div><div class="field"><label for="profile-role">Role</label><select id="profile-role" name="role">${options(ROLES, profile.role)}</select></div></div><div class="field"><label for="profile-email">Email address</label><input id="profile-email" type="email" value="${DEMO_EMAIL}" readonly><span class="field-help">The demo account email is fixed.</span></div></div></section><section class="panel settings-panel"><div class="panel-heading"><div><h2>Preferences</h2><p>Try toggles and persistent settings.</p></div></div><div class="settings-body"><label class="preference" for="weekly-email"><span><strong>Weekly email summary</strong><span>A demo preference; no emails are sent.</span></span><input id="weekly-email" name="weeklyEmail" type="checkbox" role="switch" ${profile.weeklyEmail ? 'checked' : ''} data-testid="weekly-email"></label><label class="preference" for="compact-view"><span><strong>Compact task rows</strong><span>Fit a little more work on your screen.</span></span><input id="compact-view" name="compact" type="checkbox" role="switch" ${profile.compact ? 'checked' : ''} data-testid="compact-view"></label></div></section><div class="settings-actions"><button class="button secondary" type="reset">Discard changes</button><button class="button primary" type="submit" data-testid="save-profile">Save changes</button></div></form>`);
}

function guidePage() {
  const flows = [['01', 'Sign in & out', 'Try an empty form, an incorrect password, then the demo credentials. Reload while signed in, then sign out.'], ['02', 'Create a task', 'Choose New task. Test the task-name validation, fill in the details, continue to the second step, then create it.'], ['03', 'Find your work', 'Search by name or task ID. Combine project and status filters, try sorting, and search for a nonexistent task.'], ['04', 'Edit & complete', 'Open a task by its name, edit its details, and save. Use its checkmark to complete it, then click again to move it to To do.'], ['05', 'Delete a task', 'Open a task and choose Delete task. Cancel to keep it, or confirm to remove it. Check that the task count changes.'], ['06', 'Personalize & reset', 'Save a display name and preferences in Settings. Reload to check persistence. Reset demo data to restore the six original tasks.']];
  shell(`${heading('A REPEATABLE PLACE TO PRACTICE', 'Test guide', 'Small workflows. Plenty of ways to put your testing tools through their paces.')}<div class="guide-banner"><div>${icon('book')}<strong>Start with a clean slate</strong><p>Reset demo data before each test run. It restores all tasks, settings, and activity while keeping you signed in.</p></div><button class="button secondary" data-action="reset">Reset demo data</button></div><div class="guide-grid">${flows.map(([number, title, body]) => `<section class="panel guide-card"><span>${number}</span><h2>${title}</h2><p>${body}</p></section>`).join('')}</div><div class="guide-footnote"><strong>Demo credentials</strong><code>${DEMO_EMAIL}</code><code>${DEMO_PASSWORD}</code><p>Data stays in this browser. Login is simulated and isn’t a security boundary. Fixed seed dates keep test results predictable.</p></div>`);
}

function render() {
  if (!signedIn) loginPage();
  else ({ overview: overviewPage, tasks: tasksPage, settings: settingsPage, guide: guidePage }[route] || overviewPage)();
  $('#storage-warning').hidden = !storageFailed;
}
function navigate() {
  if (modal.open) modal.close();
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  if (!signedIn) {
    if (path !== 'login') history.replaceState(null, '', '#/login');
    render(); return;
  }
  route = ['overview', 'tasks', 'settings', 'guide'].includes(path) ? path : 'overview';
  if (route !== path) history.replaceState(null, '', `#/${route}`);
  const params = new URLSearchParams(query);
  filters = { search: params.get('search') || '', status: STATUSES.includes(params.get('status')) ? params.get('status') : '', project: PROJECTS.includes(params.get('project')) ? params.get('project') : '', sort: ['name', 'due'].includes(params.get('sort')) ? params.get('sort') : 'newest' };
  render();
}
function openModal(html) {
  if (!modal.open) modalTrigger = document.activeElement;
  modal.innerHTML = html;
  if (!modal.open) modal.showModal();
  else $('input, button', modal)?.focus();
}
const closeButton = '<button type="button" class="icon-button" data-action="close-modal" aria-label="Close dialog">' + icon('close') + '</button>';
function field(name, label, control, help = '') {
  return `<div class="field"><label for="task-${name}">${label}</label>${control}${help ? `<span class="field-help">${help}</span>` : ''}<p class="field-error" id="task-${name}-error" hidden></p></div>`;
}
function taskModal(id = null) {
  const task = state.tasks.find(t => t.id === id) || { title: '', description: '', project: PROJECTS[0], status: STATUSES[0], priority: 'Medium', assignee: ASSIGNEES[0], due: '' };
  openModal(`<div class="modal-heading"><div><span class="eyebrow">${id || 'SOMETHING TO WORK ON'}</span><h2 id="dialog-title">${id ? 'Edit task' : 'New task'}</h2></div>${closeButton}</div><div class="step-indicator" aria-label="Form progress"><span id="step-label" role="status">Step 1 of 2 · Task details</span><div><i class="active"></i><i id="second-step-dot"></i></div></div><form id="task-form" novalidate data-id="${id || ''}" data-step="1"><div class="modal-body"><fieldset id="task-step-1"><legend class="sr-only">Task details</legend>${field('title', 'Task name', `<input id="task-title" name="title" value="${escape(task.title)}" maxlength="80" placeholder="What needs to get done?" required data-testid="task-title" aria-describedby="task-title-error">`)}${field('description', 'Description <span class="optional">(optional)</span>', `<textarea id="task-description" name="description" rows="3" maxlength="500" placeholder="Add a little context…" aria-describedby="task-description-error">${escape(task.description)}</textarea>`)}${field('project', 'Project', `<select id="task-project" name="project" aria-describedby="task-project-error">${options(PROJECTS, task.project)}</select>`)}</fieldset><fieldset id="task-step-2" hidden><legend class="sr-only">Assignment and schedule</legend><div class="form-grid">${field('status', 'Status', `<select id="task-status" name="status" aria-describedby="task-status-error">${options(STATUSES, task.status)}</select>`)}${field('priority', 'Priority', `<select id="task-priority" name="priority" aria-describedby="task-priority-error">${options(PRIORITIES, task.priority)}</select>`)}</div>${field('assignee', 'Assignee', `<select id="task-assignee" name="assignee" aria-describedby="task-assignee-error">${options(ASSIGNEES, task.assignee)}</select>`)}${field('due', 'Due date <span class="optional">(optional)</span>', `<input type="date" id="task-due" name="due" value="${escape(task.due)}" aria-describedby="task-due-error">`, 'Past and future dates are both allowed in this demo.')}</fieldset></div><div class="modal-footer">${id ? `<button type="button" class="button danger-text" data-action="delete-task" data-id="${id}" data-testid="delete-task">Delete task</button>` : '<button type="button" class="button secondary" data-action="close-modal">Cancel</button>'}<div class="button-group"><button type="button" id="task-back" class="button secondary" data-action="task-back" hidden>Back</button><button type="submit" class="button primary" id="task-submit" data-testid="task-submit">Continue ${icon('arrow')}</button></div></div></form>`);
}
function setTaskStep(step) {
  $('#task-form').dataset.step = step;
  $('#task-step-1').hidden = step !== 1;
  $('#task-step-2').hidden = step !== 2;
  $('#task-back').hidden = step !== 2;
  $('#second-step-dot').classList.toggle('active', step === 2);
  $('#step-label').textContent = step === 1 ? 'Step 1 of 2 · Task details' : 'Step 2 of 2 · Assignment & schedule';
  $('#task-submit').innerHTML = step === 1 ? `Continue ${icon('arrow')}` : $('#task-form').dataset.id ? 'Save changes' : 'Create task';
  $(step === 1 ? '#task-title' : '#task-status').focus();
}
function showErrors(form, errors, prefix) {
  form.querySelectorAll('.field-error').forEach(el => { el.hidden = true; el.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  for (const [name, message] of Object.entries(errors)) {
    const input = $(`#${prefix}${name}`, form);
    const error = $(`#${prefix}${name}-error`, form);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) { error.textContent = message; error.hidden = false; }
  }
  if (Object.keys(errors).length) $(`[aria-invalid="true"]`, form)?.focus();
}
function confirmation(kind, id) {
  const reset = kind === 'reset';
  const task = state.tasks.find(t => t.id === id);
  if (!reset && !task) return;
  openModal(`<div class="modal-heading"><h2 id="dialog-title">${reset ? 'Reset demo data?' : 'Delete this task?'}</h2>${closeButton}</div><div class="modal-body confirmation"><p>${reset ? 'This restores the six original tasks, your profile, preferences, and activity. Your changes in this browser will be removed. You’ll stay signed in.' : `“${escape(task.title)}” will be permanently removed from this browser’s demo workspace.`}</p></div><div class="modal-footer align-right"><button class="button secondary" data-action="close-modal" data-testid="cancel-confirmation" autofocus>Cancel</button><button class="button danger" data-action="${reset ? 'confirm-reset' : 'confirm-delete'}" data-id="${id || ''}" data-testid="confirm-${reset ? 'reset' : 'delete'}">${reset ? 'Reset demo data' : 'Delete task'}</button></div>`);
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled || pending) return;
  const id = button.dataset.id;
  switch (button.dataset.action) {
    case 'fill-login': $('#email').value = DEMO_EMAIL; $('#password').value = DEMO_PASSWORD; $('#email').focus(); break;
    case 'toggle-password': { const show = $('#password').type === 'password'; $('#password').type = show ? 'text' : 'password'; button.textContent = show ? 'Hide' : 'Show'; button.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); button.setAttribute('aria-pressed', String(show)); break; }
    case 'logout': signedIn = false; writeStorage('sessionStorage', SESSION_KEY, null); location.hash = '/login'; notify('You have signed out.'); break;
    case 'new-task': taskModal(); break;
    case 'edit-task': taskModal(id); break;
    case 'close-modal': modal.close(); break;
    case 'task-back': setTaskStep(1); break;
    case 'delete-task': confirmation('delete', id); break;
    case 'confirm-delete': deleteTask(state, id); persist(); modal.close(); render(); notify('Task deleted.'); break;
    case 'reset': confirmation('reset'); break;
    case 'confirm-reset': state = seedState(); filters = { search: '', status: '', project: '', sort: 'newest' }; persist(); modal.close(); history.replaceState(null, '', `#/${route}`); render(); notify('Demo data reset. You’re ready for a fresh test.'); break;
    case 'complete': { const task = state.tasks.find(t => t.id === id); if (!task) break; const status = task.status === 'Done' ? 'To do' : 'Done'; saveTask(state, { ...task, status }, id); persist(); render(); $(`[data-testid="task-complete-${id}"]`)?.focus(); notify(status === 'Done' ? 'Task marked as done.' : 'Task moved to To do.'); break; }
    case 'clear-filters': filters = { search: '', status: '', project: '', sort: 'newest' }; history.replaceState(null, '', '#/tasks'); tasksPage(); $('#task-search').focus(); break;
  }
});
document.addEventListener('input', event => { if (event.target.id === 'task-search') { filters.search = event.target.value; updateFilters(); } });
document.addEventListener('change', event => {
  const key = { 'status-filter': 'status', 'project-filter': 'project', 'task-sort': 'sort' }[event.target.id];
  if (key) { filters[key] = event.target.value; updateFilters(); }
});
document.addEventListener('reset', event => {
  if (event.target.id === 'profile-form') showErrors(event.target, {}, 'profile-');
});
function updateFilters() {
  const params = new URLSearchParams(Object.entries(filters).filter(([key, value]) => value && !(key === 'sort' && value === 'newest')));
  history.replaceState(null, '', `#/tasks${params.size ? '?' + params : ''}`);
  renderTaskResults();
}

document.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  if (pending) return;
  const values = Object.fromEntries(new FormData(form));
  if (form.id === 'login-form') {
    $('#login-error').hidden = true;
    const errors = {};
    if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
    if (!values.password) errors.password = 'Enter your password.';
    showErrors(form, errors, '');
    if (Object.keys(errors).length) return;
    const button = $('[type="submit"]', form);
    pending = true; button.disabled = true; button.textContent = 'Signing in…'; form.setAttribute('aria-busy', 'true');
    await sleep(350);
    pending = false; form.removeAttribute('aria-busy'); button.disabled = false; button.innerHTML = `Sign in ${icon('arrow')}`;
    if (!validLogin(values.email, values.password)) { $('#login-error').textContent = 'Email or password is incorrect. Try the demo credentials below.'; $('#login-error').hidden = false; $('#password').focus(); return; }
    signedIn = true; writeStorage('sessionStorage', SESSION_KEY, 'demo'); persist(); location.hash = '/overview'; notify('Welcome to your workspace.');
  } else if (form.id === 'task-form') {
    const errors = validateTask(values);
    if (form.dataset.step === '1') {
      const firstErrors = Object.fromEntries(Object.entries(errors).filter(([key]) => ['title', 'description', 'project'].includes(key)));
      showErrors(form, firstErrors, 'task-');
      if (!Object.keys(firstErrors).length) setTaskStep(2);
      return;
    }
    if (Object.keys(errors).length) {
      if (['title', 'description', 'project'].some(key => errors[key])) setTaskStep(1);
      showErrors(form, errors, 'task-'); return;
    }
    const editing = Boolean(form.dataset.id);
    const result = saveTask(state, values, form.dataset.id || null);
    if (result.errors) { showErrors(form, result.errors, 'task-'); return; }
    persist(); modal.close();
    filters = { search: '', status: '', project: '', sort: 'newest' };
    if (route !== 'tasks') location.hash = '/tasks';
    else { history.replaceState(null, '', '#/tasks'); render(); }
    notify(editing ? 'Task updated.' : `Task created · ${result.id}`);
  } else if (form.id === 'profile-form') {
    const profile = { name: values.name.trim(), role: values.role, weeklyEmail: values.weeklyEmail === 'on', compact: values.compact === 'on' };
    const errors = validateProfile(profile);
    showErrors(form, errors, 'profile-');
    if (Object.keys(errors).length) return;
    state.profile = profile; persist(); render(); $('[data-testid="save-profile"]').focus(); notify('Profile and preferences saved.');
  }
});
modal.addEventListener('close', () => { if (modalTrigger?.isConnected) modalTrigger.focus(); else $('#main')?.focus(); });
window.addEventListener('hashchange', navigate);
navigate();
if (stored && !decodeState(stored)) { persist(); notify('Saved demo data was invalid. A fresh workspace has been restored.'); }
