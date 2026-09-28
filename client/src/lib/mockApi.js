// SAHAYA Demo Mode - localStorage-backed mock API
// Activated when user clicks "Try Demo" on the login page.
// Mirrors the real backend API response shapes so components don't change.

const DB_KEY = 'sahaya_demo_db';

function loadDb() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
  } catch { return {}; }
}
function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function delay(ms = 200) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 100));
}

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowISO() { return new Date().toISOString(); }

// Bcrypt-style fake hashing (just for demo - NOT secure for production)
function hashPw(pw) { return 'demo$' + btoa(unescape(encodeURIComponent(pw))); }
function verifyPw(pw, hash) { return hashPw(pw) === hash; }

function signToken(user) {
  // Fake JWT (NOT a real JWT - just a placeholder string)
  return btoa(JSON.stringify({ sub: user.id, email: user.email, t: Date.now() }));
}

// ---- Per-user data helpers ----
function getUser() {
  const token = localStorage.getItem('sahaya_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token));
    const db = loadDb();
    return db.users?.[payload.sub] || null;
  } catch { return null; }
}

function requireUser() {
  const u = getUser();
  if (!u) throw { response: { status: 401, data: { error: 'Authentication required' } } };
  return u;
}

// ---- Router ----
async function handle(method, url, body) {
  await delay();
  const user = requireUser();
  const db = loadDb();
  // Ensure per-user collections exist
  db.contacts = db.contacts || {};
  db.journeys = db.journeys || {};
  db.timers = db.timers || {};
  db.incidents = db.incidents || {};
  db.reports = db.reports || [];
  db.emergencies = db.emergencies || {};
  db.safetyStates = db.safetyStates || {};
  db.notifications = db.notifications || [];

  const cUser = (coll, id = null) => {
    const all = db[coll][user.id] || [];
    if (id) return all.find((x) => x.id === id);
    return all;
  };
  const setUser = (coll, items) => { db[coll][user.id] = items; };

  // ===== AUTH =====
  if (method === 'get' && url === '/auth/me') {
    const { password_hash, ...safe } = user;
    return { user: safe };
  }
  if (method === 'post' && url === '/auth/change-password') {
    if (!verifyPw(body.current_password, user.password_hash))
      throw { response: { status: 401, data: { error: 'Current password is incorrect' } } };
    user.password_hash = hashPw(body.new_password);
    db.users[user.id] = user;
    saveDb(db);
    return { ok: true };
  }
  if (method === 'delete' && url === '/auth/account') {
    delete db.users[user.id];
    delete db.contacts[user.id];
    delete db.journeys[user.id];
    delete db.timers[user.id];
    delete db.incidents[user.id];
    delete db.emergencies[user.id];
    delete db.safetyStates[user.id];
    saveDb(db);
    return { ok: true, message: 'Account deleted' };
  }

  // ===== PROFILE =====
  if (method === 'get' && url === '/profile') {
    const { password_hash, ...safe } = user;
    return { profile: safe };
  }
  if (method === 'patch' && url === '/profile') {
    Object.assign(user, body);
    user.updated_at = nowISO();
    db.users[user.id] = user;
    saveDb(db);
    const { password_hash, ...safe } = user;
    return { profile: safe };
  }
  if (method === 'get' && url === '/profile/state') {
    const states = cUser('safetyStates');
    const latest = states[states.length - 1];
    return { state: latest ? latest.state : 'safe', record: latest || null };
  }
  if (method === 'post' && url === '/profile/state') {
    const states = cUser('safetyStates');
    const rec = { id: uid(), user_id: user.id, state: body.state, note: body.note || null, created_at: nowISO() };
    states.push(rec);
    setUser('safetyStates', states);
    saveDb(db);
    return { state: rec };
  }

  // ===== CONTACTS =====
  if (method === 'get' && url === '/contacts') {
    const items = cUser('contacts');
    return { contacts: items };
  }
  if (method === 'post' && url === '/contacts') {
    const items = cUser('contacts');
    if (body.is_primary) items.forEach((c) => (c.is_primary = false));
    const c = {
      id: uid(),
      user_id: user.id,
      name: body.name,
      relationship: body.relationship || null,
      phone: body.phone || null,
      email: body.email || null,
      notification_preference: body.notification_preference || 'email',
      is_primary: !!body.is_primary,
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    items.unshift(c);
    setUser('contacts', items);
    saveDb(db);
    return { contact: c };
  }
  if (method === 'put' && /^\/contacts\/[^/]+$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('contacts');
    const idx = items.findIndex((c) => c.id === id);
    if (idx === -1) throw { response: { status: 404, data: { error: 'Contact not found' } } };
    if (body.is_primary === true) items.forEach((c) => (c.is_primary = false));
    Object.assign(items[idx], body, { updated_at: nowISO() });
    setUser('contacts', items);
    saveDb(db);
    return { contact: items[idx] };
  }
  if (method === 'delete' && /^\/contacts\/[^/]+$/.test(url)) {
    const id = url.split('/')[2];
    let items = cUser('contacts');
    const before = items.length;
    items = items.filter((c) => c.id !== id);
    setUser('contacts', items);
    saveDb(db);
    if (items.length === before) throw { response: { status: 404, data: { error: 'Contact not found' } } };
    return { ok: true };
  }
  if (method === 'post' && /^\/contacts\/[^/]+\/test$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('contacts');
    const c = items.find((x) => x.id === id);
    if (!c) throw { response: { status: 404, data: { error: 'Contact not found' } } };
    db.notifications.push({ user_id: user.id, type: 'test', payload: { contact_name: c.name }, delivery_status: 'sent', created_at: nowISO() });
    saveDb(db);
    return { ok: true, delivered_via: c.notification_preference, note: 'Demo: notification simulated. Real delivery requires a configured provider.' };
  }

  // ===== JOURNEYS =====
  if (method === 'get' && url.startsWith('/journeys')) {
    let items = cUser('journeys');
    const params = new URL(url, 'http://x').searchParams;
    const status = params.get('status');
    if (status) items = items.filter((j) => j.status === status);
    return { journeys: items };
  }
  if (method === 'post' && url === '/journeys') {
    const items = cUser('journeys');
    items.forEach((j) => { if (j.status === 'active') { j.status = 'completed'; j.completed_at = nowISO(); } });
    const j = {
      id: uid(),
      user_id: user.id,
      origin_label: body.origin_label || null,
      origin_lat: body.origin_lat, origin_lng: body.origin_lng,
      destination_label: body.destination_label,
      dest_lat: body.dest_lat, dest_lng: body.dest_lng,
      expected_arrival: body.expected_arrival || null,
      trusted_contact_id: body.trusted_contact_id || null,
      status: 'active',
      created_at: nowISO(),
      completed_at: null,
    };
    items.unshift(j);
    setUser('journeys', items);
    saveDb(db);
    return { journey: j };
  }
  if (method === 'post' && /^\/journeys\/[^/]+\/(complete|cancel)$/.test(url)) {
    const id = url.split('/')[2];
    const action = url.split('/')[3];
    const items = cUser('journeys');
    const j = items.find((x) => x.id === id);
    if (!j) throw { response: { status: 404, data: { error: 'Journey not found' } } };
    j.status = action === 'complete' ? 'completed' : 'cancelled';
    j.completed_at = nowISO();
    setUser('journeys', items);
    saveDb(db);
    return { journey: j };
  }
  if (method === 'post' && url === '/journeys/checkin') {
    const ci = {
      id: uid(),
      user_id: user.id,
      journey_id: body.journey_id || null,
      status: body.status,
      location_lat: body.lat, location_lng: body.lng,
      created_at: nowISO(),
    };
    return { check_in: ci };
  }

  // ===== TIMERS =====
  if (method === 'get' && url.startsWith('/timers')) {
    let items = cUser('timers');
    const params = new URL(url, 'http://x').searchParams;
    const status = params.get('status');
    if (status) items = items.filter((t) => t.status === status);
    items.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    return { timers: items };
  }
  if (method === 'post' && url === '/timers') {
    const items = cUser('timers');
    items.forEach((t) => { if (t.status === 'active') { t.status = 'cancelled'; t.ended_at = nowISO(); } });
    const started = new Date();
    const expires = new Date(started.getTime() + body.duration_minutes * 60000);
    const t = {
      id: uid(),
      user_id: user.id,
      duration_minutes: body.duration_minutes,
      status: 'active',
      started_at: started.toISOString(),
      expires_at: expires.toISOString(),
      ended_at: null,
    };
    items.unshift(t);
    setUser('timers', items);
    saveDb(db);
    return { timer: t };
  }
  if (method === 'post' && /^\/timers\/[^/]+\/extend$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('timers');
    const t = items.find((x) => x.id === id);
    if (!t) throw { response: { status: 404, data: { error: 'Timer not found' } } };
    const base = new Date(Math.max(Date.now(), new Date(t.expires_at).getTime()));
    t.expires_at = new Date(base.getTime() + body.minutes * 60000).toISOString();
    t.status = 'extended';
    setUser('timers', items);
    saveDb(db);
    return { timer: t };
  }
  if (method === 'post' && /^\/timers\/[^/]+\/cancel$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('timers');
    const t = items.find((x) => x.id === id);
    if (!t) throw { response: { status: 404, data: { error: 'Timer not found' } } };
    t.status = 'cancelled'; t.ended_at = nowISO();
    setUser('timers', items);
    saveDb(db);
    return { timer: t };
  }
  if (method === 'post' && /^\/timers\/[^/]+\/escalate$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('timers');
    const t = items.find((x) => x.id === id);
    if (!t) throw { response: { status: 404, data: { error: 'Timer not found' } } };
    t.status = 'escalated'; t.ended_at = nowISO();
    const contacts = cUser('contacts');
    const primary = contacts.find((c) => c.is_primary) || contacts[0];
    db.notifications.push({
      user_id: user.id,
      type: 'timer_escalation',
      payload: { timer_id: id, primary_contact: primary || null },
      delivery_status: primary ? 'sent' : 'failed',
      created_at: nowISO(),
    });
    setUser('timers', items);
    saveDb(db);
    return {
      timer: t,
      primary_contact: primary || null,
      note: primary
        ? 'Demo: timer escalation simulated. Primary contact notified (mock).'
        : 'No primary trusted contact set.',
    };
  }

  // ===== INCIDENTS =====
  if (method === 'get' && url.startsWith('/incidents')) {
    let items = cUser('incidents');
    const qIndex = url.indexOf('?q=');
    if (qIndex >= 0) {
      const q = decodeURIComponent(url.slice(qIndex + 3));
      items = items.filter((i) => (i.title + ' ' + i.description).toLowerCase().includes(q.toLowerCase()));
    }
    return { incidents: items };
  }
  if (method === 'get' && /^\/incidents\/[^/]+$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('incidents');
    const i = items.find((x) => x.id === id);
    if (!i) throw { response: { status: 404, data: { error: 'Incident not found' } } };
    return { incident: i };
  }
  if (method === 'post' && url === '/incidents') {
    const items = cUser('incidents');
    const i = {
      id: uid(),
      user_id: user.id,
      title: body.title,
      description: body.description || null,
      ai_summary: null,
      timeline: body.timeline || [],
      occurred_at: body.occurred_at || nowISO(),
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    items.unshift(i);
    setUser('incidents', items);
    saveDb(db);
    return { incident: i };
  }
  if (method === 'put' && /^\/incidents\/[^/]+$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('incidents');
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) throw { response: { status: 404, data: { error: 'Incident not found' } } };
    Object.assign(items[idx], body, { updated_at: nowISO() });
    setUser('incidents', items);
    saveDb(db);
    return { incident: items[idx] };
  }
  if (method === 'delete' && /^\/incidents\/[^/]+$/.test(url)) {
    const id = url.split('/')[2];
    let items = cUser('incidents');
    const before = items.length;
    items = items.filter((x) => x.id !== id);
    setUser('incidents', items);
    saveDb(db);
    if (items.length === before) throw { response: { status: 404, data: { error: 'Incident not found' } } };
    return { ok: true };
  }
  if (method === 'post' && /^\/incidents\/[^/]+\/summarize$/.test(url)) {
    const id = url.split('/')[2];
    const items = cUser('incidents');
    const i = items.find((x) => x.id === id);
    if (!i) throw { response: { status: 404, data: { error: 'Incident not found' } } };
    const summary = generateMockSummary(i);
    i.ai_summary = summary;
    setUser('incidents', items);
    saveDb(db);
    return { incident: i, summary };
  }

  // ===== REPORTS =====
  if (method === 'get' && url === '/reports') {
    return { reports: db.reports };
  }
  if (method === 'post' && url === '/reports') {
    const r = {
      id: uid(),
      user_id: user.id,
      category: body.category,
      description: body.description,
      location_label: body.location_label || null,
      location_lat: body.location_lat, location_lng: body.location_lng,
      status: 'pending',
      created_at: nowISO(),
    };
    db.reports.unshift(r);
    saveDb(db);
    return { report: r };
  }
  if (method === 'put' && /^\/reports\/[^/]+$/.test(url)) {
    const id = url.split('/')[2];
    const r = db.reports.find((x) => x.id === id && x.user_id === user.id);
    if (!r) throw { response: { status: 404, data: { error: 'Report not found or not owned' } } };
    Object.assign(r, body);
    saveDb(db);
    return { report: r };
  }
  if (method === 'delete' && /^\/reports\/[^/]+$/.test(url)) {
    const id = url.split('/')[2];
    const before = db.reports.length;
    db.reports = db.reports.filter((x) => !(x.id === id && x.user_id === user.id));
    saveDb(db);
    if (db.reports.length === before) throw { response: { status: 404, data: { error: 'Report not found' } } };
    return { ok: true };
  }

  // ===== EMERGENCY =====
  if (method === 'post' && url === '/emergency/activate') {
    const items = cUser('emergencies');
    const e = {
      id: uid(),
      user_id: user.id,
      state: 'active',
      location_lat: body.lat, location_lng: body.lng,
      location_label: body.label || null,
      delivery_status: 'failed', // honest: no provider configured
      device_info: { user_agent: navigator.userAgent, timestamp: nowISO() },
      created_at: nowISO(),
      resolved_at: null,
    };
    items.unshift(e);
    setUser('emergencies', items);
    const contacts = cUser('contacts');
    const primary = contacts.find((c) => c.is_primary) || contacts[0];
    db.notifications.push({
      user_id: user.id,
      type: 'emergency_activated',
      payload: { event_id: e.id, contacts_notified: contacts.length, primary_contact: primary || null },
      delivery_status: primary ? 'sent' : 'failed',
      created_at: nowISO(),
    });
    saveDb(db);
    return {
      event: e,
      provider: {
        configured: false,
        name: 'None configured',
        message: 'No authorized emergency-service integration is configured.',
        official_contact: '112',
      },
      trusted_contacts: {
        notified_count: contacts.length,
        primary: primary || null,
        delivery_note: 'Demo: emergency event created. Real SMS/Push delivery requires configured providers.',
      },
    };
  }
  if (method === 'get' && /^\/emergency\/status\/[^/]+$/.test(url)) {
    const id = url.split('/')[3];
    const items = cUser('emergencies');
    const e = items.find((x) => x.id === id);
    if (!e) throw { response: { status: 404, data: { error: 'Emergency event not found' } } };
    return { event: e };
  }
  if (method === 'post' && /^\/emergency\/resolve\/[^/]+$/.test(url)) {
    const id = url.split('/')[3];
    const items = cUser('emergencies');
    const e = items.find((x) => x.id === id);
    if (!e) throw { response: { status: 404, data: { error: 'Emergency event not found' } } };
    e.state = 'resolved'; e.resolved_at = nowISO(); e.delivery_status = 'confirmed';
    setUser('emergencies', items);
    saveDb(db);
    return { event: e };
  }
  if (method === 'get' && url === '/emergency/history') {
    const items = cUser('emergencies');
    return { events: items };
  }

  // ===== AI =====
  if (method === 'post' && url === '/ai/generate') {
    return { ok: true, available: true, reply: generateMockAIReply(body.prompt) };
  }
  if (method === 'post' && url === '/ai/summarize') {
    return { ok: true, summary: generateMockSummary({ description: body.text, timeline: [] }) };
  }

  // ===== HEALTH =====
  if (method === 'get' && url === '/health') {
    return { status: 'online', tagline: 'Prepare. Connect. Respond.', services: { database: 'demo', ai: 'demo', emergency_provider: 'not_configured' }, time: nowISO() };
  }

  // Unknown
  throw { response: { status: 404, data: { error: 'Demo route not found: ' + method.toUpperCase() + ' ' + url } } };
}

function generateMockAIReply(prompt) {
  const p = (prompt || '').toLowerCase();
  if (p.includes('hello') || p.includes('hi ')) {
    return "Hello! I'm SAHAYA's demo AI assistant. In demo mode, I provide canned responses. With a real Gemini API key, I'd give thoughtful, contextual answers. Try asking me about safety tips, scam indicators, or how to use the app's features.";
  }
  if (p.includes('scam') || p.includes('phishing')) {
    return "Common scam/phishing indicators:\n\n• Urgency: \"Act now or lose access\"\n• Unexpected attachments or links\n• Generic greetings (\"Dear Customer\")\n• Mismatched sender domain\n• Requests for passwords, OTPs, or payment via gift cards\n• Spelling/grammar errors in professional messages\n• URLs that don't match the brand\n\nIf in doubt, contact the organization through their official channel. Never click suspicious links.";
  }
  if (p.includes('emergency kit') || p.includes('prepare')) {
    return "Emergency kit essentials:\n\n• Charged phone + power bank\n• ID and emergency contact numbers\n• Small amount of cash\n• Water and a snack\n• Medication if needed\n• Whistle or personal alarm\n• Flashlight\n• List of trusted contacts\n\nKeep the kit where you can grab it quickly.";
  }
  if (p.includes('translate')) {
    return "Hindi: मुझे मदद चाहिए (mujhe madad chahiye)\nTelugu: నాకు సహాయం కావలి (naaku sahayam kavali)\nEnglish: I need help";
  }
  if (p.includes('journey') || p.includes('travel')) {
    return "Night journey safety tips:\n\n• Share your live location with a trusted contact\n• Use well-lit, populated routes\n• Keep your phone charged\n• Note vehicle numbers\n• Stay in touch via check-ins\n• Avoid isolated stops";
  }
  return "This is a demo response. With a real Gemini API key configured on the backend, I'd give you a thoughtful, contextual reply to: \"" + (prompt || '') + "\".\n\nIn demo mode, I can offer: scam/phishing indicators, journey safety tips, translations, or general preparedness guidance. Try asking about one of those.";
}

function generateMockSummary(incident) {
  const lines = [];
  lines.push("• Incident: " + (incident.title || 'Untitled'));
  if (incident.occurred_at) lines.push("• Occurred: " + new Date(incident.occurred_at).toLocaleString());
  if (incident.description) {
    const words = incident.description.split(/\s+/).slice(0, 60).join(' ');
    lines.push("• Summary: " + words + (incident.description.split(/\s+/).length > 60 ? '...' : ''));
  }
  if (Array.isArray(incident.timeline) && incident.timeline.length > 0) {
    lines.push("• Timeline entries: " + incident.timeline.length + " recorded");
  }
  lines.push("• Demo summary generated locally. With real Gemini, you'd get richer analysis.");
  return lines.join('\n');
}

// ---- Bootstrap demo user ----
export function startDemo() {
  const db = loadDb();
  db.users = db.users || {};
  const demoEmail = 'demo@sahaya.app';
  let user = Object.values(db.users).find((u) => u.email === demoEmail);
  if (!user) {
    user = {
      id: uid(),
      email: demoEmail,
      password_hash: hashPw('demo123'),
      full_name: 'Demo User',
      preferred_language: 'en',
      emergency_preferences: {},
      accessibility_preferences: {},
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    db.users[user.id] = user;
    // Seed one trusted contact + one incident for demo
    db.contacts = db.contacts || {};
    db.contacts[user.id] = [{
      id: uid(),
      user_id: user.id,
      name: 'Priya (Sister)',
      relationship: 'Sibling',
      phone: '+91 98XXX XXXXX',
      email: 'priya@example.com',
      notification_preference: 'sms',
      is_primary: true,
      created_at: nowISO(),
      updated_at: nowISO(),
    }];
    db.incidents = db.incidents || {};
    db.incidents[user.id] = [{
      id: uid(),
      user_id: user.id,
      title: 'Late night ride home (sample)',
      description: 'Took a cab home at 11pm. Driver took an unfamiliar route. Asked him to take the main road and shared live location with Priya.',
      ai_summary: null,
      timeline: [],
      occurred_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: nowISO(),
      updated_at: nowISO(),
    }];
    db.journeys = db.journeys || {};
    db.journeys[user.id] = [];
    db.timers = db.timers || {};
    db.timers[user.id] = [];
    db.emergencies = db.emergencies || {};
    db.emergencies[user.id] = [];
    db.safetyStates = db.safetyStates || {};
    db.safetyStates[user.id] = [{ id: uid(), user_id: user.id, state: 'safe', note: 'Initial state', created_at: nowISO() }];
  }
  saveDb(db);
  localStorage.setItem('sahaya_demo_mode', 'true');
  localStorage.setItem('sahaya_token', signToken(user));
  localStorage.setItem('sahaya_user', JSON.stringify({ ...user, _demo: true }));
  return { ...user, _demo: true };
}

// ---- Public api shape ----
const mockApi = {
  get: async (url, _config) => ({ data: await handle('get', url, null) }),
  post: async (url, body, _config) => ({ data: await handle('post', url, body || {}) }),
  put: async (url, body, _config) => ({ data: await handle('put', url, body || {}) }),
  patch: async (url, body, _config) => ({ data: await handle('patch', url, body || {}) }),
  delete: async (url, _config) => ({ data: await handle('delete', url, null) }),
};

export default mockApi;
