// ============================================================
// MMW Newsletter Generator — prompts.js
// ============================================================
// Pattern: prompts as exported strings/functions. Server.js imports
// and composes them. Updating prompts should never require touching
// server logic. Same convention as Content Engine.
// ============================================================

// --------------------------------------------------------
// SHARED RULES — embedded in every system prompt
// --------------------------------------------------------
const SHARED_RULES = `
=== VOICE & STYLE ===
- Sound human. Avoid AI-sounding phrasing, hedges, and filler.
- NEVER use em dashes (—). Use commas, periods, or parentheses instead. This is a hard rule. The character "—" must not appear anywhere in your output.
- Prose-first. Use bullet points only for the table-of-contents list near the top of the newsletter. Body sections are written as paragraphs, not bulleted lists.
- Translate technical/clinical concepts into plain, warm language a layperson can connect with.
- Conservative claims. No hype, no superlatives, no "amazing/incredible/revolutionary/miracle".
- Match the client's documented voice and word preferences from their master record and brand voice document. When the master record uses "patients" instead of "clients" (or vice versa), follow it. When it bans certain words, do not use them.
- 60% educational, 40% promotional is the default mix unless the client's master record indicates otherwise.

=== EMAIL DELIVERABILITY (NON-NEGOTIABLE) ===
The output is going into an email. Spam-trigger words and patterns hurt deliverability. Avoid them.

Banned words and phrases:
- "free", "100% free", "no cost"
- "guarantee", "guaranteed results"
- "act now", "urgent", "limited time", "don't miss out"
- "click here", "click below"
- "amazing", "incredible", "miracle", "revolutionary"
- "cash", "$$$"
- "risk-free", "no obligation"
- "winner", "selected", "chosen" (in promotional context)
- "buy now", "order now", "shop now"

Banned medical-specific phrases:
- "miracle cure"
- "FDA approved" (only allowed when literally true and specifically relevant)
- "doctor recommended" (vague claim, do not use)
- "permanent results"
- "anti-aging miracle"
- "erase wrinkles"
- "instant transformation"

Formatting bans:
- No ALL CAPS words or phrases (except recognized acronyms like FDA, HRT, PCOS).
- Maximum one exclamation point in the entire newsletter. Zero is preferred.
- No clusters of punctuation (no "!!!", no "???", no "$$$").
- No suspicious symbol clusters.

=== STRUCTURE ===
The newsletter is delivered as labeled copy/paste blocks. Each section is wrapped in clearly labeled tags so the AE can paste each one into the matching slot in the GoHighLevel template. You MUST output every section in the exact format specified, with no extra commentary before, between, or after the blocks.
`;

// --------------------------------------------------------
// SECTION SPEC — the consistent skeleton across all four verticals
// --------------------------------------------------------
const SECTION_SPEC = `
You will produce SEVEN labeled blocks, in this exact order, with this exact format:

[[INTRO]]
A 2-3 sentence opening paragraph that sets the tone for the month and previews what's inside. Conversational. No greeting like "Dear patients" (assume that's already in the template). Lead straight into substance.
[[/INTRO]]

[[TOC]]
Lead with one short prose line like "Here's what we're focusing on this month:" then a bulleted list of 3-5 items previewing the sections below. Each bullet is a short phrase, not a full sentence. This is the only place bullets are used.
[[/TOC]]

[[ARTICLE_TWO_COLUMN]]
A two-column-ready article block, 150-220 words. This is the FIRST featured topic of the month. Educational with a soft tie-in to a relevant service or treatment. End with a single sentence that gestures toward booking, scheduling, or learning more, no "click here" language. If a relevant link was provided, weave it into a natural call-to-action sentence using the link's label as anchor text.
[[/ARTICLE_TWO_COLUMN]]

[[ARTICLE_FULL_WIDTH]]
A full-width article block, 200-280 words. This is the SECOND featured topic. Goes deeper than the two-column. Same voice rules. End with a soft, non-pushy CTA sentence.
[[/ARTICLE_FULL_WIDTH]]

[[HIGHLIGHT_BLOCK]]
The colored "office insert" block. 80-130 words. This is where the AE features a specific treatment, event, special, or partnership for the month. Tone is warmer and slightly more direct than the article blocks because it's pulling the reader's eye. Still no spam triggers, no ALL CAPS, no exclamation marks. End with one clear sentence inviting the reader to take a next step.
[[/HIGHLIGHT_BLOCK]]

[[RECIPE]]
A short, clinic-appropriate recipe section, 100-160 words. Choose a recipe that fits the month, the vertical's wellness angle, and any seasonal or awareness-day context. Include a 1-sentence intro, a short ingredient list (as a list of items separated by commas inline, NOT as a bulleted list), and brief instructions written as 2-4 sentences of prose. No bullets here. Recipes should never reference banned words like "miracle" or "instant".
[[/RECIPE]]

[[CLOSING_CTA]]
A 2-3 sentence closing paragraph. Warm, grateful, and forward-looking. Mentions that the team is here for the reader and softly invites them to schedule, reach out, or stay connected. No "click here", no "act now", no urgency language.
[[/CLOSING_CTA]]
`;

// --------------------------------------------------------
// VERTICAL CONTEXT
// --------------------------------------------------------
const VERTICAL_CONTEXT = {
  obgyn: `=== VERTICAL: OB/GYN ===
Patients are women across the lifespan: reproductive, prenatal, postpartum, and into peri/menopause. Tone is warm, informed, and respectful of how personal these topics are. Avoid clinical-cold language. Avoid being preachy. Use "patients" by default unless the master record says otherwise. Common topic areas: well-woman exams, contraception, pregnancy, postpartum care, hormone health, menopause, pelvic health.`,

  medspa: `=== VERTICAL: MED SPA / AESTHETICS ===
Patients (or "clients", check the master record) are coming for cosmetic and wellness treatments: injectables, lasers, body contouring, skincare, IV therapy, weight loss support, hormone optimization. Tone is confident, polished, and approachable, never salesy or hyped. The clinic is a trusted aesthetic partner, not a discount counter. Common topic areas: skin health, treatment education, seasonal aesthetic care, self-care, results expectations.`,

  functional: `=== VERTICAL: FUNCTIONAL MEDICINE ===
Patients are looking for root-cause answers, often after conventional medicine hasn't fully resolved their issues. They tend to be informed, curious, and willing to engage with longer reads. Tone is grounded, smart, and gently educational. Avoid both woo-woo language and hyper-clinical jargon. Common topic areas: gut health, hormones, thyroid, nutrition, sleep, stress, autoimmunity, metabolic health, longevity. Do not use the phrase "functional medicine" in body copy unless the master record explicitly permits it; describe the approach instead.`,

  urogyn: `=== VERTICAL: UROGYNECOLOGY ===
Patients are typically women dealing with pelvic floor issues, incontinence, prolapse, recurrent UTIs, and related concerns. These topics carry stigma and embarrassment, so tone must be calm, normalizing, and matter-of-fact. Lead with reassurance and education, not symptoms-as-problems. Use plain, respectful language. "Patients" by default. Common topic areas: pelvic floor health, urinary symptoms, post-childbirth recovery, menopausal pelvic changes, conservative and surgical options.`,
};

function buildSystemPrompt(verticalContext) {
  return `You are a senior copywriter at Medical Marketing Whiz, a healthcare marketing agency. Your job is to write monthly email newsletters for medical clinic clients in a way that sounds like the clinic itself wrote it, not a generic agency template.

${verticalContext}

${SHARED_RULES}

${SECTION_SPEC}

Output ONLY the seven labeled blocks. No preamble, no explanations, no commentary before the first block, between blocks, or after the last block. The output goes directly into a copy-paste workflow.`;
}

const SYSTEM_PROMPTS = {
  obgyn: buildSystemPrompt(VERTICAL_CONTEXT.obgyn),
  medspa: buildSystemPrompt(VERTICAL_CONTEXT.medspa),
  functional: buildSystemPrompt(VERTICAL_CONTEXT.functional),
  urogyn: buildSystemPrompt(VERTICAL_CONTEXT.urogyn),
};

// --------------------------------------------------------
// FORMATTING HELPERS
// --------------------------------------------------------
function monthName(m) {
  return [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ][m] || `Month ${m}`;
}

function formatLinks(links) {
  if (!Array.isArray(links) || links.length === 0) return '(none provided)';
  return links
    .map((l, i) => `  ${i + 1}. label: "${l.label || ''}" , url: ${l.url || ''}`)
    .join('\n');
}

function formatCalendar(events) {
  if (!Array.isArray(events) || events.length === 0) return '(none selected)';
  return events
    .map((e) => {
      const when = e.day ? `${monthName(e.month)} ${e.day}` : `Month-long: ${monthName(e.month)}`;
      return `  - ${when} , ${e.title}${e.description ? ` (${e.description})` : ''}`;
    })
    .join('\n');
}

function formatRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return '(none)';
  return rules.map((r, i) => `  ${i + 1}. ${r.rule_text || r}`).join('\n');
}

// --------------------------------------------------------
// USER PROMPT BUILDERS
// --------------------------------------------------------

function buildGenerationPrompt({
  client,
  masterRecord,
  brandVoice,
  customRules,
  calendar,
  topic,
  features,
  links,
  lastMonthSummary,
  month,
  year,
  customTemplateHtml,
}) {
  const customTemplateBlock = customTemplateHtml
    ? `\n\n=== CUSTOM HTML TEMPLATE (this client uses a non-standard template) ===
The client's custom template is provided below. Identify the editable sections and produce content that fits their structure. Even though the HTML structure is custom, you MUST still output the seven [[LABELED]] blocks defined in the section spec , the AE will map them into the custom template manually.

${customTemplateHtml}`
    : '';

  const lastMonthBlock = lastMonthSummary
    ? `\n\n=== LAST MONTH'S NEWSLETTER (TOPIC SUMMARY) ===
To avoid repetition, here is a brief summary of what last month covered. Do NOT repeat these topics:
${lastMonthSummary}`
    : '';

  return `=== CLIENT ===
Clinic name: ${client.clinic_name}
Vertical: ${client.vertical}
Newsletter month: ${monthName(month)} ${year}

=== MASTER RECORD ===
${masterRecord || '(no master record on file)'}

=== BRAND VOICE DOCUMENT ===
${brandVoice || '(none on file)'}

=== CUSTOM CLIENT RULES ===
${formatRules(customRules)}

=== CALENDAR / AWARENESS DAYS SELECTED FOR THIS MONTH ===
${formatCalendar(calendar)}

=== TOPIC / THEME FOR THIS MONTH ===
${topic || '(no specific theme , pick one that fits the calendar context and clinic vertical)'}

=== WHAT TO FEATURE THIS MONTH ===
${features || '(no specific features , pull naturally from the master record)'}

=== LINKS TO WEAVE IN (use the label as anchor text in the appropriate section) ===
${formatLinks(links)}${lastMonthBlock}${customTemplateBlock}

Now produce the full newsletter as the seven labeled blocks specified in your system instructions. Output ONLY the blocks. No preamble.`;
}

function buildSectionRegenerationPrompt({
  client,
  masterRecord,
  brandVoice,
  customRules,
  calendar,
  topic,
  features,
  links,
  lastMonthSummary,
  month,
  year,
  customTemplateHtml,
  sectionName,
  currentSections,
  feedback,
}) {
  const otherSectionsText = Object.entries(currentSections)
    .filter(([k]) => k !== sectionName)
    .map(([k, v]) => `[[${k}]]\n${v}\n[[/${k}]]`)
    .join('\n\n');

  const currentSectionText = currentSections[sectionName] || '';

  const customTemplateBlock = customTemplateHtml
    ? `\n\n=== CUSTOM HTML TEMPLATE (for context) ===\n${customTemplateHtml}`
    : '';

  const lastMonthBlock = lastMonthSummary
    ? `\n\n=== LAST MONTH'S TOPIC SUMMARY (avoid repetition) ===\n${lastMonthSummary}`
    : '';

  return `=== CLIENT ===
Clinic name: ${client.clinic_name}
Vertical: ${client.vertical}
Newsletter month: ${monthName(month)} ${year}

=== MASTER RECORD ===
${masterRecord || '(no master record on file)'}

=== BRAND VOICE DOCUMENT ===
${brandVoice || '(none on file)'}

=== CUSTOM CLIENT RULES ===
${formatRules(customRules)}

=== CALENDAR / AWARENESS DAYS SELECTED FOR THIS MONTH ===
${formatCalendar(calendar)}

=== TOPIC / THEME FOR THIS MONTH ===
${topic || '(none)'}

=== WHAT TO FEATURE THIS MONTH ===
${features || '(none)'}

=== LINKS ===
${formatLinks(links)}${lastMonthBlock}${customTemplateBlock}

=== CURRENT NEWSLETTER (other sections , keep your output coherent with these) ===
${otherSectionsText}

=== SECTION TO REGENERATE: ${sectionName} ===
Current version of this section:
${currentSectionText}

=== AE FEEDBACK / WHAT TO CHANGE ===
${feedback || '(no specific feedback , produce a meaningfully different version while staying within the section spec)'}

Regenerate ONLY the ${sectionName} section. Output it wrapped in [[${sectionName}]]...[[/${sectionName}]] tags. Do not include any other section. Do not include any commentary before or after the tagged block. Follow all voice and email deliverability rules.`;
}

function buildFullRegenerationPrompt({
  client,
  masterRecord,
  brandVoice,
  customRules,
  calendar,
  topic,
  features,
  links,
  lastMonthSummary,
  month,
  year,
  customTemplateHtml,
  previousFullContent,
  feedback,
}) {
  const customTemplateBlock = customTemplateHtml
    ? `\n\n=== CUSTOM HTML TEMPLATE ===\n${customTemplateHtml}`
    : '';
  const lastMonthBlock = lastMonthSummary
    ? `\n\n=== LAST MONTH'S TOPIC SUMMARY (avoid repetition) ===\n${lastMonthSummary}`
    : '';

  return `=== CLIENT ===
Clinic name: ${client.clinic_name}
Vertical: ${client.vertical}
Newsletter month: ${monthName(month)} ${year}

=== MASTER RECORD ===
${masterRecord || '(no master record on file)'}

=== BRAND VOICE DOCUMENT ===
${brandVoice || '(none on file)'}

=== CUSTOM CLIENT RULES ===
${formatRules(customRules)}

=== CALENDAR / AWARENESS DAYS SELECTED FOR THIS MONTH ===
${formatCalendar(calendar)}

=== TOPIC / THEME FOR THIS MONTH ===
${topic || '(none)'}

=== WHAT TO FEATURE THIS MONTH ===
${features || '(none)'}

=== LINKS ===
${formatLinks(links)}${lastMonthBlock}${customTemplateBlock}

=== PREVIOUS DRAFT ===
${previousFullContent}

=== AE FEEDBACK ===
${feedback || '(produce a meaningfully different version that still fits the spec)'}

Now produce a NEW full newsletter as the seven labeled blocks. Apply the feedback. Output ONLY the seven blocks. No preamble.`;
}

function buildSummaryPrompt(generatedContent) {
  return `Below is a newsletter that was just produced. Summarize the topics and themes covered in 2-3 short sentences. The summary will be passed into next month's newsletter generator so the AI knows what NOT to repeat. Be specific about the topics covered, not the structure.

Output only the summary, no preamble.

=== NEWSLETTER ===
${generatedContent}`;
}

// --------------------------------------------------------
// SECTION PARSING + UTILITIES
// --------------------------------------------------------
const SECTION_NAMES = [
  'INTRO',
  'TOC',
  'ARTICLE_TWO_COLUMN',
  'ARTICLE_FULL_WIDTH',
  'HIGHLIGHT_BLOCK',
  'RECIPE',
  'CLOSING_CTA',
];

const SECTION_LABELS = {
  INTRO: 'Intro Block',
  TOC: 'Table of Contents',
  ARTICLE_TWO_COLUMN: 'Two-Column Article',
  ARTICLE_FULL_WIDTH: 'Full-Width Article',
  HIGHLIGHT_BLOCK: 'Highlight Block (Office Insert)',
  RECIPE: 'Recipe',
  CLOSING_CTA: 'Closing CTA',
};

function parseSections(fullText) {
  const sections = {};
  for (const name of SECTION_NAMES) {
    const re = new RegExp(`\\[\\[${name}\\]\\]([\\s\\S]*?)\\[\\[/${name}\\]\\]`, 'i');
    const match = fullText.match(re);
    sections[name] = match ? match[1].trim() : '';
  }
  return sections;
}

function assembleSections(sections) {
  return SECTION_NAMES
    .map((name) => `[[${name}]]\n${sections[name] || ''}\n[[/${name}]]`)
    .join('\n\n');
}

// Belt-and-suspenders. Strip em dashes that may sneak in despite the rule.
function scrubEmDashes(text) {
  return (text || '').replace(/—/g, ', ').replace(/  +/g, ' ');
}

module.exports = {
  SHARED_RULES,
  SECTION_SPEC,
  SYSTEM_PROMPTS,
  SECTION_NAMES,
  SECTION_LABELS,
  buildGenerationPrompt,
  buildSectionRegenerationPrompt,
  buildFullRegenerationPrompt,
  buildSummaryPrompt,
  parseSections,
  assembleSections,
  scrubEmDashes,
};
