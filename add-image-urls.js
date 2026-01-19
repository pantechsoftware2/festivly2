#!/usr/bin/env node
/**
 * Add missing columns to projects table in Supabase
 * Run this script to fix the schema error
 */

const { createClient } = require('@supabase/supabase-js');

async function addMissingColumns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('🔧 Adding missing columns to projects table...\n');

    // Run the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
        
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS storage_paths TEXT[] DEFAULT '{}';
        
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
      `,
    });

    if (error) {
      console.error('❌ Error:', error.message);
      
      // If rpc doesn't exist, show manual instructions
      if (error.message.includes('rpc')) {
        console.log('\n📋 Manual Fix Instructions:');
        console.log('1. Open Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Copy and paste the SQL from docs/add-image-urls-column.sql');
        console.log('4. Run the SQL script');
        console.log('\n✅ After that, images will be saved correctly to projects!');
      }
    } else {
      console.log('✅ Successfully added missing columns!');
      console.log('✅ image_urls column added');
      console.log('✅ storage_paths column added');
      console.log('✅ thumbnail_url column added');
      console.log('\n✅ Projects table is now ready for image saving!');
    }
  } catch (error) {
    console.error('❌ Script error:', error.message);
    console.log('\n📋 Manual Fix Instructions:');
    console.log('1. Open Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the SQL from docs/add-image-urls-column.sql');
    console.log('4. Run the SQL script');
  }
}

addMissingColumns();
