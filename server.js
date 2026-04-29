// ============================================================
// MMW Newsletter Generator — server.js
// ============================================================
// Full V1 backend.
// Stack: Node + Express + Supabase (service role) + Anthropic SDK.
// Frontend: single-file SPA at public/index.html.
// ============================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const prompts = require('./prompts');

const app = express();
const PORT = process.env.PORT || 3000;

// Sonnet 4.6 — confirmed API ID per https://platform.claude.com/docs/en/about-claude/models/overview
const MODEL_ID = 'claude-sonnet-4-6';
const MAX_TOKENS_GENERATION = 4096;
const MAX_TOKENS_SECTION = 1500;
const MAX_TOKENS_SUMMARY = 300;

// ---------- Middleware ----------
app.use(express.json({ limit: '4mb' })); // 4mb to safely cover HTML template uploads + master records
app.use(express.urlencoded({ extended: true }));
// Guard: never let static files intercept API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  express.static(path.join(__dirname, 'public'))(req, res, next);
});

// ---------- External clients ----------
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ---------- Helpers ----------
function requireSupabase(req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      error: 'supabase_not_configured',
      message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.',
    });
  }
  next();
}

function requireAnthropic(req, res, next) {
  if (!anthropic) {
    return res.status(503).json({
      error: 'anthropic_not_configured',
      message: 'Set ANTHROPIC_API_KEY in environment.',
    });
  }
  next();
}

function asyncH(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function bad(res, code, msg, extra = {}) {
  return res.status(code).json({ error: msg, ...extra });
}

// ============================================================
// HEALTH
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'mmw-newsletter-generator',
    version: '1.0.0',
    model: MODEL_ID,
    env: {
      supabase: !!supabase,
      anthropic: !!anthropic,
      login_configured: !!(process.env.APP_LOGIN_EMAIL && process.env.APP_LOGIN_PASSWORD),
    },
    time: new Date().toISOString(),
  });
});

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const expectedEmail = process.env.APP_LOGIN_EMAIL;
  const expectedPassword = process.env.APP_LOGIN_PASSWORD;

  if (!expectedEmail || !expectedPassword) {
    return bad(res, 503, 'auth_not_configured');
  }
  if (email === expectedEmail && password === expectedPassword) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'invalid_credentials' });
});

// ============================================================
// AE MANAGEMENT
// ============================================================
app.get(
  '/api/aes',
  requireSupabase,
  asyncH(async (req, res) => {
    const { data, error } = await supabase
      .from('ae_list')
      .select('*')
      .order('active', { ascending: false })
      .order('name', { ascending: true });
    if (error) return bad(res, 500, error.message);
    res.json({ aes: data });
  })
);

app.post(
  '/api/aes',
  requireSupabase,
  asyncH(async (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) return bad(res, 400, 'name_required');
    const { data, error } = await supabase
      .from('ae_list')
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ ae: data });
  })
);

app.patch(
  '/api/aes/:id',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { name, active } = req.body || {};
    const update = {};
    if (typeof name === 'string') update.name = name.trim();
    if (typeof active === 'boolean') update.active = active;
    if (Object.keys(update).length === 0) return bad(res, 400, 'no_fields');
    const { data, error } = await supabase
      .from('ae_list')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ ae: data });
  })
);

// Soft "delete" = set active=false. If clients are still assigned, require reassignment first.
app.delete(
  '/api/aes/:id',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { reassign_to } = req.query;

    // Check for active clients
    const { data: assigned, error: e1 } = await supabase
      .from('clients')
      .select('id')
      .eq('ae_id', id)
      .eq('archived', false);
    if (e1) return bad(res, 500, e1.message);

    if (assigned && assigned.length > 0) {
      if (!reassign_to) {
        return bad(res, 409, 'has_active_clients', {
          count: assigned.length,
          message: 'Reassign clients to another AE first via ?reassign_to=<ae_id>',
        });
      }
      const { error: e2 } = await supabase
        .from('clients')
        .update({ ae_id: reassign_to })
        .eq('ae_id', id);
      if (e2) return bad(res, 500, e2.message);
    }

    const { error: e3 } = await supabase
      .from('ae_list')
      .update({ active: false })
      .eq('id', id);
    if (e3) return bad(res, 500, e3.message);
    res.json({ ok: true });
  })
);

// ============================================================
// CLIENTS
// ============================================================
app.get(
  '/api/clients',
  requireSupabase,
  asyncH(async (req, res) => {
    const { include_archived } = req.query;

    let q = supabase
      .from('clients')
      .select('*, ae:ae_list(id, name)')
      .order('clinic_name', { ascending: true });
    if (include_archived !== '1') q = q.eq('archived', false);

    const { data, error } = await q;
    if (error) return bad(res, 500, error.message);

    // Pull last 3 months of newsletter status for each client (rolling indicator)
    const clientIds = (data || []).map((c) => c.id);
    let recent = [];
    if (clientIds.length > 0) {
      const { data: nl, error: eN } = await supabase
        .from('newsletters')
        .select('id, client_id, month, year, status')
        .in('client_id', clientIds);
      if (eN) return bad(res, 500, eN.message);
      recent = nl || [];
    }

    // Map: { clientId: { 'YYYY-MM': { status, id } } }
    const byClient = {};
    for (const r of recent) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      byClient[r.client_id] = byClient[r.client_id] || {};
      byClient[r.client_id][key] = { status: r.status, id: r.id };
    }

    res.json({ clients: data, recent_status: byClient });
  })
);

app.post(
  '/api/clients',
  requireSupabase,
  asyncH(async (req, res) => {
    const { clinic_name, vertical, ae_id, template_type } = req.body || {};
    if (!clinic_name || !vertical) return bad(res, 400, 'clinic_name_and_vertical_required');
    if (!['obgyn', 'medspa', 'functional', 'urogyn'].includes(vertical)) {
      return bad(res, 400, 'invalid_vertical');
    }
    const insert = {
      clinic_name: clinic_name.trim(),
      vertical,
      ae_id: ae_id || null,
      template_type: template_type || 'standard',
    };
    const { data, error } = await supabase
      .from('clients')
      .insert(insert)
      .select('*, ae:ae_list(id, name)')
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ client: data });
  })
);

app.get(
  '/api/clients/:id',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { data: client, error } = await supabase
      .from('clients')
      .select('*, ae:ae_list(id, name)')
      .eq('id', id)
      .single();
    if (error) return bad(res, 500, error.message);

    const { data: assets } = await supabase
      .from('client_assets')
      .select('*')
      .eq('client_id', id);
    const { data: rules } = await supabase
      .from('client_rules')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: true });

    const { data: newsletters } = await supabase
      .from('newsletters')
      .select('id, month, year, status')
      .eq('client_id', id);

    const assetsByType = {};
    for (const a of assets || []) assetsByType[a.asset_type] = a;

    const nlStatus = {};
    for (const n of newsletters || []) {
      const key = `${n.year}-${String(n.month).padStart(2, '0')}`;
      nlStatus[key] = { status: n.status, id: n.id };
    }

    res.json({ client, assets: assetsByType, rules: rules || [], newsletter_status: nlStatus });
  })
);

app.patch(
  '/api/clients/:id',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { clinic_name, vertical, ae_id, template_type } = req.body || {};
    const update = {};
    if (typeof clinic_name === 'string') update.clinic_name = clinic_name.trim();
    if (vertical && ['obgyn', 'medspa', 'functional', 'urogyn'].includes(vertical)) update.vertical = vertical;
    if (ae_id !== undefined) update.ae_id = ae_id || null;
    if (template_type && ['standard', 'custom'].includes(template_type)) update.template_type = template_type;
    if (Object.keys(update).length === 0) return bad(res, 400, 'no_fields');

    const { data, error } = await supabase
      .from('clients')
      .update(update)
      .eq('id', id)
      .select('*, ae:ae_list(id, name)')
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ client: data });
  })
);

app.post(
  '/api/clients/:id/archive',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { archived } = req.body || {};
    const { data, error } = await supabase
      .from('clients')
      .update({ archived: archived !== false }) // default true, allow un-archive with archived=false
      .eq('id', id)
      .select()
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ client: data });
  })
);

// ============================================================
// CLIENT ASSETS  (master_record / brand_voice / html_template)
// ============================================================
app.put(
  '/api/clients/:id/assets/:assetType',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id, assetType } = req.params;
    const { content } = req.body || {};
    if (!['master_record', 'brand_voice', 'html_template'].includes(assetType)) {
      return bad(res, 400, 'invalid_asset_type');
    }
    if (typeof content !== 'string') return bad(res, 400, 'content_required');

    // Upsert by (client_id, asset_type)
    const { data, error } = await supabase
      .from('client_assets')
      .upsert(
        { client_id: id, asset_type: assetType, content, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,asset_type' }
      )
      .select()
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ asset: data });
  })
);

app.delete(
  '/api/clients/:id/assets/:assetType',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id, assetType } = req.params;
    const { error } = await supabase
      .from('client_assets')
      .delete()
      .eq('client_id', id)
      .eq('asset_type', assetType);
    if (error) return bad(res, 500, error.message);
    res.json({ ok: true });
  })
);

// ============================================================
// CLIENT RULES
// ============================================================
app.post(
  '/api/clients/:id/rules',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { rule_text } = req.body || {};
    if (!rule_text || !rule_text.trim()) return bad(res, 400, 'rule_text_required');
    const { data, error } = await supabase
      .from('client_rules')
      .insert({ client_id: id, rule_text: rule_text.trim() })
      .select()
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ rule: data });
  })
);

app.delete(
  '/api/clients/:id/rules/:ruleId',
  requireSupabase,
  asyncH(async (req, res) => {
    const { ruleId } = req.params;
    const { error } = await supabase
      .from('client_rules')
      .delete()
      .eq('id', ruleId);
    if (error) return bad(res, 500, error.message);
    res.json({ ok: true });
  })
);

// ============================================================
// CALENDAR
// ============================================================
app.get(
  '/api/calendar',
  requireSupabase,
  asyncH(async (req, res) => {
    const { month, vertical } = req.query;
    let q = supabase.from('calendar_events').select('*').order('day', { ascending: true, nullsFirst: true });
    if (month) q = q.eq('month', parseInt(month, 10));
    const { data, error } = await q;
    if (error) return bad(res, 500, error.message);

    let events = data || [];
    if (vertical) {
      events = events.filter((e) => Array.isArray(e.applicable_verticals) && e.applicable_verticals.includes(vertical));
    }
    res.json({ events });
  })
);

// ============================================================
// NEWSLETTER GENERATION
// ============================================================

// Helper: gather everything we need to call the model
async function gatherContext(clientId) {
  const { data: client, error: e1 } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  if (e1) throw new Error(e1.message);
  if (!client) throw new Error('client_not_found');

  const { data: assetsRows } = await supabase
    .from('client_assets')
    .select('*')
    .eq('client_id', clientId);
  const assets = {};
  for (const a of assetsRows || []) assets[a.asset_type] = a.content;

  const { data: rules } = await supabase
    .from('client_rules')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });

  return { client, assets, rules: rules || [] };
}

async function getLastMonthSummary(clientId, month, year) {
  // Find the most recent newsletter strictly before (year, month)
  const { data, error } = await supabase
    .from('newsletters')
    .select('topic_summary, year, month')
    .eq('client_id', clientId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(12);
  if (error) return null;
  const before = (data || []).find((n) => (n.year < year) || (n.year === year && n.month < month));
  return before ? before.topic_summary : null;
}

async function callClaude({ system, user, maxTokens }) {
  const resp = await anthropic.messages.create({
    model: MODEL_ID,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: system,
        // Cache the system prompt — same across generations and regenerations for the
        // same vertical, so cache hits give us a 90% discount on the cached portion.
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: user }],
  });
  const text = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return prompts.scrubEmDashes(text);
}

async function summarizeNewsletter(generatedContent) {
  try {
    const summary = await callClaude({
      system: 'You produce concise topic summaries of newsletters for use as repetition-avoidance context.',
      user: prompts.buildSummaryPrompt(generatedContent),
      maxTokens: MAX_TOKENS_SUMMARY,
    });
    return summary.trim();
  } catch (e) {
    console.error('summary error:', e.message);
    return null;
  }
}

// POST /api/clients/:id/newsletters/generate
app.post(
  '/api/clients/:id/newsletters/generate',
  requireSupabase,
  requireAnthropic,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const {
      month,
      year,
      topic,
      features,
      links,
      selected_calendar_event_ids,
    } = req.body || {};

    if (!month || !year) return bad(res, 400, 'month_and_year_required');

    const ctx = await gatherContext(id);
    if (!ctx.assets.master_record) {
      return bad(res, 400, 'master_record_required', {
        message: 'This client has no master record on file. Add one in the client profile before generating.',
      });
    }
    if (ctx.client.template_type === 'custom' && !ctx.assets.html_template) {
      return bad(res, 400, 'custom_template_required', {
        message: 'Client is set to custom template but no template HTML is on file.',
      });
    }

    // Pull selected calendar events
    let calendar = [];
    if (Array.isArray(selected_calendar_event_ids) && selected_calendar_event_ids.length > 0) {
      const { data: ev } = await supabase
        .from('calendar_events')
        .select('*')
        .in('id', selected_calendar_event_ids);
      calendar = ev || [];
    }

    const lastMonthSummary = await getLastMonthSummary(id, month, year);

    const userPrompt = prompts.buildGenerationPrompt({
      client: ctx.client,
      masterRecord: ctx.assets.master_record,
      brandVoice: ctx.assets.brand_voice || null,
      customRules: ctx.rules,
      calendar,
      topic,
      features,
      links: Array.isArray(links) ? links : [],
      lastMonthSummary,
      month,
      year,
      customTemplateHtml: ctx.client.template_type === 'custom' ? ctx.assets.html_template : null,
    });

    const systemPrompt = prompts.SYSTEM_PROMPTS[ctx.client.vertical];

    const text = await callClaude({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: MAX_TOKENS_GENERATION,
    });

    const sections = prompts.parseSections(text);
    const fullContent = prompts.assembleSections(sections);

    // Save / upsert newsletter row keyed by (client, month, year). One per (client, month, year) for V1.
    // Find existing
    const { data: existing } = await supabase
      .from('newsletters')
      .select('id')
      .eq('client_id', id)
      .eq('month', month)
      .eq('year', year)
      .limit(1);

    let saved;
    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('newsletters')
        .update({
          full_content: fullContent,
          features_input: features || null,
          links_input: Array.isArray(links) ? links : [],
          status: 'drafted',
        })
        .eq('id', existing[0].id)
        .select()
        .single();
      if (error) return bad(res, 500, error.message);
      saved = data;
    } else {
      const { data, error } = await supabase
        .from('newsletters')
        .insert({
          client_id: id,
          month,
          year,
          full_content: fullContent,
          features_input: features || null,
          links_input: Array.isArray(links) ? links : [],
          status: 'drafted',
        })
        .select()
        .single();
      if (error) return bad(res, 500, error.message);
      saved = data;
    }

    // Kick off summary generation async (don't block response)
    summarizeNewsletter(fullContent).then((summary) => {
      if (summary) {
        supabase
          .from('newsletters')
          .update({ topic_summary: summary })
          .eq('id', saved.id)
          .then(() => {})
          .catch((e) => console.error('summary save error:', e.message));
      }
    });

    res.json({ newsletter: saved, sections });
  })
);

// POST /api/newsletters/:id/regenerate-section
app.post(
  '/api/newsletters/:id/regenerate-section',
  requireSupabase,
  requireAnthropic,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { section_name, feedback, calendar_events, topic, features, links } = req.body || {};
    if (!prompts.SECTION_NAMES.includes(section_name)) return bad(res, 400, 'invalid_section_name');

    const { data: nl, error: e1 } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', id)
      .single();
    if (e1 || !nl) return bad(res, 404, 'newsletter_not_found');

    const ctx = await gatherContext(nl.client_id);
    const lastMonthSummary = await getLastMonthSummary(nl.client_id, nl.month, nl.year);
    const currentSections = prompts.parseSections(nl.full_content || '');

    // Resolve calendar events if ids passed; otherwise empty (regeneration doesn't need them re-passed,
    // because the OTHER sections carry the context of what was already covered).
    let calendar = [];
    if (Array.isArray(calendar_events) && calendar_events.length > 0) {
      const { data: ev } = await supabase
        .from('calendar_events')
        .select('*')
        .in('id', calendar_events);
      calendar = ev || [];
    }

    const userPrompt = prompts.buildSectionRegenerationPrompt({
      client: ctx.client,
      masterRecord: ctx.assets.master_record,
      brandVoice: ctx.assets.brand_voice || null,
      customRules: ctx.rules,
      calendar,
      topic,
      features: features || nl.features_input,
      links: Array.isArray(links) ? links : (nl.links_input || []),
      lastMonthSummary,
      month: nl.month,
      year: nl.year,
      customTemplateHtml: ctx.client.template_type === 'custom' ? ctx.assets.html_template : null,
      sectionName: section_name,
      currentSections,
      feedback,
    });

    const systemPrompt = prompts.SYSTEM_PROMPTS[ctx.client.vertical];
    const text = await callClaude({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: MAX_TOKENS_SECTION,
    });

    const newSections = prompts.parseSections(text);
    const newSection = newSections[section_name];
    if (!newSection) {
      return bad(res, 502, 'model_did_not_return_section', { raw: text.slice(0, 800) });
    }

    const updatedSections = { ...currentSections, [section_name]: newSection };
    const fullContent = prompts.assembleSections(updatedSections);

    const { data, error } = await supabase
      .from('newsletters')
      .update({ full_content: fullContent })
      .eq('id', id)
      .select()
      .single();
    if (error) return bad(res, 500, error.message);

    res.json({ newsletter: data, sections: updatedSections, regenerated: section_name });
  })
);

// POST /api/newsletters/:id/regenerate-full
app.post(
  '/api/newsletters/:id/regenerate-full',
  requireSupabase,
  requireAnthropic,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { feedback, topic, features, links, calendar_events } = req.body || {};

    const { data: nl, error: e1 } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', id)
      .single();
    if (e1 || !nl) return bad(res, 404, 'newsletter_not_found');

    const ctx = await gatherContext(nl.client_id);
    const lastMonthSummary = await getLastMonthSummary(nl.client_id, nl.month, nl.year);

    let calendar = [];
    if (Array.isArray(calendar_events) && calendar_events.length > 0) {
      const { data: ev } = await supabase
        .from('calendar_events')
        .select('*')
        .in('id', calendar_events);
      calendar = ev || [];
    }

    const userPrompt = prompts.buildFullRegenerationPrompt({
      client: ctx.client,
      masterRecord: ctx.assets.master_record,
      brandVoice: ctx.assets.brand_voice || null,
      customRules: ctx.rules,
      calendar,
      topic,
      features: features || nl.features_input,
      links: Array.isArray(links) ? links : (nl.links_input || []),
      lastMonthSummary,
      month: nl.month,
      year: nl.year,
      customTemplateHtml: ctx.client.template_type === 'custom' ? ctx.assets.html_template : null,
      previousFullContent: nl.full_content || '',
      feedback,
    });

    const systemPrompt = prompts.SYSTEM_PROMPTS[ctx.client.vertical];
    const text = await callClaude({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: MAX_TOKENS_GENERATION,
    });

    const sections = prompts.parseSections(text);
    const fullContent = prompts.assembleSections(sections);

    const { data, error } = await supabase
      .from('newsletters')
      .update({ full_content: fullContent, status: 'drafted' })
      .eq('id', id)
      .select()
      .single();
    if (error) return bad(res, 500, error.message);

    summarizeNewsletter(fullContent).then((summary) => {
      if (summary) {
        supabase
          .from('newsletters')
          .update({ topic_summary: summary })
          .eq('id', data.id)
          .then(() => {})
          .catch((e) => console.error('summary save error:', e.message));
      }
    });

    res.json({ newsletter: data, sections });
  })
);

// ============================================================
// NEWSLETTER FETCH / STATUS / APPROVE
// ============================================================
app.get(
  '/api/newsletters/:id',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('newsletters')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single();
    if (error) return bad(res, 500, error.message);
    const sections = prompts.parseSections(data.full_content || '');
    res.json({ newsletter: data, sections });
  })
);

app.get(
  '/api/clients/:id/newsletters/at',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { month, year } = req.query;
    if (!month || !year) return bad(res, 400, 'month_and_year_required');
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('client_id', id)
      .eq('month', parseInt(month, 10))
      .eq('year', parseInt(year, 10))
      .limit(1);
    if (error) return bad(res, 500, error.message);
    if (!data || data.length === 0) return res.json({ newsletter: null });
    const sections = prompts.parseSections(data[0].full_content || '');
    res.json({ newsletter: data[0], sections });
  })
);

app.patch(
  '/api/newsletters/:id/status',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const valid = ['not_started', 'drafted', 'in_review', 'sent_for_approval', 'approved'];
    if (!valid.includes(status)) return bad(res, 400, 'invalid_status');
    const update = { status };
    if (status === 'approved') update.approved_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('newsletters')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ newsletter: data });
  })
);

app.post(
  '/api/newsletters/:id/approve',
  requireSupabase,
  asyncH(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('newsletters')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return bad(res, 500, error.message);
    res.json({ newsletter: data });
  })
);

// ============================================================
// SECTION META (used by frontend to render labels)
// ============================================================
app.get('/api/sections/meta', (req, res) => {
  res.json({
    section_names: prompts.SECTION_NAMES,
    section_labels: prompts.SECTION_LABELS,
  });
});

// ============================================================
// SPA fallback (must be before error handler)
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'server_error', message: err.message });
});

// ============================================================
// BOOT
// ============================================================
app.listen(PORT, () => {
  console.log(`MMW Newsletter Generator listening on :${PORT}`);
  console.log(`  Model: ${MODEL_ID}`);
  console.log(`  Supabase configured: ${!!supabase}`);
  console.log(`  Anthropic configured: ${!!anthropic}`);
});
