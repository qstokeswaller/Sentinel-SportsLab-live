# Scientific Foundations — Research Documentation

This document captures the scientific research underpinning new features built into Sentinel SportsLab. Each section cites the original research, explains the methodology, and documents implementation decisions.

---

## 1. Force-Velocity Profiling

### Research basis
- **Samozino P, Morin JB, Hintzy F, Belli A (2008).** A simple method for measuring force, velocity and power output during squat jump. *Medicine & Science in Sports & Exercise*, 40(8):1439-1447.
- **Samozino P, Rejc E, Di Prampero PE, Belli A, Morin JB (2012).** Optimal force-velocity profile in ballistic movements. *Medicine & Science in Sports & Exercise*, 44(11):2243-2254.
- **Samozino P, Edouard P, Sangnier S, Brughelli M, Gimenez P, Morin JB (2014).** Force-velocity profile: Imbalance determination and effect on performance in elite sprinters. *Journal of Applied Biomechanics*, 29(1):35-43.
- **Morin JB, Samozino P (2016).** Interpreting power-force-velocity profiles for individualized and specific training. *International Journal of Sports Science*, 37(2):134-141.
- **Jimenez-Reyes P, Samozino P, Brughelli M, Morin JB (2017).** Effectiveness of an individualized training based on force-velocity profiling during jumping. *Scandinavian Journal of Medicine & Science in Sports*, 27(11):1274-1281.
- **Jimenez-Reyes P, Samozino P, Garcia-Ramos A, Cuadrado-Penafiel V, Brughelli M, Morin JB (2019).** Relationship between vertical and horizontal force-velocity-power profiles in various sports and levels of practice. *Journal of Strength and Conditioning Research*, 33(2):388-396.

### Key formulas implemented
```
Take-off velocity:        v0 = sqrt(2 * g * h)
Mean force (push-off):    F = m * g * (h/hPO + 1)
Mean power:               P = F * v0/2
Peak power:               Pmax = F0 * V0 / 4
FV slope:                 SFV = -F0/V0
Optimal slope:            SFV_opt = -(m*g) / (2*hPO * sqrt(Pmax*hPO / (2*m*g)))
FV imbalance:             FVimb = (SFV - SFV_opt) / |SFV_opt| * 100
```

### Classification thresholds (Jimenez-Reyes et al., 2019)
- Force deficit: FVimb < -10%
- Velocity deficit: FVimb > +10%
- Well-balanced: |FVimb| ≤ 10%

### Implementation approach
We use a proxy F-V profile from existing test data (CMJ, SJ, IMTP, sprint splits) rather than the gold-standard loaded jump protocol. This provides R² of ~0.70-0.85 vs >0.95 for the multi-point method. Acceptable for monitoring trends; the system notes this limitation. Push-off distance defaults to 0.40m per Samozino et al. (2008).

---

## 2. Individualized Load Tolerance Thresholds

### Research basis
- **Gabbett TJ (2016).** The training-injury prevention paradox: should athletes be training smarter AND harder? *British Journal of Sports Medicine*, 50(5):273-280.
- **Blanch P, Gabbett TJ (2016).** Has the athlete trained enough to return to play safely? *British Journal of Sports Medicine*, 50(8):471-475.
- **Windt J, Gabbett TJ (2017).** How do training and competition workloads relate to injury? The workload-injury aetiology model. *British Journal of Sports Medicine*, 51(5):428-435.
- **Hulin BT, Gabbett TJ, Blanch P, Chapman P, Bailey D, Orchard JW (2014).** Spikes in acute workload are associated with increased injury risk in elite cricket fast bowlers. *British Journal of Sports Medicine*, 48(8):708-712.
- **Hulin BT, Gabbett TJ, Lawson DW, Caputi P, Sampson JA (2016).** The acute:chronic workload ratio predicts injury: high chronic workload may decrease injury risk in elite rugby league players. *British Journal of Sports Medicine*, 50(4):231-236.
- **Malone S, Owen A, Newton M, Mendes B, Collins KD, Gabbett TJ (2017).** The acute:chronic workload ratio in relation to injury risk in professional soccer. *Journal of Science and Medicine in Sport*, 20(6):561-565.
- **Impellizzeri FM, Tenan MS, Kempton T, Novak A, Coutts AJ (2019).** Acute:chronic workload ratio: Conceptual issues and fundamental pitfalls. *International Journal of Sports Physiology and Performance*, 15(6):907-913.
- **Williams S, West S, Cross MJ, Stokes KA (2017).** Better way to determine the acute:chronic workload ratio? *British Journal of Sports Medicine*, 51(3):209-210.

### Methodology
Population-level ACWR thresholds (0.8-1.3 sweet spot, >1.5 danger zone) are starting points, not prescriptions. Individual athletes have different load tolerance levels based on:
- Training history and chronic fitness base (Blanch & Gabbett, 2016)
- Injury history
- Individual wellness response patterns

Our implementation uses frequency-based threshold estimation:
1. Build daily ACWR series using EWMA (Williams et al., 2017) to avoid mathematical coupling
2. Define negative events as: injury dates OR sustained wellness drops (composite below personal mean - 1.5 SD for ≥3 consecutive days)
3. Bin historical ACWR values in 0.1 increments
4. Track negative event incidence per bin
5. Personal upper threshold = lowest ACWR bin above 0.8 where event rate exceeds 15%
6. Confidence scoring: High (≥16 weeks + ≥3 events), Moderate (≥8 weeks), Low (<8 weeks, uses population defaults)

### Key insight
High chronic workloads are protective (Hulin et al., 2016). An athlete with a chronic load of 2000 AU at ACWR 1.3 is safer than one with chronic load 800 AU at the same ratio. The personalized threshold captures this implicitly — well-conditioned athletes will have higher historical ACWR values without negative events, producing a higher personal upper threshold.

---

## 3. Dose-Response Analysis

### Research basis
- **Banister EW, Calvert TW, Savage MV, Bach T (1975).** A systems model of training for athletic performance. *Australian Journal of Sports Medicine*, 7:57-61.
- **Busso T (2003).** Variable dose-response relationship between exercise training and performance. *Medicine & Science in Sports & Exercise*, 35(7):1188-1195.
- **Hopkins WG (2004).** How to interpret changes in an athletic performance test. *Sportscience*, 8:1-7.
- **Foster C, Florhaug JA, Franklin J, et al. (1998).** A new approach to monitoring exercise training. *Journal of Strength and Conditioning Research*, 15(1):109-115.

### Methodology
We use block-comparison dose-response (practical approach) rather than the Banister impulse-response model (requires daily performance tests):

**Dose metrics:**
- Total accumulated load = SUM(sRPE × duration) across the training block
- Average daily load
- Session count

**Response metrics:**
- Delta in test results bookending the training block (pre-block vs post-block)
- Percentage change

**Responder classification (Hopkins, 2004):**
- Smallest Worthwhile Change (SWC) ≈ 0.2 × between-subject SD
- Simplified: >3% improvement = positive responder, <-3% = adverse, ±3% = stable

### Implementation approach
The system is opportunistic — works with whatever test data exists. If only pre-season and mid-season tests are available, those are the bookends. It doesn't force a testing schedule. This reflects real-world practice where formal testing is infrequent outside pre-season.

---

## 4. Readiness Composite Score

### Research basis
- **Halson SL (2014).** Monitoring training load to understand fatigue in athletes. *Sports Medicine*, 44(S2):139-147.
- **Fullagar HH, Skorski S, Duffield R, Hammes D, Coutts AJ, Meyer T (2015).** Sleep and athletic performance: the effects of sleep loss on exercise performance. *Sports Medicine*, 45(2):161-186.
- **Saw AE, Main LC, Gastin PB (2016).** Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures. *British Journal of Sports Medicine*, 50(5):281-291.

### Implementation
5-domain weighted composite with redistribution when domains are missing:
- Load Status (30%): ACWR ratio mapped to 0-100
- Recovery State (25%): Wellness scores with differential weighting — sleep 35%, energy 30%, soreness 20%, stress 15% (sleep is ~2x more predictive per Fullagar et al., 2015)
- Performance Trend (20%): Test result direction with soft decay for stale tests (>60 days)
- Injury Risk (15%): Bilateral asymmetry + relative strength + FMS screening
- Data Freshness (10%): Confidence signal based on data recency

---

## 5. Benchmarking Engine

### Why benchmarking matters
A test result in isolation is meaningless without context. "CMJ 38cm" requires comparison to:
1. **Team average** — is this athlete above or below their peers?
2. **Position group** — how do they compare to athletes in the same role?
3. **Their own history** — are they improving, stable, or declining?
4. **Published norms** — where do they sit on population reference scales?

### Implementation
Percentile ranking against the roster:
- Collects latest result per athlete for each test type
- Calculates percentile rank: P = (count of values below ÷ total count) × 100
- Handles ties via average rank method
- Requires ≥3 athletes with data for meaningful percentile
- Accounts for lower-is-better metrics (sprint times, agility times)
- Displayed as inline badge (P85, P42) next to test results in the Testing Hub

---

## 6. EWMA vs Rolling Averages

All ACWR calculations in the platform use Exponentially Weighted Moving Averages (Williams et al., 2017) rather than simple rolling averages. EWMA:
- Reduces the spike sensitivity that causes false positives with rolling averages
- Accounts for the decaying nature of training load effects
- Lambda: λ = 2/(N+1) where N = window in days (7 for acute, 28 for chronic)
- Formula: EWMA_t = L_t × λ + EWMA_{t-1} × (1-λ)
