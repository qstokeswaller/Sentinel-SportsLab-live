export const DEFAULT_WATTBIKE_SESSIONS = [
    {
        id: 'v2_wb1', title: 'SESSION 1 – MULTI-SYSTEM TOP UP', duration: '40 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's1_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F2", type: "Power", rpm: "70-75", resistance: "F2" },
            {
                id: 's1_2', name: "Long Interval", duration: "6'", type: "Interval", rounds: "8",
                subSections: [
                    { id: 's1_2_ss1', label: 'WORK', duration: '30s', rpm: '90–95', resistance: 'F8' },
                    { id: 's1_2_ss2', label: 'REST', duration: '15s', rpm: '70', resistance: 'F1' }
                ]
            },
            { id: 's1_3', name: "Recovery", duration: "2'", target: "60–70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            {
                id: 's1_4', name: "Medium Interval", duration: "7'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's1_4_ss1', label: 'ON', duration: '20s', rpm: '100–110', resistance: 'F8' },
                    { id: 's1_4_ss2', label: 'OFF', duration: '20s', rpm: '70', resistance: 'F4' }
                ]
            },
            { id: 's1_5', name: "Recovery", duration: "2'", target: "60-70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            {
                id: 's1_6', name: "Short Interval", duration: "6'", type: "Interval", rounds: "9",
                subSections: [
                    { id: 's1_6_ss1', label: 'ON', duration: '10s', rpm: '(maximal)', resistance: 'F10' },
                    { id: 's1_6_ss2', label: 'OFF', duration: '30s', rpm: '70', resistance: 'F4' }
                ]
            },
            { id: 's1_7', name: "Long Slow Distance Recovery", duration: "10'", target: "70 RPM F3", type: "Rest", rpm: "70", resistance: "F3" },
            { id: 's1_8', name: "Cool Down", duration: "2'", type: "Rest" }
        ]
    },
    {
        id: 'v2_wb2', title: 'SESSION 2 – AEROBIC BASE + SHORT INTERVALS', duration: '40 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's2_1', name: "Warm Up", duration: "2'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            { id: 's2_2', name: "Long Slow Distance", duration: "9'", target: "90–95 RPM F4", type: "Power", rpm: "90-95", resistance: "F4" },
            { id: 's2_3', name: "Recovery", duration: "2'", target: "60-70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            {
                id: 's2_4', name: "Short Intervals", duration: "10'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's2_4_ss1', label: 'WORK', duration: '20s', rpm: '>110', resistance: 'F8' },
                    { id: 's2_4_ss2', label: 'REST', duration: '40s', rpm: '70–75', resistance: 'F4' }
                ]
            },
            { id: 's2_5', name: "Recovery", duration: "2'", target: "60-70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            {
                id: 's2_6', name: "Build Ups", duration: "10'", type: "Power",
                subSections: [
                    { id: 's2_6_ss1', label: 'BUILD', duration: "2'", rpm: '95–100', resistance: 'F5' },
                    { id: 's2_6_ss2', label: 'BUILD', duration: "3'", rpm: '100–110', resistance: 'F4' },
                    { id: 's2_6_ss3', label: 'RECOVERY', duration: "1'", rpm: '70–75', resistance: 'F1' },
                    { id: 's2_6_ss4', label: 'BUILD', duration: "3'", rpm: '105–110', resistance: 'F3' },
                    { id: 's2_6_ss5', label: 'RECOVERY', duration: "1'", rpm: '70–75', resistance: 'F1' }
                ]
            },
            { id: 's2_7', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb3', title: 'SESSION 3 – HIGH-INTENSITY INTERVAL + BUILD', duration: '40 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's3_1', name: "Warm Up", duration: "2'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's3_2', name: "Interval", duration: "10'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's3_2_ss1', label: 'SPRINT', duration: '40s', rpm: '>95', resistance: 'F6' },
                    { id: 's3_2_ss2', label: 'REST', duration: '20s', rpm: '70–75', resistance: 'F4' }
                ]
            },
            { id: 's3_3', name: "Recovery", duration: "2'", target: "60-70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            {
                id: 's3_4', name: "Build Ups", duration: "9'", type: "Power",
                subSections: [
                    { id: 's3_4_ss1', label: 'BUILD', duration: "2'", rpm: '95–100', resistance: 'F5' },
                    { id: 's3_4_ss2', label: 'BUILD', duration: "3'", rpm: '100–105', resistance: 'F4' },
                    { id: 's3_4_ss3', label: 'RECOVERY', duration: "1'", rpm: '70–75', resistance: 'F1' },
                    { id: 's3_4_ss4', label: 'BUILD', duration: "3'", rpm: '110–115', resistance: 'F3' }
                ]
            },
            { id: 's3_5', name: "Recovery", duration: "2'", target: "60-70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            { id: 's3_6', name: "Long Slow Distance", duration: "10'", target: "90 RPM F4", type: "Power", rpm: "90", resistance: "F4" },
            { id: 's3_7', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb4', title: 'SESSION 4 – AEROBIC POWER WAVES', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's4_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1–2", type: "Power", rpm: "70-75", resistance: "F1-2" },
            {
                id: 's4_2', name: "Wave Intervals", duration: "12'", type: "Interval", rounds: "6",
                subSections: [
                    { id: 's4_2_ss1', label: 'WORK', duration: "1'", rpm: '95–100', resistance: 'F5' },
                    { id: 's4_2_ss2', label: 'WORK', duration: '30s', rpm: '105–110', resistance: 'F6' },
                    { id: 's4_2_ss3', label: 'REST', duration: '30s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's4_3', name: "Recovery", duration: "3'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            {
                id: 's2_4', name: "Short Intervals", duration: "10'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's2_4_ss1', label: 'WORK', duration: '15s', rpm: '>110', resistance: 'F8' },
                    { id: 's2_4_ss2', label: 'REST', duration: '45s', rpm: '70–75', resistance: 'F4' }
                ]
            },
            { id: 's4_5', name: "Long Slow Distance", duration: "10'", target: "90 RPM F3", type: "Power", rpm: "90", resistance: "F3" }
        ]
    },
    {
        id: 'v2_wb5', title: 'SESSION 5 – TEMPO + NEUROMUSCULAR PRIMING', duration: '45 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's5_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            { id: 's5_2', name: "Tempo Block", duration: "10'", target: "90–95 RPM F4", type: "Power", rpm: "90-95", resistance: "F4" },
            { id: 's5_3', name: "Recovery", duration: "2'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            {
                id: 's5_4', name: "Neuromuscular Intervals", duration: "12'", type: "Interval", rounds: "12",
                subSections: [
                    { id: 's5_4_ss1', label: 'MAX', duration: '10s', rpm: 'Max', resistance: 'F9' },
                    { id: 's5_4_ss2', label: 'REST', duration: '50s', rpm: '70', resistance: 'F4' }
                ]
            },
            { id: 's5_5', name: "Recovery", duration: "3'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            {
                id: 's5_6', name: "Build", duration: "8'", type: "Power",
                subSections: [
                    { id: 's5_6_ss1', label: 'BUILD', duration: "4'", rpm: '95–100', resistance: 'F5' },
                    { id: 's5_6_ss2', label: 'BUILD', duration: "4'", rpm: '100–105', resistance: 'F4' }
                ]
            },
            { id: 's5_7', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb6', title: 'SESSION 6 – ANAEROBIC / AEROBIC BLEND', duration: '40 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's6_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's6_2', name: "Long Intervals", duration: "8'", type: "Interval", rounds: "8",
                subSections: [
                    { id: 's6_2_ss1', label: 'WORK', duration: '40s', rpm: '95–100', resistance: 'F6' },
                    { id: 's6_2_ss2', label: 'REST', duration: '20s', rpm: '70', resistance: 'F3' }
                ]
            },
            { id: 's6_3', name: "Recovery", duration: "2'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            {
                id: 's6_4', name: "Medium Intervals", duration: "8'", type: "Interval", rounds: "8",
                subSections: [
                    { id: 's6_4_ss1', label: 'WORK', duration: '20s', rpm: '105–110', resistance: 'F8' },
                    { id: 's6_4_ss2', label: 'REST', duration: '40s', rpm: '70', resistance: 'F4' }
                ]
            },
            { id: 's6_5', name: "Recovery", duration: "2'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            { id: 's6_6', name: "Aerobic Flush", duration: "10'", target: "90 RPM F3", type: "Power", rpm: "90", resistance: "F3" },
            { id: 's6_7', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb7', title: 'SESSION 7 – BUILD & BURN', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's7_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F2", type: "Power", rpm: "70-75", resistance: "F2" },
            {
                id: 's7_2', name: "Progressive Build", duration: "12'", type: "Power",
                subSections: [
                    { id: 's7_2_ss1', label: 'BUILD', duration: "3'", rpm: '90–95', resistance: 'F4' },
                    { id: 's7_2_ss2', label: 'BUILD', duration: "3'", rpm: '95–100', resistance: 'F5' },
                    { id: 's7_2_ss3', label: 'BUILD', duration: "3'", rpm: '100–105', resistance: 'F4' },
                    { id: 's7_2_ss4', label: 'BUILD', duration: "3'", rpm: '105–110', resistance: 'F3' }
                ]
            },
            { id: 's7_3', name: "Recovery", duration: "5'", target: "60 RPM F2", type: "Rest", rpm: "60", resistance: "F2" },
            {
                id: 's7_4', name: "Sprint Support", duration: "10'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's7_4_ss1', label: 'WORK', duration: '15s', rpm: '>110', resistance: 'F9' },
                    { id: 's7_4_ss2', label: 'REST', duration: '45s', rpm: '70', resistance: 'F4' }
                ]
            },
            { id: 's7_5', name: "Long Slow Distance", duration: "8'", target: "90 RPM F3", type: "Power", rpm: "90", resistance: "F3" },
            { id: 's7_6', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb8', title: 'SESSION 8 – OVER / UNDER CONTROL', duration: '45 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's8_1', name: "Warm Up", duration: "5'", target: "60-70 RPM", type: "Power", rpm: "60-70" },
            {
                id: 's8_2', name: "Over / Under Block", duration: "20'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's8_2_ss1', label: 'OVER', duration: "1'", rpm: '95–100', resistance: 'F5' },
                    { id: 's8_2_ss2', label: 'UNDER', duration: '30s', rpm: '105–110', resistance: 'F7' },
                    { id: 's8_2_ss3', label: 'REST', duration: '30s', rpm: '70', resistance: 'F3' }
                ]
            },
            { id: 's8_3', name: "Recovery", duration: "7'", target: "60 RPM F2", type: "Rest", rpm: "60", resistance: "F2" },
            { id: 's8_4', name: "Tempo", duration: "8'", target: "90 RPM F4", type: "Power", rpm: "90", resistance: "F4" },
            { id: 's8_5', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb9', title: 'SESSION 9 – HIGH RPM ECONOMY', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's9_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F2", type: "Power", rpm: "70-75", resistance: "F2" },
            { id: 's9_2', name: "Economy Block", duration: "10'", target: "100–105 RPM F3", type: "Power", rpm: "100-105", resistance: "F3" },
            { id: 's9_3', name: "Recovery", duration: "2'", target: "70–75 RPM F2", type: "Rest", rpm: "70-75", resistance: "F2" },
            {
                id: 's9_4', name: "RPM Surges", duration: "12'", type: "Interval", rounds: "12",
                subSections: [
                    { id: 's9_4_ss1', label: 'WORK', duration: '20s', rpm: '>110', resistance: 'F6' },
                    { id: 's9_4_ss2', label: 'EASY', duration: '40s', rpm: '95', resistance: 'F4' }
                ]
            },
            { id: 's9_5', name: "Recovery", duration: "3'", target: "60-70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            { id: 's9_6', name: "Aerobic Support", duration: "8'", target: "90 RPM F3", type: "Power", rpm: "90", resistance: "F3" },
            { id: 's9_7', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb10', title: 'SESSION 10 – MATCH DAY TOP-UP', duration: '45 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's10_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F2", type: "Power", rpm: "70-75", resistance: "F2" },
            {
                id: 's10_2', name: "Long Intervals", duration: "8'", type: "Interval", rounds: "8",
                subSections: [
                    { id: 's10_2_ss1', label: 'WORK', duration: '30s', rpm: '95–100', resistance: 'F6' },
                    { id: 's10_2_ss2', label: 'REST', duration: '30s', rpm: '70', resistance: 'F3' }
                ]
            },
            { id: 's10_3', name: "Recovery", duration: "2'", target: "60–70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            {
                id: 's10_4', name: "Short Sprints", duration: "10'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's10_4_ss1', label: 'WORK', duration: '10s', rpm: 'MAX', resistance: 'F10' },
                    { id: 's10_4_ss2', label: 'REST', duration: '50s', rpm: '70', resistance: 'F4' }
                ]
            },
            { id: 's10_5', name: "Recovery", duration: "3'", target: "70–75 RPM F1", type: "Rest", rpm: "70-75", resistance: "F1" },
            {
                id: 's10_6', name: "Build & Flush", duration: "12'", type: "Power",
                subSections: [
                    { id: 's10_6_ss1', label: 'BUILD', duration: "6'", rpm: '95–100', resistance: 'F4' },
                    { id: 's10_6_ss2', label: 'FLUSH', duration: "6'", rpm: '90', resistance: 'F3' }
                ]
            },
            { id: 's10_7', name: "Cool Down", duration: "5'", target: "60-70 RPM F1", type: "Rest", rpm: "60-70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb11', title: 'SESSION 11 – CONTINUOUS AEROBIC BASE', duration: '40 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's11_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F2", type: "Power", rpm: "70-75", resistance: "F2" },
            { id: 's11_2', name: "Continuous Ride", duration: "30'", target: "90–95 RPM F3", type: "Power", rpm: "90-95", resistance: "F3" },
            { id: 's11_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb12', title: 'SESSION 12 – AEROBIC BLOCK ENDURANCE', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's12_1', name: "Warm Up", duration: "6'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            {
                id: 's12_2', name: "Aerobic Blocks", duration: "34'", type: "Interval", rounds: "3",
                subSections: [
                    { id: 's12_2_ss1', label: 'WORK', duration: "10'", rpm: '90–95', resistance: 'F4' },
                    { id: 's12_2_ss2', label: 'RECOVERY', duration: "2'", rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's12_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb13', title: 'SESSION 13 – CADENCE CONTROL ENDURANCE', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's13_1', name: "Warm Up", duration: "5'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            {
                id: 's13_2', name: "Cadence Sets", duration: "35'", type: "Interval", rounds: "4",
                subSections: [
                    { id: 's13_2_ss1', label: 'SET', duration: "2'", rpm: '85', resistance: 'F4' },
                    { id: 's13_2_ss2', label: 'SET', duration: "2'", rpm: '90', resistance: 'F4' },
                    { id: 's13_2_ss3', label: 'SET', duration: "2'", rpm: '95', resistance: 'F3' },
                    { id: 's13_2_ss4', label: 'SET', duration: "2'", rpm: '100', resistance: 'F2' },
                    { id: 's13_2_ss5', label: 'REST', duration: "1'", rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's13_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb14', title: 'SESSION 14 – PROGRESSIVE AEROBIC BUILD', duration: '40 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's14_1', name: "Warm Up", duration: "5'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            {
                id: 's14_2', name: "Progressive Ride", duration: "30'", type: "Power",
                subSections: [
                    { id: 's14_2_ss1', label: 'BUILD', duration: "10'", rpm: '85–90', resistance: 'F3' },
                    { id: 's14_2_ss2', label: 'BUILD', duration: "10'", rpm: '90–95', resistance: 'F4' },
                    { id: 's14_2_ss3', label: 'BUILD', duration: "10'", rpm: '95–100', resistance: 'F3' }
                ]
            },
            { id: 's14_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb15', title: 'SESSION 15 – AEROBIC FLUSH & RECOVERY', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's15_1', name: "Warm Up", duration: "5'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            { id: 's15_2', name: "Long Easy Ride", duration: "35'", target: "85–90 RPM F3", type: "Power", rpm: "85-90", resistance: "F3" },
            { id: 's15_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb16', title: 'SESSION 16 – LOW-STRESS ENDURANCE VARIATION', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's16_1', name: "Warm Up", duration: "4'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            {
                id: 's16_2', name: "Aerobic Sets", duration: "31'", type: "Interval", rounds: "4",
                subSections: [
                    { id: 's16_2_ss1', label: 'WORK', duration: "3'", rpm: '90', resistance: 'F3' },
                    { id: 's16_2_ss2', label: 'WORK', duration: "3'", rpm: '95', resistance: 'F4' },
                    { id: 's16_2_ss3', label: 'REST', duration: "1'", rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's16_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb17', title: 'SESSION 17 – LOW-CADENCE AEROBIC CONTROL', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's17_1', name: "Warm Up", duration: "8'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            {
                id: 's17_2', name: "Controlled Endurance", duration: "32'", type: "Interval", rounds: "4",
                subSections: [
                    { id: 's17_2_ss1', label: 'WORK', duration: "6'", rpm: '80–85', resistance: 'F4' },
                    { id: 's17_2_ss2', label: 'REST', duration: "2'", rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's17_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb18', title: 'SESSION 18 – EXTENDED LSD', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's18_1', name: "Warm Up", duration: "5'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            { id: 's18_2', name: "Continuous Ride", duration: "35'", target: "90 RPM F3", type: "Power", rpm: "90", resistance: "F3" },
            { id: 's18_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb19', title: 'SESSION 19 – AEROBIC WAVES (NO INTENSITY)', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's19_1', name: "Warm Up", duration: "8'", target: "60-70 RPM F2", type: "Power", rpm: "60-70", resistance: "F2" },
            {
                id: 's19_2', name: "Aerobic Waves", duration: "32'", type: "Interval", rounds: "4",
                subSections: [
                    { id: 's19_2_ss1', label: 'WORK', duration: "3'", rpm: '85–90', resistance: 'F3' },
                    { id: 's19_2_ss2', label: 'EASY', duration: "1'", rpm: '60-70', resistance: 'F1' },
                    { id: 's19_2_ss3', label: 'WORK', duration: "3'", rpm: '95', resistance: 'F4' },
                    { id: 's19_2_ss4', label: 'EASY', duration: "1'", rpm: '60-70', resistance: 'F1' }
                ]
            },
            { id: 's19_3', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb20', title: 'SESSION 20 – REHAB FRIENDLY ENDURANCE', duration: '45 min', type: 'Conditioning', icon: 'Activity',
        sections: [
            { id: 's20_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            { id: 's20_2', name: "Continuous Ride", duration: "25'", target: "85 RPM F3", type: "Power", rpm: "85", resistance: "F3" },
            { id: 's20_3', name: "Aerobic Flush", duration: "10'", target: "80–85 RPM F2", type: "Power", rpm: "80-85", resistance: "F2" },
            { id: 's20_4', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb21', title: 'SESSION 21 – NEUROMUSCULAR SPRINT PRIMER', duration: '25 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's21_1', name: "Warm Up", duration: "3'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's21_2', name: "Sprint Sets", duration: "16'", type: "Interval", rounds: "3",
                subSections: [
                    { id: 's21_2_ss1', label: 'WORK', duration: '6s', rpm: 'MAX', resistance: 'F9-10' },
                    { id: 's21_2_ss2', label: 'EASY', duration: '54s', rpm: '70', resistance: 'F2' },
                    { id: 's21_2_ss3', label: 'REST', duration: "2'", rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's21_3', name: "Easy Spin", duration: "2'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            { id: 's21_4', name: "Cool Down", duration: "4'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb22', title: 'SESSION 22 – SPEED MAINTENANCE', duration: '30 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's22_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's22_2', name: "Short Sprints", duration: "10'", type: "Interval", rounds: "10",
                subSections: [
                    { id: 's22_2_ss1', label: 'WORK', duration: '8s', rpm: 'MAX', resistance: 'F9' },
                    { id: 's22_2_ss2', label: 'EASY', duration: '52s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's22_3', name: "Easy Spin", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" },
            {
                id: 's22_4', name: "Short Sprints", duration: "5'", type: "Interval", rounds: "5",
                subSections: [
                    { id: 's22_4_ss1', label: 'WORK', duration: '8s', rpm: 'MAX', resistance: 'F9' },
                    { id: 's22_4_ss2', label: 'EASY', duration: '52s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's22_5', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb23', title: 'SESSION 23 – ANAEROBIC POWER REPEATS', duration: '25 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's23_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's23_2', name: "Sprint Block 1", duration: "6'", type: "Interval", rounds: "6",
                subSections: [
                    { id: 's23_2_ss1', label: 'WORK', duration: '5s', rpm: 'MAX', resistance: 'F10' },
                    { id: 's23_2_ss2', label: 'EASY', duration: '55s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's23_3', name: "Easy Spin", duration: "3'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            {
                id: 's23_4', name: "Sprint Block 2", duration: "6'", type: "Interval", rounds: "6",
                subSections: [
                    { id: 's23_4_ss1', label: 'WORK', duration: '5s', rpm: 'MAX', resistance: 'F10' },
                    { id: 's23_4_ss2', label: 'EASY', duration: '55s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's23_5', name: "Cool Down", duration: "5'", target: "70 RPM F1", type: "Rest", rpm: "70", resistance: "F1" }
        ]
    },
    {
        id: 'v2_wb24', title: 'SESSION 24 – ACCELERATION EMPHASIS', duration: '30 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's24_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's24_2', name: "Acceleration Sets", duration: "5'", type: "Interval", rounds: "5",
                subSections: [
                    { id: 's24_2_ss1', label: 'WORK', duration: '10s', rpm: 'MAX', resistance: 'F8–9' },
                    { id: 's24_2_ss2', label: 'EASY', duration: '50s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's24_3', name: "Easy Spin", duration: "2'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            {
                id: 's24_4', name: "Acceleration Sets", duration: "5'", type: "Interval", rounds: "5",
                subSections: [
                    { id: 's24_4_ss1', label: 'WORK', duration: '10s', rpm: 'MAX', resistance: 'F8–9' },
                    { id: 's24_4_ss2', label: 'EASY', duration: '50s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's24_5', name: "Easy Spin", duration: "2'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            {
                id: 's24_6', name: "Acceleration Sets", duration: "5'", type: "Interval", rounds: "5",
                subSections: [
                    { id: 's24_6_ss1', label: 'WORK', duration: '10s', rpm: 'MAX', resistance: 'F8–9' },
                    { id: 's24_6_ss2', label: 'EASY', duration: '50s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's24_7', name: "Cool Down", duration: "6'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" }
        ]
    },
    {
        id: 'v2_wb25', title: 'SESSION 25 – SPRINT + FLUSH', duration: '30 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's25_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's25_2', name: "Sprints", duration: "8'", type: "Interval", rounds: "8",
                subSections: [
                    { id: 's25_2_ss1', label: 'WORK', duration: '10s', rpm: 'MAX', resistance: 'F9' },
                    { id: 's25_2_ss2', label: 'EASY', duration: '50s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's25_3', name: "Recovery", duration: "2'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" },
            { id: 's25_4', name: "Aerobic Flush", duration: "10'", target: "85–90 RPM F3", type: "Power", rpm: "85-90", resistance: "F3" },
            { id: 's25_5', name: "Cool Down", duration: "5'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" }
        ]
    },
    {
        id: 'v2_wb26', title: 'SESSION 26 – MATCHDAY NEURAL TOP-UP', duration: '25 min', type: 'Conditioning', icon: 'Zap',
        sections: [
            { id: 's26_1', name: "Warm Up", duration: "5'", target: "70–75 RPM F1", type: "Power", rpm: "70-75", resistance: "F1" },
            {
                id: 's26_2', name: "Sprints", duration: "6'", type: "Interval", rounds: "6",
                subSections: [
                    { id: 's26_2_ss1', label: 'WORK', duration: '6s', rpm: 'MAX', resistance: 'F9' },
                    { id: 's26_2_ss2', label: 'EASY', duration: '54s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's26_3', name: "Easy Spin", duration: "5'", target: "60–70 RPM F2", type: "Rest", rpm: "60-70", resistance: "F2" },
            {
                id: 's26_4', name: "Sprints", duration: "4'", type: "Interval", rounds: "4",
                subSections: [
                    { id: 's26_4_ss1', label: 'WORK', duration: '6s', rpm: 'MAX', resistance: 'F9' },
                    { id: 's26_4_ss2', label: 'EASY', duration: '54s', rpm: '70', resistance: 'F2' }
                ]
            },
            { id: 's26_5', name: "Cool Down", duration: "5'", target: "70 RPM F2", type: "Rest", rpm: "70", resistance: "F2" }
        ]
    }
];
