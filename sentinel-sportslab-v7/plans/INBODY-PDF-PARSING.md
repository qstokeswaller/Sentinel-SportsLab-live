# InBody PDF Auto-Parsing — Future Enhancement

## Context
InBody machines generate standardised PDF result sheets via LookinBody software. Currently, sport scientists manually enter key metrics or use CSV import, and attach the original PDF as a reference document. This plan covers automating the extraction of data directly from uploaded PDFs.

## Why not now
- Requires installing `pdfjs-dist` (~3MB dependency)
- Different InBody models (770, 580, 270) have slightly different PDF layouts — need model-specific parsers
- Manual entry + CSV covers the immediate need
- PDF attachment already stores the full report for reference

## When to build
- When user volume justifies the effort (multiple teams doing regular InBody scans)
- When the InBody API integration (see THIRD-PARTY-API-INTEGRATIONS.md) is deprioritised or unavailable

## Implementation plan

### Step 1: Install pdfjs-dist
```bash
npm install pdfjs-dist
```

### Step 2: Build InBody PDF extractor
- InBody 770 PDF is portrait, single-page, fixed layout
- Text positions are consistent globally (LookinBody generates the template)
- Extract text content via `page.getTextContent()` and map by Y/X coordinates to field names
- Key extraction targets:
  - Header: Name, ID, Date, Age, Height
  - Body Composition: Weight, TBW, ICW, ECW, Protein, Minerals, BFM, SMM, LBM, FFM
  - Obesity: BMI, PBF, WHR (estimated), VFL
  - Segmental Lean: RA, LA, TR, RL, LL lean mass values
  - Segmental Fat: RA, LA, TR, RL, LL fat mass values
  - ECW/TBW: whole body + 5 segmental ratios
  - Phase Angle, BMR, InBody Score

### Step 3: Model detection
- Parse header text to detect InBody model (770 vs 580 vs 270)
- Route to model-specific field position maps
- Start with 770 only, add 580/270 later

### Step 4: Confirmation UI
- After extraction, show parsed values in a confirmation modal
- User can correct any misread values before saving
- Pre-fill the InBody test form fields with extracted data

### Step 5: Batch support
- Allow uploading multiple PDFs at once
- Auto-match athlete names from PDF headers to roster
- Use UnmatchedAthleteResolver for unknown names

## PDF field position map (InBody 770)
The text extraction approach uses Y-coordinate ranges to identify sections, then X-coordinates within each section to identify specific values. Example mapping:

```typescript
const FIELD_POSITIONS_770 = {
  // Y range → section, then X range → field
  name: { yRange: [40, 60], xRange: [100, 300] },
  date: { yRange: [40, 60], xRange: [400, 550] },
  weight: { yRange: [120, 140], xRange: [200, 280] },
  tbw: { yRange: [160, 180], xRange: [200, 280] },
  smm: { yRange: [200, 220], xRange: [200, 280] },
  bfm: { yRange: [240, 260], xRange: [200, 280] },
  pbf: { yRange: [300, 320], xRange: [200, 280] },
  // ... etc
};
```

Exact coordinates need calibration against real InBody 770 PDFs.

## Estimated effort
- Parser for InBody 770: 1-2 days
- Confirmation UI: half day
- Model detection + 580 support: 1 day
- Batch import with athlete matching: half day
- Total: 3-4 days
