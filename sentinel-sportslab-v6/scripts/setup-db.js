/**
 * TrainerOS – One-time Database Setup
 * Run: node setup-db.js <DATABASE_PASSWORD>
 */
import pg from 'pg';
const { Client } = pg;

const DB_PASS = process.argv[2];
if (!DB_PASS) {
    console.error('\n❌ Usage: node setup-db.js YOUR_PASSWORD\n');
    process.exit(1);
}

const SQL = `
CREATE TABLE IF NOT EXISTS public.user_data (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key         TEXT        NOT NULL,
    value       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_data_user_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_data_user_key
    ON public.user_data (user_id, key);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_data'
      AND policyname = 'Users manage their own data'
  ) THEN
    CREATE POLICY "Users manage their own data"
      ON public.user_data
      FOR ALL
      USING  (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
`;

const client = new Client({
    host: 'db.zlrpqcftufaljpwfsxbt.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASS,
    ssl: { rejectUnauthorized: false }
});

try {
    console.log('\n🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('⚙️  Running migration...');
    await client.query(SQL);
    console.log('✅ Migration complete! user_data table is ready.\n');
    console.log('👉 Restart npm run dev to pick up the .env.local changes.\n');
} catch (err) {
    console.error('\n❌ Migration failed:', err.message);
} finally {
    await client.end();
}
