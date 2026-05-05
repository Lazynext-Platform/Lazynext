import type { Post } from './types'

const post: Post = {
  slug: 'workspace-maturity-score',
  title: 'Workspace Maturity Score: why we hide most of the product on day one',
  excerpt: 'Most workflow tools dump 20 features on you and hope. We unlock features as you actually decide things. Here\u2019s the math, the events, and why the default bias is "earn the complexity."',
  date: 'April 25, 2026',
  dateTime: '2026-04-25',
  tag: 'Product',
  content: [
    { type: 'p', text: 'A new Lazynext workspace doesn\u2019t look like Lazynext. There\u2019s no canvas, no automations, no tables, no docs. There are decisions and outcomes. That\u2019s it.' },
    { type: 'p', text: 'This is deliberate, and it\u2019s the single most contested product decision we\u2019ve made.' },
    { type: 'h2', text: 'The score, in full' },
    { type: 'p', text: 'Every workspace has a hidden integer called `wms_score`, clamped 0\u2013100. It bumps when you do real things in the product. There are five events, each weighted by how much signal they carry about a team that\u2019s actually using the product the way it\u2019s meant to be used:' },
    { type: 'ul', items: [
      'decision_created: +2',
      'outcome_recorded: +3 (the loop closing is more valuable than opening it)',
      'teammate_invited: +5 (a single-player workspace caps out fast \u2014 we want this to bump hardest)',
      'decision_public_shared: +2',
      'integration_connected: +4',
    ]},
    { type: 'h2', text: 'Four layers, four thresholds' },
    { type: 'p', text: 'The score maps to one of four layers, and each layer unlocks a slice of the product:' },
    { type: 'ul', items: [
      'Layer 1 (0\u201314): Decisions and outcomes only. The product is two screens.',
      'Layer 2 (15\u201334): Tasks and threads unlock \u2014 you can now coordinate around the decisions you\u2019re making.',
      'Layer 3 (35\u201359): Docs and tables unlock \u2014 the workspace is now a real reference surface, not just a decision log.',
      'Layer 4 (60+): The full canvas, automations, and integrations unlock. This is where Lazynext looks like the marketing site shows it.',
    ]},
    { type: 'p', text: 'A team that invites three colleagues, logs ten decisions, records two outcomes, and shares one decision publicly hits Layer 4 in a single afternoon. A team that opens the product, pokes around, and closes the tab never gets past Layer 1. We think both outcomes are correct.' },
    { type: 'h2', text: 'Why this is unpopular and why we kept it' },
    { type: 'p', text: 'The standard objection: "I want to see what I\u2019m paying for." Fair. So we shipped a single toggle in workspace settings called Power user mode. Flip it and every layer unlocks regardless of score. We default it off.' },
    { type: 'p', text: 'The reason we default it off: the highest-churn pattern in workflow software is the 90-day signup who never logged a single decision because they spent the first two weeks customizing views, building automations, and configuring integrations against an empty database. They built infrastructure for work that never showed up. The score-gate forces the early loop to be the work itself, not the configuration.' },
    { type: 'h2', text: 'How the gate enforces itself' },
    { type: 'p', text: 'Two layers of enforcement. The sidebar and command palette both call `isFeatureUnlocked(feature, score, powerUserOverride)` before rendering \u2014 if the feature is locked, it\u2019s not in the menu. That\u2019s the soft gate. The hard gate is at the API level: routes that create locked node types check the same function server-side and return 402 if you somehow craft the request anyway. (You can; we don\u2019t hide it; the locked surface just doesn\u2019t advertise itself.)' },
    { type: 'h2', text: 'The unlock moment' },
    { type: 'p', text: 'When a layer threshold is crossed, the next time you load the workspace home you get a small toast: "You unlocked Tasks and Threads. They\u2019re in the sidebar now." Nothing else changes \u2014 no celebration animation, no upsell. The product treats the unlock as a fact of the team\u2019s growth, not a reward for engagement-hacking. We tested the celebratory version. It read as condescending. We took it out.' },
    { type: 'h2', text: 'What this gives up' },
    { type: 'p', text: 'A real loss: the screenshot-driven evaluation. A prospect lands, signs up, and wants to see the canvas. They get an empty decisions screen instead. That\u2019s a real conversion cost we\u2019ve eaten. The compensating bet is that teams who bounce because of this would have churned in week 3 anyway, and teams who stay through Layer 1 are roughly 4x more likely to still be active at day 90. The data on this is early but the gap is wide enough that we\u2019re running with it.' },
    { type: 'h2', text: 'What it gives back' },
    { type: 'p', text: 'A workspace at Layer 4 looks the way it does because the team got there. Every tile in the canvas, every automation rule, every integration is downstream of decisions that were actually made and outcomes that were actually recorded. The complexity is earned. That\u2019s the only reason we trust it not to rot.' },
    { type: 'h2', text: 'The override, plainly' },
    { type: 'p', text: 'Settings \u2192 Workspace \u2192 "Show me everything from the start." One click. We don\u2019t hide it, we don\u2019t guilt you, we don\u2019t require you to confirm. If you\u2019re an experienced user who knows what you want, the gate is two seconds out of your life. The default is the only opinion we\u2019re defending here.' },
  ],
}

export default post
