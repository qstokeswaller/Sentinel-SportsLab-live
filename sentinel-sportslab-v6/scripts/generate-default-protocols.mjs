/**
 * Parses data/complete-protocols-all-67-tests.md into a TypeScript default protocols file.
 * Run: node scripts/generate-default-protocols.mjs
 * Output: docs/utils/defaultProtocols.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = join(__dirname, '..', 'data', 'complete-protocols-all-67-tests.md');
const outPath = join(__dirname, '..', 'docs', 'utils', 'defaultProtocols.ts');

const md = readFileSync(mdPath, 'utf-8');
const lines = md.split('\n');

// Category mapping from section numbers
const CATEGORY_MAP = {
  '1': 'Screening',   // Musculoskeletal / Movement
  '2': 'Performance',  // Strength / Power
  '3': 'Performance',  // Speed / Agility
  '4': 'Screening',   // Flexibility / Mobility
  '5': 'Performance',  // Aerobic Capacity
  '6': 'Performance',  // Anaerobic
  '7': 'Screening',   // Anthropometry
  '8': 'Performance',  // Sport-Specific
  '9': 'Monitoring',  // Testing Session Guidelines
};

const protocols = [];
let currentProtocol = null;
let currentBlocks = [];
let currentLines = [];

function flushLines() {
  if (currentLines.length > 0) {
    currentBlocks.push({
      id: `blk_${currentBlocks.length}`,
      type: 'text_block',
      lines: currentLines.map((l, i) => ({ id: `l${i}`, ...l })),
    });
    currentLines = [];
  }
}

function flushProtocol() {
  flushLines();
  if (currentProtocol && currentBlocks.length > 0) {
    // Determine category from the section number (e.g., "1.1" -> "1")
    const sectionMatch = currentProtocol.id.match(/^(\d+)/);
    const sectionNum = sectionMatch ? sectionMatch[1] : '1';
    const category = CATEGORY_MAP[sectionNum] || 'Custom';

    protocols.push({
      id: `default_proto_${currentProtocol.id.replace(/\./g, '_')}`,
      name: currentProtocol.name,
      category,
      blocks: currentBlocks,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  }
  currentProtocol = null;
  currentBlocks = [];
  currentLines = [];
}

for (const line of lines) {
  // ### X.Y TEST NAME — new protocol
  const testMatch = line.match(/^### (\d+\.\d+)\s+(.+)$/);
  if (testMatch) {
    flushProtocol();
    currentProtocol = { id: testMatch[1], name: testMatch[2].trim() };
    continue;
  }

  // Skip if no current protocol
  if (!currentProtocol) continue;

  // ## SECTION HEADER — skip (these are category headers)
  if (line.match(/^## \d+\./)) continue;

  // #### **Sub-heading**
  const subHeadMatch = line.match(/^####\s+\*\*(.+?)\*\*/);
  if (subHeadMatch) {
    currentLines.push({ type: 'heading2', content: subHeadMatch[1] });
    continue;
  }

  // **Bold label:**
  const boldMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
  if (boldMatch) {
    currentLines.push({ type: 'heading2', content: boldMatch[1].replace(/:$/, '') });
    continue;
  }

  // **Bold label:** text
  const boldTextMatch = line.match(/^\*\*(.+?)\*\*\s+(.+)/);
  if (boldTextMatch) {
    currentLines.push({ type: 'paragraph', content: `**${boldTextMatch[1]}** ${boldTextMatch[2]}` });
    continue;
  }

  // - Bullet point
  const bulletMatch = line.match(/^- (.+)/);
  if (bulletMatch) {
    currentLines.push({ type: 'bullet', content: bulletMatch[1] });
    continue;
  }

  // Numbered list (1. 2. etc.)
  const numberedMatch = line.match(/^\d+\.\s+(.+)/);
  if (numberedMatch) {
    currentLines.push({ type: 'numbered', content: numberedMatch[1] });
    continue;
  }

  // --- divider
  if (line.match(/^---/)) {
    continue; // skip dividers between protocols
  }

  // Regular text (non-empty)
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('|')) {
    currentLines.push({ type: 'paragraph', content: trimmed });
  }
}

// Flush last protocol
flushProtocol();

// Generate TypeScript output
const tsContent = `// @ts-nocheck
// AUTO-GENERATED from data/complete-protocols-all-67-tests.md
// Run: node scripts/generate-default-protocols.mjs
// Do not edit manually — edit the source markdown and regenerate.

export const DEFAULT_PROTOCOLS = ${JSON.stringify(protocols, null, 2)};
`;

writeFileSync(outPath, tsContent);
console.log(`Generated ${protocols.length} default protocols → ${outPath}`);
