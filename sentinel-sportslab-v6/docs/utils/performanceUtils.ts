// @ts-nocheck

export const WATTBIKE_TABLES = {
    Trainer: {
        cadence: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
        fans: {
            1: [18, 21, 25, 30, 35, 41, 47, 54, 62, 71, 80, 91, 103, 115, 131, 147, 163, 185, 207],
            2: [20, 24, 28, 33, 39, 46, 54, 62, 73, 85, 97, 110, 125, 142, 160, 180, 203, 225, 252],
            3: [22, 26, 31, 37, 44, 52, 61, 71, 83, 97, 111, 126, 144, 163, 185, 209, 235, 260, 292],
            4: [24, 29, 34, 41, 49, 58, 68, 80, 94, 109, 125, 142, 163, 185, 210, 238, 267, 295, 332],
            5: [26, 31, 38, 45, 54, 64, 75, 89, 104, 121, 139, 158, 181, 206, 235, 266, 298, 330, 372],
            6: [28, 34, 41, 50, 60, 71, 84, 99, 116, 135, 155, 177, 202, 231, 263, 298, 334, 371, 418],
            7: [31, 37, 46, 55, 66, 79, 93, 110, 129, 150, 172, 196, 224, 256, 292, 331, 371, 411, 463],
            8: [33, 41, 50, 60, 72, 86, 102, 120, 141, 164, 189, 215, 246, 281, 321, 363, 407, 451, 508],
            9: [36, 44, 54, 65, 78, 93, 111, 131, 153, 178, 206, 234, 268, 306, 349, 396, 443, 491, 553],
            10: [39, 48, 59, 71, 85, 102, 121, 143, 167, 194, 225, 255, 292, 334, 380, 431, 483, 535, 603]
        }
    },
    Pro: {
        cadence: [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
        fans: {
            1: [25, 32, 39, 48, 57, 69, 83, 98, 115, 135, 157, 182, 210, 239, 273, 310, 350, 392, 440],
            2: [30, 38, 48, 58, 71, 85, 101, 120, 141, 165, 192, 222, 256, 292, 333, 378, 428, 479, 538],
            3: [36, 46, 57, 70, 84, 101, 121, 144, 163, 197, 230, 265, 306, 349, 399, 452, 512, 573, 644],
            4: [42, 54, 68, 83, 99, 120, 143, 170, 200, 234, 271, 313, 362, 412, 471, 534, 604, 676, 759],
            5: [49, 63, 79, 96, 116, 139, 166, 198, 233, 272, 316, 365, 421, 480, 548, 622, 704, 788, 885],
            6: [57, 72, 91, 111, 134, 162, 193, 229, 270, 316, 366, 423, 489, 557, 636, 722, 816, 914, 1026],
            7: [65, 83, 104, 127, 153, 185, 220, 262, 309, 361, 418, 483, 558, 636, 726, 824, 932, 1044, 1172],
            8: [74, 95, 119, 145, 175, 211, 252, 299, 353, 412, 478, 552, 638, 727, 829, 941, 1064, 1192, 1338],
            9: [84, 108, 135, 165, 199, 240, 286, 340, 401, 469, 543, 628, 725, 826, 943, 1070, 1210, 1355, 1522],
            10: [95, 122, 153, 187, 225, 272, 324, 385, 454, 531, 615, 711, 821, 935, 1067, 1211, 1369, 1533, 1722]
        }
    }
};

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
