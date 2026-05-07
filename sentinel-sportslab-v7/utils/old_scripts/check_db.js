import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlrpqcftufaljpwfsxbt.supabase.co';
const supabaseKey = 'sb_publishable_01xG_1-8lVJgblKRqknhqA_w3CBzAIN';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking remote tables...');

    const tablesToCheck = ['user_data', 'exercises', 'squads', 'players', 'clubs'];

    for (const table of tablesToCheck) {
        const { data, count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table ${table} error or doesn't exist:`, error.message);
        } else {
            console.log(`Table ${table} has ${count} records.`);
        }
    }
}

checkData();
