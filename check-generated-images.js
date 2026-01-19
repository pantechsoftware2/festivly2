#!/usr/bin/env node

/**
 * Diagnostic script to check generated images in Supabase storage
 * Usage: node check-generated-images.js
 * 
 * Shows file sizes to determine if images are:
 * - Real generated images (900KB+)
 * - Placeholder SVGs (1.14KB) = generation failed
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkGeneratedImages() {
  const userId = '2267790f-f364-4e1b-af6f-54e79890e685'; // pantechsoftware2@gmail.com
  const bucketName = 'images';
  const folder = `generated/${userId}`;

  console.log(`\n📁 Checking images in: ${bucketName}/${folder}\n`);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(folder, {
      limit: 100,
      sortBy: { column: 'name', order: 'desc' },
    });

  if (error) {
    console.error('❌ Error reading storage:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No images found in storage');
    return;
  }

  console.log(`Found ${data.length} images:\n`);

  let realImages = 0;
  let placeholders = 0;

  data.forEach((file, index) => {
    const sizeKB = (file.metadata.size / 1024).toFixed(2);
    const isPlaceholder = file.metadata.size < 5000; // Less than 5KB = likely placeholder
    const status = isPlaceholder ? '❌ PLACEHOLDER' : '✅ REAL';

    console.log(`${index + 1}. ${file.name}`);
    console.log(`   Size: ${sizeKB} KB ${status}`);
    console.log(
      `   URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${folder}/${file.name}\n`
    );

    if (isPlaceholder) {
      placeholders++;
    } else {
      realImages++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Real images: ${realImages}`);
  console.log(`   Placeholders: ${placeholders}`);

  if (placeholders > 0) {
    console.log(
      `\n⚠️  Found ${placeholders} placeholder images!`
    );
    console.log(`   This means Vertex AI image generation is failing.`);
    console.log(`   Check: GOOGLE_SERVICE_ACCOUNT_KEY in Vercel environment variables`);
  } else if (realImages > 0) {
    console.log(`\n✅ All images are real generated images!`);
    console.log(`   Vertex AI is working correctly.`);
  }
}

checkGeneratedImages().catch(console.error);
