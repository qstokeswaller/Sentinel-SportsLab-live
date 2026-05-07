# Sentinel SportsLab — Research References

All peer-reviewed research, frameworks, and evidence sources used throughout the platform. Organised by feature area with links to where each reference is applied in the codebase.

---

## 1. ACWR (Acute:Chronic Workload Ratio)

**Where used:** Wellness Hub > ACWR Monitoring, Dashboard Morning Report, Analytics Hub > Scenario Modelling, Performance Intelligence cross-domain rules

| Reference | What it informs | Platform location |
|---|---|---|
| [Gabbett TJ (2016). The training-injury prevention paradox. BJSM.](https://pubmed.ncbi.nlm.nih.gov/26758673/) | ACWR thresholds: 0.8-1.3 sweet spot, >1.5 = 2-4x injury risk | `docs/utils/constants.ts` — `ACWR_UTILS.getRatioStatus()` |
| [Williams S et al. (2017). EWMA better than rolling averages for ACWR. BJSM.](https://pubmed.ncbi.nlm.nih.gov/27935489/) | EWMA calculation method, lambda formula: 2/(N+1) | `docs/utils/constants.ts` — `ACWR_UTILS.calculateEWMA()` |
| [Menaspa P (2017). Are rolling averages a good way to assess training load? BJSM.](https://pubmed.ncbi.nlm.nih.gov/27919910/) | Rest-day freeze approach to prevent ACWR spikes on return | `docs/utils/constants.ts` — `freezeRestDays` parameter |
| [Hulin BT et al. (2014). Spikes in acute workload are associated with increased injury risk. BJSM.](https://pubmed.ncbi.nlm.nih.gov/24144531/) | Spike detection logic (>0.3 ratio jump in 3 days) | `docs/utils/constants.ts` — `getAthleteRiskReasoning()` |
| [Impellizzeri FM et al. (2021). Editorial: ACWR — Is There Scientific Evidence? Frontiers.](https://pmc.ncbi.nlm.nih.gov/articles/PMC8138569/) | Critical review of ACWR validity, no evidence for "sweet spot" as injury predictor | Informed conservative implementation — ACWR used as monitoring tool, not sole predictor |
| [ACWR and Injury Risk Systematic Review (2020). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7047972/) | Relationship between ACWR and injury incidence across sports | General ACWR architecture design |

---

## 2. Performance Intelligence Engine

**Where used:** Analytics Hub > Performance Intelligence terminal, `docs/utils/performanceIntelligence.ts`

### 2.1 Readiness Composite Score

| Reference | What it informs | Platform location |
|---|---|---|
| [Taberner M et al. (2023). Composite Score of Readiness (CSR) as Data Reduction Technique. MDPI Symmetry.](https://www.mdpi.com/2073-8994/15/2/298) | Z-score summation approach for unitless cross-test composites, 4-5 test battery differentiates deficits | `calculateReadinessScore()` — domain-based composite with weight redistribution |
| [Taberner M et al. (2021). CSR as Holistic Profiling of Functional Deficits. J Clin Med.](https://pmc.ncbi.nlm.nih.gov/articles/PMC8397164/) | CSR methodology for return-to-sport monitoring in footballers | Readiness score architecture design |
| [Robertson S, Bartlett J, Gastin P (2017). Red, Amber or Green? Athlete Monitoring — Need for Decision-Support Systems. IJSPP.](https://pubmed.ncbi.nlm.nih.gov/27967289/) | Traffic light (RAG) system standardisation, challenges in operationalisation | RAG badge display (green 80+, amber 50-79, red <50) |
| [TritonWear — How Readiness Score is Calculated](https://support.tritonwear.com/how-readiness-score-is-calculated) | Data maturation model: scores improve after 7 days, full after 28 days | Confidence levels (limited/moderate/high) based on data domain count |
| [Comyns T — Guide to Athlete Readiness (Output Sports)](https://www.outputsports.com/blog/dr-tom-comyns-guide-to-athlete-readiness) | Practical readiness monitoring: CMJ, HRV, wellness questionnaires | Domain selection for readiness composite |

### 2.2 ACWR + Wellness Cross-Referencing

| Reference | What it informs | Platform location |
|---|---|---|
| [ACWR and Wellness in Premier League Hockey (2023). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC9924552/) | High ACWR trivially associated with worse wellness, muscle soreness, and energy | Compound fatigue rule: ACWR >1.3 AND sleep <5 AND soreness >6 = Critical |
| [Subjective Wellness, ACWR, and Injury in Rugby (2019). JSCR.](https://journals.lww.com/nsca-jscr/Fulltext/2019/12000/Subjective_Wellness,_Acute__Chronic_Workloads,_and.21.aspx) | Subjective wellness adds predictive value beyond ACWR alone for injury risk | Wellness pattern rules + ACWR compound rules in `generateInsights()` |

### 2.3 Nordic Hamstring + ACWR Compound

| Reference | What it informs | Platform location |
|---|---|---|
| [van Dyk N et al. (2019). Nordic Hamstring Exercise halves hamstring injury rate. BJSM Meta-analysis (8,459 athletes).](https://pubmed.ncbi.nlm.nih.gov/30808663/) | 51% injury reduction with NHE programs, 48 reps/week recommendation | Nordic insight rules + recommendation text in `generateInsights()` |
| [VALD Performance — NordBord Testing: Applications for Training, Monitoring and Evaluation](https://valdperformance.com/news/nordbord-testing-new-applications-training-monitoring-evaluation) | N/kg risk thresholds: <3.37 High Risk, 3.37-4.47 Moderate, >4.47 Low | Hamstring risk classification in `generateInsights()` |
| [Science for Sport — VALD NordBord Hamstring Strength Testing](https://www.scienceforsport.com/vald-nordbord-hamstring-strength-testing/) | Testing protocol, bilateral asymmetry thresholds (>15% = elevated risk) | Bilateral asymmetry rule in `generateInsights()` |

### 2.4 Missing Data & Detraining

| Reference | What it informs | Platform location |
|---|---|---|
| [Missing Data in Sport Science: Wearables in American Football (2023). PubMed.](https://pubmed.ncbi.nlm.nih.gov/37027076/) | "Most dashboards do not recognize issues from missing data" — practitioners unaware of bias | Weight redistribution in readiness score, confidence badges, data gap insights |
| [Saw AE et al. (2015). Monitoring Athletes Through Self-Report. PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC4306765/) | Athletes retrospectively enter data from memory, introducing bias | Data freshness domain in readiness score |
| [Effect of In-Season Break Detraining on Repeated Sprint Ability (2018). PLOS ONE.](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0201111) | 2-week break causes RSA decline, 2 weeks retraining needed to return to baseline | Break detection logic, post-break re-baselining in readiness score |
| [Effects of Detraining and Retraining in Elite Soccer (2018). PLOS ONE.](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0196212) | Short-term detraining effects on physical fitness | Break detection insight: "2 weeks of retraining needed" |
| [Changes in RTS Test Performance During Collegiate Soccer Season (2023). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10606967/) | Preseason baseline testing provides best representation of abilities | Post-break test exclusion from performance trend scoring |

### 2.5 Cross-Domain Load Intelligence

| Reference | What it informs | Platform location |
|---|---|---|
| [Internal:External Load Ratio as Fitness Monitoring Tool (2022). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC9331329/) | Efficiency Index (TD:sRPE) — declining ratio = fatigue signal | Multi-metric ACWR disagreement rule |
| [sRPE Strongly Correlated to GPS External Load in NCAA Soccer (2021). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC8628997/) | sRPE-TL strongly associated with acceleration load and total distance | Validation of sRPE as universal load metric |
| [How to Use GPS Data in Elite Soccer (2020). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7468376/) | Relevant GPS parameters: total distance, HSR, sprint distance, accelerations | ACWR metric types (sprint_distance, total_distance, player_load) |
| [Training Load and Injury in Professional Rugby League. ScienceDirect.](https://www.sciencedirect.com/science/article/abs/pii/S144024401000914X) | Gym tonnage significantly associated with field training injuries through residual fatigue | Cross-domain load rules in ANALYTICS-EVOLUTION.md |
| [Global Training Load Measure Predicting Match Performance (2017). Frontiers.](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2017.00930/full) | Multi-metric global load measure | Multi-metric ACWR architecture |

### 2.6 CMJ / Neuromuscular Monitoring

| Reference | What it informs | Platform location |
|---|---|---|
| [CMJ Meta-Analysis for Neuromuscular Monitoring (2016). PubMed.](https://pubmed.ncbi.nlm.nih.gov/27663764/) | CMJ is a strong predictor of neuromuscular fatigue, 91% of practitioners use it | CMJ test definition in test registry, PI rule design |
| [CMJ Force-Time Signatures Distinguish Fatigue Types (2019). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC6619745/) | PCA can distinguish neuromuscular vs metabolic fatigue from CMJ data | Future CMJ readiness monitoring (VBT-PLAN.md Phase 4) |
| [Hawkin Dynamics — Readiness Monitoring](https://www.hawkindynamics.com/blog/readiness-monitoring) | IMTP for long-term strength, CMJ for short-term readiness | Test staleness thresholds (strength: 60d, power: 60d) |

---

## 3. Training Load Monitoring (General)

**Where used:** ACWR Monitoring, Training Load Entry, Scenario Modelling

| Reference | What it informs | Platform location |
|---|---|---|
| [Halson SL (2014). Monitoring Training Load to Understand Fatigue in Athletes. Sports Medicine. PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC4213373/) | Comprehensive monitoring framework: internal vs external load | Overall ACWR architecture, metric type selection |
| [Foster C et al. (2001). Session-RPE Method for Training Load Monitoring. Frontiers.](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full) | sRPE as valid internal load measure | Default metric type (sRPE = RPE x Duration) |
| [Coutts AJ et al. (2019). Developing Athlete Monitoring Systems in Team Sports. ResearchGate.](https://www.researchgate.net/publication/330293106_Developing_Athlete_Monitoring_Systems_in_Team_Sports_Data_Analysis_and_Visualization) | Data analysis and visualisation for athlete monitoring | Dashboard design, analytics hub architecture |
| [More Than a Metric: How Training Load is Used in Elite Sport (2020). PubMed.](https://pubmed.ncbi.nlm.nih.gov/33075832/) | Load monitoring integrates prescription, communication, and context | Scenario modelling design (load predictor) |
| [Springer (2026). Monitoring Training Effects: Multidimensional Framework for Decision-Making.](https://link.springer.com/article/10.1007/s40279-026-02417-4) | Multi-dimensional decision-making framework for athlete monitoring | Overall analytics architecture |
| [Science for Sport — Training Load Monitoring: Multiple Variables](https://www.scienceforsport.com/training-load-monitoring-how-coaches-can-effectively-monitor-multiple-variables/) | Practical multi-variable monitoring approach | Multi-metric ACWR support |

---

## 4. Velocity-Based Training (VBT)

**Where used:** Testing Hub (VBT tab on barbell tests), VBT-PLAN.md

| Reference | What it informs | Platform location |
|---|---|---|
| [Gonzalez-Badillo JJ et al. Mean velocity as indicator of relative intensity. IJSPM.](https://pubmed.ncbi.nlm.nih.gov/) | Mean velocity to %1RM mapping formula: %1RM = -51.7 x MV + 114.3 | `VBT_CALCULATIONS.vbt_intensity` formula in testRegistry.ts |
| [Jidovtseff B et al. Load-velocity relationship for VBT.](https://pubmed.ncbi.nlm.nih.gov/) | Linear load-velocity regression for estimated 1RM from sub-maximal sets | `VBT_CALCULATIONS.vbt_e1rm` formula in testRegistry.ts |
| Minimum Velocity Threshold (MVT) values: Back Squat ~0.30 m/s, Bench Press ~0.17 m/s, Deadlift ~0.15 m/s | Exercise-specific MVT for 1RM estimation accuracy | `VBT_CALCULATIONS.vbt_e1rm` uses generalised 0.2 m/s threshold |

---

## 5. Growth & Maturation

**Where used:** Protocol Library (Growth & Maturation Monitoring Protocol)

| Reference | What it informs | Platform location |
|---|---|---|
| Mirwald RL et al. (2002). Maturity offset prediction equation | PHV estimation from anthropometric measures | Growth & Maturation protocol content |
| Reference document: `data/reference-documents/Growth and Maturation in Athletic Development.pdf` | Comprehensive youth athlete development framework | Protocol library default protocol |

---

## 6. Hamstring Injury Prevention

**Where used:** Testing Hub (NordBord test), Performance Intelligence (injury risk rules), Protocol Library

| Reference | What it informs | Platform location |
|---|---|---|
| [van Dyk N et al. (2019). NHE halves hamstring injury rate. BJSM.](https://pubmed.ncbi.nlm.nih.gov/30808663/) | 51% injury reduction, meta-analysis of 8,459 athletes | Nordic protocol content, PI recommendation text |
| Reference document: `data/reference-documents/Hamstring RTP Protocol.pdf` | Symptom-based return-to-play framework | Protocol library default protocol |
| Reference document: `data/reference-documents/HAMSTRING RTP PROTOCOL, SYMPTOM BASED RECOMMENDATION. (1).pdf` | Detailed RTP pathway with phase criteria | Protocol library default protocol |

---

## 7. High-Speed Running & Sprint Monitoring

**Where used:** ACWR Monitoring (sprint_distance metric), Reporting Hub (GPS Data)

| Reference | What it informs | Platform location |
|---|---|---|
| [High-Speed Running Thresholds in Professional Soccer (2023). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC9968809/) | HSR measured 19.8-24.8 km/h, Sprint >25.2 km/h | Default sprint threshold: 25 km/h in ACWR settings |
| [Internal and External Loads in Adolescent Athletes (2023). PMC.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10356657/) | Moderate evidence for training load-injury relationship | Combined load monitoring approach |

---

## File Locations

| File | Purpose |
|---|---|
| `docs/research/REFERENCES.md` | This file — all research references |
| `docs/ANALYTICS-EVOLUTION.md` | Performance Intelligence design document with inline sources |
| `docs/ACWR-RESEARCH.md` | Original ACWR theory and implementation notes |
| `docs/ACWR-PHASE-2.md` | ACWR Phase 2 roadmap |
| `docs/VBT-PLAN.md` | VBT implementation plan for workout integration |
| `data/reference-documents/` | PDF and Excel source documents |
| `data/complete-protocols-all-67-tests.md` | Full 67-test protocol reference |
| `data/complete-references-all-67-tests.md` | Test-specific normative references |
