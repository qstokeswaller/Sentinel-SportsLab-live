// @ts-nocheck

// Power × Resistance × Cadence tables — sourced verbatim from the official
// Wattbike support article:
// https://support.wattbike.com/en-GB/power-resistance-and-cadence-tables-for-wattbike-trainer-pro-air-pro-air-pro-high-air-nucleus-standard-and-nucleus-high-2477615
//
// Column index → cadence (RPM):  40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130
// Row key → resistance / air-slider level (1 = lightest, 10 = heaviest)
//
// Model labels follow Wattbike's own grouping (Trainer & Air-Pro share a table,
// Pro & Air-Pro High share a table, Nucleus has Standard and High variants).
// Per Wattbike: "tables are mathematically constructed and are for guidance only"
// (±2% accuracy + altitude / calibration variance).
//
// IMPORTANT: do NOT replace these with interpolated curves without first updating
// this header — coaches rely on the absolute numbers for prescription.

export const WATTBIKE_TABLES = {
    'Trainer': {
        label: 'Trainer / Air-Pro',
        cadence: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
        fans: {
            1:  [15, 20, 25, 30, 35, 40,  50,  55,  65,  75,  85, 100, 110, 125, 140, 155, 170, 190, 210],
            2:  [15, 20, 25, 30, 35, 45,  50,  60,  70,  80,  95, 110, 125, 140, 155, 175, 190, 210, 230],
            3:  [15, 20, 25, 35, 40, 50,  60,  70,  85, 100, 115, 130, 150, 170, 190, 210, 235, 260, 280],
            4:  [20, 25, 30, 40, 45, 55,  70,  80,  95, 115, 135, 155, 175, 200, 225, 250, 280, 310, 340],
            5:  [25, 30, 35, 40, 50, 65,  75,  95, 110, 130, 150, 175, 200, 230, 260, 290, 325, 360, 400],
            6:  [25, 30, 35, 45, 55, 70,  85, 105, 125, 145, 170, 200, 225, 260, 290, 325, 365, 405, 450],
            7:  [25, 30, 40, 50, 60, 75,  95, 115, 135, 160, 185, 215, 245, 280, 320, 355, 395, 440, 490],
            8:  [30, 35, 40, 50, 65, 80, 100, 120, 145, 170, 200, 230, 265, 300, 340, 385, 430, 480, 530],
            9:  [30, 35, 45, 55, 70, 85, 105, 130, 155, 180, 215, 245, 285, 325, 365, 415, 460, 513, 570],
            10: [30, 35, 45, 55, 70, 90, 110, 135, 160, 190, 225, 260, 300, 340, 385, 435, 485, 540, 595],
        }
    },
    'Pro': {
        label: 'Pro / Air-Pro High',
        cadence: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
        fans: {
            1:  [25, 35, 40,  50,  60,  70,  85, 100, 115, 130, 150, 175, 195, 210, 245, 270, 300, 330,  360],
            2:  [30, 40, 40,  50,  60,  80,  90, 105, 125, 145, 165, 185, 215, 230, 270, 310, 335, 370,  405],
            3:  [30, 40, 50,  60,  70,  90, 105, 130, 150, 170, 200, 225, 260, 295, 330, 380, 410, 450,  495],
            4:  [40, 45, 55,  70,  80, 100, 120, 150, 170, 195, 235, 265, 310, 350, 395, 445, 490, 545,  600],
            5:  [45, 50, 60,  75,  90, 115, 135, 175, 195, 225, 265, 310, 355, 400, 455, 515, 570, 635,  705],
            6:  [45, 55, 65,  80, 100, 125, 150, 185, 215, 260, 300, 350, 395, 445, 510, 575, 640, 710,  785],
            7:  [50, 55, 70,  90, 110, 135, 165, 200, 235, 275, 325, 375, 430, 490, 555, 625, 695, 775,  855],
            8:  [50, 60, 70,  95, 115, 150, 175, 210, 250, 295, 350, 400, 465, 525, 600, 675, 750, 835,  925],
            9:  [55, 60, 75, 100, 120, 155, 185, 225, 270, 320, 375, 425, 500, 565, 645, 725, 810, 900,  995],
            10: [55, 65, 80, 105, 125, 160, 190, 240, 280, 340, 390, 450, 520, 600, 675, 760, 850, 945, 1045],
        }
    },
    'Nucleus Standard': {
        label: 'Nucleus (Standard)',
        cadence: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
        fans: {
            1:  [45, 50, 55, 60, 65,  70,  85,  90, 105, 115, 125, 140, 155, 170, 190, 205, 225, 245, 260],
            2:  [45, 50, 55, 60, 70,  80,  90,  95, 110, 120, 140, 155, 170, 185, 210, 230, 250, 270, 290],
            3:  [45, 50, 60, 70, 75,  85,  95, 105, 120, 135, 155, 170, 195, 215, 235, 255, 290, 310, 340],
            4:  [45, 55, 60, 70, 80,  90, 105, 115, 135, 150, 175, 195, 220, 235, 270, 295, 330, 360, 390],
            5:  [50, 55, 65, 70, 85, 100, 115, 130, 150, 165, 195, 220, 245, 275, 305, 335, 375, 410, 450],
            6:  [50, 55, 65, 75, 90, 105, 125, 140, 160, 180, 210, 240, 265, 300, 335, 370, 410, 450, 495],
            7:  [50, 55, 70, 80, 95, 110, 130, 150, 170, 195, 225, 255, 285, 320, 355, 395, 440, 480, 525],
            8:  [50, 55, 70, 80, 95, 115, 135, 155, 180, 205, 235, 265, 300, 335, 375, 420, 465, 510, 565],
            9:  [50, 55, 70, 80, 100, 120, 140, 165, 185, 210, 245, 275, 315, 355, 400, 450, 490, 545, 600],
            10: [50, 55, 75, 80, 105, 125, 145, 170, 195, 225, 255, 290, 330, 370, 415, 465, 510, 565, 620],
        }
    },
    'Nucleus High': {
        label: 'Nucleus (High)',
        // Note: extremely high resistance curve — suited only to very powerful riders.
        cadence: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
        fans: {
            1:  [50, 55,  65,  75,  85,  95, 115, 130, 145, 160, 180, 205, 225, 250, 280, 305, 340, 370,  400],
            2:  [50, 55,  65,  75,  90, 105, 120, 135, 160, 180, 200, 225, 255, 285, 315, 350, 390, 415,  450],
            3:  [50, 60,  70,  85, 100, 120, 135, 155, 180, 205, 230, 260, 295, 330, 370, 410, 455, 495,  540],
            4:  [55, 60,  80,  90, 110, 130, 150, 175, 205, 235, 270, 305, 345, 385, 435, 480, 545, 600,  655],
            5:  [55, 60,  85, 100, 120, 140, 170, 190, 230, 265, 305, 350, 395, 445, 500, 560, 625, 690,  760],
            6:  [60, 65,  90, 105, 130, 155, 185, 215, 255, 295, 335, 380, 440, 495, 560, 625, 700, 770,  845],
            7:  [60, 65,  95, 110, 140, 165, 195, 230, 270, 315, 365, 415, 475, 535, 610, 680, 765, 845,  925],
            8:  [65, 70, 100, 120, 145, 170, 210, 245, 290, 335, 385, 440, 505, 570, 650, 725, 815, 895,  985],
            9:  [65, 70, 100, 120, 150, 180, 220, 260, 305, 355, 410, 470, 540, 630, 690, 760, 870, 960, 1055],
            10: [70, 80, 105, 125, 160, 190, 230, 275, 320, 375, 430, 495, 565, 640, 730, 815, 925, 1020, 1120],
        }
    }
};

// Ordered list of selectable bike models for UI controls.
export const WATTBIKE_MODELS = ['Trainer', 'Pro', 'Nucleus Standard', 'Nucleus High'] as const;

export const calculateRpmForFan = (targetWatts, fanSetting, model) => {
    const table = WATTBIKE_TABLES[model];
    if (!table) return 0;
    const powerCurve = table.fans[fanSetting];
    const cadences = table.cadence;

    if (targetWatts < powerCurve[0]) return `< ${cadences[0]}`;
    if (targetWatts > powerCurve[powerCurve.length - 1]) return `> ${cadences[cadences.length - 1]}`;

    for (let i = 0; i < powerCurve.length - 1; i++) {
        if (targetWatts >= powerCurve[i] && targetWatts <= powerCurve[i + 1]) {
            const w1 = powerCurve[i];
            const w2 = powerCurve[i + 1];
            const c1 = cadences[i];
            const c2 = cadences[i + 1];
            const rpm = c1 + (targetWatts - w1) * (c2 - c1) / (w2 - w1);
            return Math.round(rpm);
        }
    }
    return 0;
};
export const calculateFanFromRPM = (rpm, targetWatts, model) => {
    const table = WATTBIKE_TABLES[model];
    if (!table) return 1;

    const cadences = table.cadence;
    // Find index of closest cadence
    let closestIndex = 0;
    let minDiff = Math.abs(cadences[0] - rpm);

    for (let i = 1; i < cadences.length; i++) {
        const diff = Math.abs(cadences[i] - rpm);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }

    // Find fan setting closest to targetWatts at this cadence
    let bestFan = 1;
    let closestWattDiff = Infinity;

    for (let f = 1; f <= 10; f++) {
        const powerAtCadence = table.fans[f][closestIndex];
        const diff = Math.abs(powerAtCadence - targetWatts);
        if (diff < closestWattDiff) {
            closestWattDiff = diff;
            bestFan = f;
        }
    }

    return bestFan;
};
