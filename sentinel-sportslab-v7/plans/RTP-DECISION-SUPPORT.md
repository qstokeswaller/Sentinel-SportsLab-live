# Return-to-Play Decision Support — Future Plan

## Context
When an athlete is injured, sport scientists and physiotherapists need a structured, criteria-based system to track their progression back to full training and competition. Currently, RTP decisions are often subjective and pressure-driven ("the match is Saturday"). This feature would provide objective evidence to support clinical judgment.

## Scientific Foundation: Waldén et al. (2023, BJSM)
The FIFA/IOC consensus statement (Waldén M, et al. Br J Sports Med 2023;57:1341-1350) provides the standardised framework for injury classification in football. Key RTP-relevant definitions:
- **Recurrence vs Exacerbation**: A recurrence means the injury fully healed and returned; an exacerbation means it never fully healed. This distinction determines RTP protocol aggressiveness.
- **Time-loss severity bins**: 0, 1-3, 4-7, 8-28, 29+ days — determines expected RTP timeline
- **Body area classification**: Football-specific (hip/groin split, thigh as hamstring/quad) — maps to injury-specific RTP templates
- **Mode of onset**: Sudden vs gradual — gradual onset injuries (tendinopathies) may need parallel training + rehab rather than full rest

## Connection to FIFA-Aligned Wellness System
The multi-tier wellness form system (see FIFA-WELLNESS-FORM-SYSTEM.md) feeds RTP directly:
- **Weekly injury classifications** from the Tier 2 deep check populate the `injury_classifications` table with FIFA-grade data
- **Time-loss ≥ 8 days** auto-suggests creating an RTP protocol
- **Recurrence/exacerbation status** determines template selection (more conservative for exacerbations)
- **Daily wellness pain scores** feed Phase 1 criteria (pain-free for X consecutive days)
- **Availability status** returning to "fully available" is a gate criterion for Phase 4
- **ACWR ramp-up data** from the Individualized Load Thresholds feature informs Phase 3 load progression within personal safe bands

## Why not build now
- The FIFA-aligned wellness form system needs to be built first (it provides the data feed)
- RTP protocols are highly variable across injury types, severities, sports, and client types
- Needs input from the sport scientist partner on which protocols to template
- Gen pop clients (pilates, personal training) don't follow formal RTP phases
- Testing isn't always part of RTP — many athletes go through rehab progressions without formal lab testing
- Template creation is a content/clinical task, not just a code task

## Architecture when built

### Template-based system
- Sport scientist creates RTP templates per injury type: "Hamstring Grade 2 RTP", "ACL Reconstruction RTP", "General Muscle Strain RTP", "Concussion Protocol", etc.
- Each template has custom phases with custom criteria
- Templates are reusable across athletes and can be cloned/modified

### Phase structure (example: Hamstring Grade 2)

| Phase | Name | Typical Duration | Criteria to Advance |
|---|---|---|---|
| 1 | Pain Management | 3-7 days | Pain-free wellness scores 3+ consecutive days, full ROM |
| 2 | Rehab & Loading | 7-14 days | Completed prescribed rehab program, isometric strength pain-free |
| 3 | Sport-Specific | 7-14 days | NordBord within 85% of baseline or uninjured limb, sprint at 80%+ max velocity |
| 4 | Full Training | 5-10 days | ACWR safely ramped to 0.8+, completed full training session, no symptom flare |
| 5 | Competition Ready | 2-5 days | Match-intensity session completed, psychological readiness, coach clearance |

### Criteria types
- **Auto-populated** from platform data: wellness pain scores, ACWR values, test results (bilateral comparison), load progression
- **Manual checkbox** for clinical assessments: physio clearance, functional movement assessment, psychological readiness
- **Time-based** gates: minimum days in phase before advancement allowed
- **Severity-aware**: template selection based on injury grade (the template determines the criteria, not a one-size-fits-all system)

### Data sources

| Criterion Type | Platform Data |
|---|---|
| Pain-free days | Wellness questionnaire → pain/soreness scores |
| Strength comparison | Testing Hub → NordBord, IMTP (bilateral comparison to pre-injury baseline) |
| Load progression | Training loads → ACWR ramp-up curve |
| ROM / movement quality | Testing Hub → FMS, ankle DF, hip rotation tests (or manual entry) |
| Session completion | Scheduled sessions → attendance/completion |
| Psychological readiness | Wellness questionnaire → confidence/readiness custom question |

### UI design

**Location:** Wellness Hub → Injury section → extension of existing injury tracking

**Views:**
1. **Active RTP list** — all athletes currently in an RTP protocol, showing phase, days in phase, and next criteria to meet
2. **Individual RTP tracker** — vertical milestone timeline for one athlete:
   - Each phase is a card with 2-5 criteria rows
   - Each criterion has a traffic light (red/amber/green) auto-populated where possible
   - "Advance Phase" button requires all green lights (or clinical override with logged reason)
   - Timestamps for each phase transition
3. **Athlete profile banner** — when viewing an athlete in RTP, their profile shows "Phase 2 — RTP (L Hamstring)" badge

### Template builder

A template builder in Settings → Feature Settings where the sport scientist can:
- Create new RTP templates
- Define phases with names and descriptions
- Add criteria per phase (type: auto/manual/time-based)
- Link auto-criteria to specific test types or wellness questions
- Set minimum days per phase
- Clone existing templates

### Different sports / client types
- **Team sport athletes**: Full protocol with testing gates, ACWR ramp, match simulation
- **Individual/private clients**: Simplified — may just be Phase 1 (pain management) → Phase 2 (return to training) with manual checkboxes
- **Gen pop**: Could use a minimal "traffic light" system — red (can't train), amber (modified), green (cleared) — without formal phases
- The template system handles all these because the sport scientist designs the template per context

### Integration with existing features
- **Injury Report** (Wellness Hub): triggers RTP when an injury is logged with "RTP required" flag
- **Testing Hub**: auto-pulls bilateral comparison data for strength/power criteria
- **ACWR Monitoring**: feeds the load ramp-up criterion
- **Wellness Questionnaires**: feeds pain/soreness/readiness criteria
- **Athlete Profile Modal**: shows RTP phase badge in status bar
- **Individualized Load Thresholds** (if built): personal safe band informs the load ramp-up target

### Estimated effort
- Template builder UI: 2-3 days
- RTP tracker per athlete: 2-3 days
- Auto-population from platform data: 1-2 days
- Database tables (rtp_templates, rtp_instances, rtp_criteria_status): 1 day
- Total: 6-9 days

### Priority
Build after:
1. Sport scientist partner reviews and provides input on template structures
2. Individualized load thresholds are built and tested (feeds RTP criterion)
3. Platform has enough real athlete injury data to test against
