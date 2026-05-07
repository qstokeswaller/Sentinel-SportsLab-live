import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlrpqcftufaljpwfsxbt.supabase.co';
const supabaseKey = 'sb_publishable_01xG_1-8lVJgblKRqknhqA_w3CBzAIN';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting schemas...');

    // We can use a trick to get column names by selecting 1 row and checking object keys
    const tables = ['user_data', 'exercises', 'squads', 'players', 'clubs', 'teams', 'athletes', 'scheduled_sessions'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table}: Not found or error: ${error.message}`);
        } else {
            console.log(`Table ${table}: Found.`);
            if (data && data.length > 0) {
                console.log(`Columns for ${table}:`, Object.keys(data[0]));
            } else {
                console.log(`Table ${table} is empty, cannot easily inspect columns via SDK.`);
            }
        }
    }
}

inspectSchema();
