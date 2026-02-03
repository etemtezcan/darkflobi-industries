#!/usr/bin/env node
/**
 * wolf-pipeline.js — coordinated wolf hunting
 * 
 * Wolves hunt as a pack. Scout finds, Research analyzes, Builder ships.
 * Each wolf passes context to the next via structured handoffs.
 * 
 * Usage:
 *   node scripts/wolf-pipeline.js hunt "<opportunity>"
 *   node scripts/wolf-pipeline.js --templates
 *   node scripts/wolf-pipeline.js --status <pipeline-id>
 * 
 * Example:
 *   node scripts/wolf-pipeline.js hunt "high-engagement AI thread to reply to"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PIPELINE_PATH = path.join(__dirname, '..', 'data', 'pipelines.json');
const REGISTRY_PATH = path.join(__dirname, '..', 'darkflobi-site', 'factory-registry.json');

// Pipeline templates - coordinated wolf hunts
const PIPELINE_TEMPLATES = {
  hunt: {
    name: 'PACK HUNT',
    description: 'Scout → Research → Builder: Find opportunity, analyze it, ship something',
    icon: '🐺',
    stages: [
      {
        wolf: 'scout',
        name: 'DETECT',
        prompt: `You are the SCOUT wolf in a pack hunt.

YOUR MISSION: Find and identify the opportunity described in the task.

OUTPUT FORMAT (JSON):
{
  "status": "found" | "nothing",
  "opportunity": {
    "type": "tweet" | "thread" | "mention" | "trend" | "other",
    "url": "direct link if available",
    "author": "@handle",
    "content": "what they said",
    "engagement": "likes, RTs, views",
    "why_relevant": "why this matters for darkflobi"
  },
  "context_for_research": "what the research wolf needs to know"
}

Hunt efficiently. Find the best target. Pass to Research wolf.`
      },
      {
        wolf: 'research',
        name: 'ANALYZE', 
        prompt: `You are the RESEARCH wolf in a pack hunt.

PREVIOUS WOLF (Scout) found an opportunity. Your job: analyze it.

YOUR MISSION: Deep dive on the opportunity. Who is this person? What's the angle? What should our response be?

OUTPUT FORMAT (JSON):
{
  "status": "analyzed",
  "analysis": {
    "author_profile": "who they are, follower count, relevance",
    "content_analysis": "what they're really saying",
    "opportunity_type": "reply" | "quote" | "thread" | "mention",
    "recommended_angle": "how darkflobi should engage",
    "key_points": ["point 1", "point 2", "point 3"],
    "tone": "professional" | "casual" | "technical" | "gremlin"
  },
  "context_for_builder": "exactly what the builder wolf should create"
}

Analyze thoroughly. Give the Builder wolf everything they need.`
      },
      {
        wolf: 'writer',
        name: 'CREATE',
        prompt: `You are the BUILDER wolf in a pack hunt.

PREVIOUS WOLVES:
- Scout found an opportunity
- Research analyzed it

YOUR MISSION: Create the content based on their analysis.

OUTPUT FORMAT (JSON):
{
  "status": "created",
  "content": {
    "type": "reply" | "quote" | "thread",
    "text": "the actual tweet/reply text",
    "target_url": "what we're replying to",
    "hashtags": [],
    "mentions": []
  },
  "ready_to_post": true | false,
  "notes": "any concerns or suggestions"
}

Write in darkflobi voice: lowercase, concise, technical, 4am gremlin energy.
Build > hype. Never start with "just" — weak opener.`
      }
    ]
  },
  
  analyze: {
    name: 'DEEP ANALYSIS',
    description: 'Scout → Research → Research: Multi-layer analysis',
    icon: '🔬',
    stages: [
      {
        wolf: 'scout',
        name: 'GATHER',
        prompt: `You are the SCOUT wolf gathering intel.

YOUR MISSION: Find all relevant information about the target.

OUTPUT FORMAT (JSON):
{
  "status": "gathered",
  "sources": [
    {"url": "...", "summary": "...", "relevance": "high|medium|low"}
  ],
  "key_findings": ["finding 1", "finding 2"],
  "context_for_research": "what to analyze deeper"
}

Cast a wide net. Gather everything relevant.`
      },
      {
        wolf: 'research',
        name: 'ANALYZE_PRIMARY',
        prompt: `You are RESEARCH wolf #1 doing primary analysis.

YOUR MISSION: First-pass analysis of gathered intel.

OUTPUT FORMAT (JSON):
{
  "status": "primary_complete",
  "analysis": {
    "summary": "...",
    "strengths": [],
    "weaknesses": [],
    "opportunities": [],
    "threats": []
  },
  "questions_for_secondary": ["question 1", "question 2"],
  "context_for_research": "what needs deeper analysis"
}`
      },
      {
        wolf: 'research',
        name: 'ANALYZE_SECONDARY',
        prompt: `You are RESEARCH wolf #2 doing secondary analysis.

YOUR MISSION: Answer the questions from primary analysis. Go deeper.

OUTPUT FORMAT (JSON):
{
  "status": "complete",
  "deep_analysis": {
    "answers": {},
    "final_assessment": "...",
    "recommendations": [],
    "confidence": "high|medium|low"
  },
  "actionable_insights": ["insight 1", "insight 2", "insight 3"]
}`
      }
    ]
  },
  
  compete: {
    name: 'COMPETITOR INTEL',
    description: 'Scout → Research: Competitive analysis',
    icon: '🎯',
    stages: [
      {
        wolf: 'scout',
        name: 'FIND',
        prompt: `You are the SCOUT wolf hunting competitor intel.

YOUR MISSION: Find information about the competitor/project.

OUTPUT FORMAT (JSON):
{
  "status": "found",
  "competitor": {
    "name": "...",
    "token": "$...",
    "website": "...",
    "twitter": "@...",
    "github": "..."
  },
  "public_metrics": {
    "holders": "...",
    "market_cap": "...",
    "volume": "...",
    "social_followers": "..."
  },
  "context_for_research": "what to analyze"
}`
      },
      {
        wolf: 'research',
        name: 'ASSESS',
        prompt: `You are the RESEARCH wolf assessing a competitor.

YOUR MISSION: Analyze the competitor vs darkflobi.

OUTPUT FORMAT (JSON):
{
  "status": "assessed",
  "comparison": {
    "their_strengths": [],
    "their_weaknesses": [],
    "our_advantages": [],
    "threat_level": "high|medium|low|none"
  },
  "strategic_recommendations": [],
  "final_verdict": "..."
}`
      }
    ]
  }
};

// Load/save pipelines
function loadPipelines() {
  try {
    const dir = path.dirname(PIPELINE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return JSON.parse(fs.readFileSync(PIPELINE_PATH, 'utf8'));
  } catch (e) {
    return { pipelines: [] };
  }
}

function savePipelines(data) {
  const dir = path.dirname(PIPELINE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PIPELINE_PATH, JSON.stringify(data, null, 2));
}

function generatePipelineId() {
  return 'pipe-' + crypto.randomBytes(4).toString('hex');
}

// Initialize a pipeline
function initPipeline(templateName, task) {
  const template = PIPELINE_TEMPLATES[templateName.toLowerCase()];
  if (!template) {
    console.error(`❌ Unknown pipeline: ${templateName}`);
    console.log(`Available: ${Object.keys(PIPELINE_TEMPLATES).join(', ')}`);
    process.exit(1);
  }
  
  const pipelineId = generatePipelineId();
  const data = loadPipelines();
  
  const pipeline = {
    id: pipelineId,
    template: templateName.toLowerCase(),
    name: template.name,
    status: 'initialized',
    task: task,
    created: new Date().toISOString(),
    stages: template.stages.map((stage, idx) => ({
      index: idx,
      wolf: stage.wolf,
      name: stage.name,
      status: 'pending',
      output: null
    })),
    currentStage: 0
  };
  
  data.pipelines.push(pipeline);
  savePipelines(data);
  
  console.log(`\n${template.icon} PIPELINE INITIALIZED: ${template.name}`);
  console.log(`   ID: ${pipelineId}`);
  console.log(`   Task: ${task}`);
  console.log(`   Stages: ${template.stages.map(s => s.name).join(' → ')}`);
  console.log(`\n--- STAGE 1 SPAWN CONFIG ---`);
  
  // Output spawn config for first stage
  const firstStage = template.stages[0];
  console.log(JSON.stringify({
    pipelineId: pipelineId,
    stageIndex: 0,
    stageName: firstStage.name,
    wolf: firstStage.wolf,
    task: `PIPELINE TASK: ${task}\n\n${firstStage.prompt}`,
    label: `pipeline-${pipelineId}-stage-0`
  }, null, 2));
  console.log('--- END CONFIG ---\n');
  
  return pipeline;
}

// Advance pipeline to next stage
function advancePipeline(pipelineId, stageOutput) {
  const data = loadPipelines();
  const pipeline = data.pipelines.find(p => p.id === pipelineId);
  
  if (!pipeline) {
    console.error(`❌ Pipeline not found: ${pipelineId}`);
    process.exit(1);
  }
  
  const template = PIPELINE_TEMPLATES[pipeline.template];
  const currentIdx = pipeline.currentStage;
  
  // Save output from current stage
  pipeline.stages[currentIdx].status = 'complete';
  pipeline.stages[currentIdx].output = stageOutput;
  pipeline.stages[currentIdx].completed = new Date().toISOString();
  
  // Check if pipeline complete
  if (currentIdx >= template.stages.length - 1) {
    pipeline.status = 'complete';
    pipeline.completed = new Date().toISOString();
    savePipelines(data);
    
    console.log(`\n${template.icon} PIPELINE COMPLETE: ${pipeline.name}`);
    console.log(`   ID: ${pipelineId}`);
    console.log(`   Duration: ${getTimeDiff(pipeline.created, pipeline.completed)}`);
    console.log(`\n--- FINAL OUTPUT ---`);
    console.log(JSON.stringify(stageOutput, null, 2));
    console.log('--- END OUTPUT ---\n');
    return pipeline;
  }
  
  // Advance to next stage
  const nextIdx = currentIdx + 1;
  pipeline.currentStage = nextIdx;
  pipeline.stages[nextIdx].status = 'running';
  pipeline.status = 'running';
  savePipelines(data);
  
  const nextStage = template.stages[nextIdx];
  
  console.log(`\n${template.icon} STAGE ${nextIdx + 1}: ${nextStage.name}`);
  console.log(`   Wolf: ${nextStage.wolf}`);
  console.log(`   Previous output received`);
  console.log(`\n--- NEXT STAGE SPAWN CONFIG ---`);
  
  // Build context from previous stage
  const previousContext = `PREVIOUS STAGE OUTPUT:\n${JSON.stringify(stageOutput, null, 2)}`;
  
  console.log(JSON.stringify({
    pipelineId: pipelineId,
    stageIndex: nextIdx,
    stageName: nextStage.name,
    wolf: nextStage.wolf,
    task: `PIPELINE TASK: ${pipeline.task}\n\n${previousContext}\n\n${nextStage.prompt}`,
    label: `pipeline-${pipelineId}-stage-${nextIdx}`
  }, null, 2));
  console.log('--- END CONFIG ---\n');
  
  return pipeline;
}

// Get pipeline status
function getPipelineStatus(pipelineId) {
  const data = loadPipelines();
  const pipeline = data.pipelines.find(p => p.id === pipelineId);
  
  if (!pipeline) {
    console.error(`❌ Pipeline not found: ${pipelineId}`);
    process.exit(1);
  }
  
  const template = PIPELINE_TEMPLATES[pipeline.template];
  
  console.log(`\n${template.icon} PIPELINE: ${pipeline.name}`);
  console.log(`   ID: ${pipelineId}`);
  console.log(`   Status: ${pipeline.status}`);
  console.log(`   Task: ${pipeline.task}`);
  console.log(`\nStages:`);
  
  pipeline.stages.forEach((stage, idx) => {
    const stageTemplate = template.stages[idx];
    const statusIcon = stage.status === 'complete' ? '✅' : 
                       stage.status === 'running' ? '🔄' : '⏳';
    console.log(`   ${statusIcon} ${idx + 1}. ${stageTemplate.name} (${stage.wolf})`);
    if (stage.completed) {
      console.log(`      Completed: ${stage.completed}`);
    }
  });
  
  console.log('');
  return pipeline;
}

function showTemplates() {
  console.log('\n🐺 WOLF PIPELINE TEMPLATES\n');
  for (const [key, template] of Object.entries(PIPELINE_TEMPLATES)) {
    console.log(`${template.icon} ${key.toUpperCase()} — ${template.name}`);
    console.log(`   ${template.description}`);
    console.log(`   Stages: ${template.stages.map(s => s.name).join(' → ')}\n`);
  }
}

function listPipelines() {
  const data = loadPipelines();
  console.log('\n🐺 ACTIVE PIPELINES\n');
  
  if (data.pipelines.length === 0) {
    console.log('No pipelines yet. Start one with: node wolf-pipeline.js hunt "task"');
    return;
  }
  
  data.pipelines.slice(-10).forEach(p => {
    const template = PIPELINE_TEMPLATES[p.template];
    const statusIcon = p.status === 'complete' ? '✅' : 
                       p.status === 'running' ? '🔄' : '⏳';
    console.log(`${statusIcon} ${p.id} [${template.name}]`);
    console.log(`   Task: ${p.task.substring(0, 50)}...`);
    console.log(`   Stage: ${p.currentStage + 1}/${p.stages.length}`);
    console.log('');
  });
}

function getTimeDiff(start, end) {
  const ms = new Date(end) - new Date(start);
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

// Get the current stage task for spawning
function getSpawnTask(pipelineId) {
  const data = loadPipelines();
  const pipeline = data.pipelines.find(p => p.id === pipelineId);
  
  if (!pipeline) {
    console.error(`❌ Pipeline not found: ${pipelineId}`);
    process.exit(1);
  }
  
  if (pipeline.status === 'complete') {
    console.log('✅ Pipeline already complete');
    process.exit(0);
  }
  
  const template = PIPELINE_TEMPLATES[pipeline.template];
  const currentIdx = pipeline.currentStage;
  const currentStage = template.stages[currentIdx];
  
  // Build context from previous stages
  let context = `PIPELINE: ${pipeline.name}\nTASK: ${pipeline.task}\n\n`;
  
  if (currentIdx > 0) {
    context += 'PREVIOUS STAGE OUTPUTS:\n';
    for (let i = 0; i < currentIdx; i++) {
      const prevStage = pipeline.stages[i];
      context += `\n--- ${template.stages[i].name} (${prevStage.wolf}) ---\n`;
      context += JSON.stringify(prevStage.output, null, 2) + '\n';
    }
    context += '\n';
  }
  
  context += currentStage.prompt;
  
  // Output just the task for spawning
  console.log(context);
}

// Get pipeline info as JSON (for programmatic use)
function getPipelineJson(pipelineId) {
  const data = loadPipelines();
  const pipeline = data.pipelines.find(p => p.id === pipelineId);
  
  if (!pipeline) {
    console.error(`❌ Pipeline not found: ${pipelineId}`);
    process.exit(1);
  }
  
  const template = PIPELINE_TEMPLATES[pipeline.template];
  console.log(JSON.stringify({
    ...pipeline,
    templateInfo: {
      name: template.name,
      icon: template.icon,
      totalStages: template.stages.length
    },
    currentWolf: pipeline.status === 'complete' ? null : template.stages[pipeline.currentStage].wolf,
    currentStageName: pipeline.status === 'complete' ? null : template.stages[pipeline.currentStage].name
  }, null, 2));
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log(`
🐺 WOLF PIPELINE — Coordinated Pack Hunting

Usage:
  node wolf-pipeline.js <template> "<task>"    Start a pipeline
  node wolf-pipeline.js --advance <id> <json>  Advance to next stage
  node wolf-pipeline.js --status <id>          Check pipeline status
  node wolf-pipeline.js --list                 List all pipelines
  node wolf-pipeline.js --templates            Show pipeline templates

Templates: ${Object.keys(PIPELINE_TEMPLATES).join(', ')}

Examples:
  node wolf-pipeline.js hunt "find viral AI tweet to engage with"
  node wolf-pipeline.js analyze "deep dive on $VIRTUAL token"
  node wolf-pipeline.js compete "analyze @ai16zdao competitive position"
`);
  process.exit(0);
}

if (args[0] === '--templates') {
  showTemplates();
} else if (args[0] === '--list') {
  listPipelines();
} else if (args[0] === '--status' && args[1]) {
  getPipelineStatus(args[1]);
} else if (args[0] === '--task' && args[1]) {
  getSpawnTask(args[1]);
} else if (args[0] === '--json' && args[1]) {
  getPipelineJson(args[1]);
} else if (args[0] === '--advance' && args[1] && args[2]) {
  try {
    let output;
    // Check if it's a file path
    if (args[2].endsWith('.json') && fs.existsSync(args[2])) {
      output = JSON.parse(fs.readFileSync(args[2], 'utf8'));
    } else {
      output = JSON.parse(args[2]);
    }
    advancePipeline(args[1], output);
  } catch (e) {
    console.error('❌ Invalid JSON output:', e.message);
    process.exit(1);
  }
} else if (args[0] && args[1]) {
  initPipeline(args[0], args[1]);
} else {
  console.error('❌ Invalid arguments. Use --help for usage.');
  process.exit(1);
}
