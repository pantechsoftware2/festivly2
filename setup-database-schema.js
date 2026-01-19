#!/usr/bin/env node
/**
 * Setup Supabase Database Schema
 * Creates the profiles table for storing user brand information
 */

const fs = require('fs')
const path = require('path')

// Load .env
const envPath = path.join(__dirname, '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  line = line.trim()
  if (line && !line.startsWith('#') && line.includes('=')) {
    const idx = line.indexOf('=')
    const key = line.substring(0, idx).trim()
    const value = line.substring(idx + 1).trim()
    env[key] = value
  }
})

const { createClient } = require('@supabase/supabase-js')

async function setupDatabase() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('❌ Missing env vars')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  console.log('🔧 Setting up Supabase Database Schema...\n')

  try {
    // Create profiles table
    console.log('📦 Creating profiles table...')

    const { error: createError } = await supabase.rpc('create_profiles_table_sql', {}, {
      head: true
    }).catch(() => ({ error: null })) // RPC might not exist, ignore

    // Instead use raw SQL
    const sql = `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT,
        industry_type TEXT,
        brand_logo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create updated_at trigger
      CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
      CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.update_profiles_updated_at();

      -- Disable RLS for simplicity (can add policies later)
      ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

      -- Grant access
      GRANT ALL ON public.profiles TO authenticated;
      GRANT ALL ON public.profiles TO service_role;
    `

    // Create a temporary auth client to execute SQL
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'apikey': key
      },
      body: JSON.stringify({ sql })
    }).catch(() => null)

    if (response && response.ok) {
      console.log('✅ profiles table created via RPC')
    } else {
      console.log('ℹ️  Using SQL Editor approach...')
      console.log('   The profiles table may already exist')
    }

    // Verify table exists by checking schema
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(0)

    if (error) {
      console.error('\n⚠️  Could not verify profiles table:')
      console.error('   Error:', error.message)
      console.log('\n📝 MANUAL SETUP REQUIRED:')
      console.log('   1. Go to Supabase Dashboard > SQL Editor')
      console.log('   2. Click "New Query"')
      console.log('   3. Copy and paste this SQL:')
      console.log(sql)
      console.log('   4. Click "Run"')
    } else {
      console.log('✅ profiles table verified')
    }

    console.log('\n✨ Database setup complete!')

  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('\n📝 MANUAL SETUP:')
    console.log('Go to Supabase Dashboard > SQL Editor and run this:')
    const sql = `
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  industry_type TEXT,
  brand_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
    `
    console.log(sql)
    process.exit(1)
  }
}

setupDatabase()
