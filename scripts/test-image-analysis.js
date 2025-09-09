#!/usr/bin/env node

/**
 * Test script for restaurant image analysis using OpenAI Vision
 * This script will:
 * 1. Fetch 3 restaurants from Google Places API
 * 2. Get images 2, 3, 4 for each restaurant (9 total)
 * 3. Create a 3x3 grid image
 * 4. Analyze with OpenAI Vision to extract metadata
 */

// Use built-in fetch (Node 18+) or require node-fetch
const fetch = globalThis.fetch || require('node-fetch');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const OpenAI = require('openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_MAPS_API_KEY not found in environment');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Test coordinates (San Francisco downtown)
const TEST_LAT = 37.7749;
const TEST_LNG = -122.4194;

async function fetchRestaurants() {
  console.log('🔍 Fetching restaurants from Google Places API...');
  
  const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
  
  const requestBody = {
    textQuery: 'restaurants',
    locationBias: {
      circle: {
        center: {
          latitude: TEST_LAT,
          longitude: TEST_LNG
        },
        radius: 3000.0
      }
    },
    maxResultCount: 10, // Get more to ensure we have 3 with multiple photos
    languageCode: 'en'
  };
  
  const response = await fetch(placesUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Places API error: ${errorText}`);
  }
  
  const data = await response.json();
  
  // Filter restaurants that have at least 4 photos (so we can get images 2, 3, 4)
  const restaurantsWithPhotos = data.places
    .filter(place => place.photos && place.photos.length >= 4)
    .slice(0, 3); // Take first 3
  
  if (restaurantsWithPhotos.length < 3) {
    console.warn(`⚠️ Only found ${restaurantsWithPhotos.length} restaurants with 4+ photos`);
  }
  
  console.log(`✅ Found ${restaurantsWithPhotos.length} restaurants with sufficient photos`);
  
  return restaurantsWithPhotos;
}

async function downloadImage(photoRef, index) {
  const imageUrl = `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`;
  
  console.log(`📥 Downloading image ${index + 1}...`);
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function createImageGrid(restaurants) {
  console.log('🖼️ Creating 3x3 image grid...');
  
  const images = [];
  const imageInfo = [];
  
  // Download images 2, 3, 4 for each restaurant
  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    console.log(`📍 Processing ${restaurant.displayName?.text || 'Unknown Restaurant'}`);
    
    // Get images at indices 1, 2, 3 (which are the 2nd, 3rd, 4th images)
    for (let photoIndex = 1; photoIndex <= 3; photoIndex++) {
      if (restaurant.photos[photoIndex]) {
        try {
          const imageBuffer = await downloadImage(restaurant.photos[photoIndex].name, images.length);
          const image = await loadImage(imageBuffer);
          images.push(image);
          imageInfo.push({
            restaurantName: restaurant.displayName?.text || 'Unknown Restaurant',
            photoIndex: photoIndex + 1, // Human readable (2nd, 3rd, 4th)
            photoRef: restaurant.photos[photoIndex].name,
            gridPosition: images.length - 1
          });
        } catch (error) {
          console.error(`❌ Failed to download image ${photoIndex + 1} for ${restaurant.displayName?.text}:`, error.message);
        }
      }
    }
  }
  
  if (images.length === 0) {
    throw new Error('No images were successfully downloaded');
  }
  
  console.log(`✅ Downloaded ${images.length} images`);
  
  // Create 3x3 grid with preserved aspect ratios
  const gridSize = 3;
  const cellSize = 400; // Size of each grid cell
  const padding = 10; // Padding between images
  const canvas = createCanvas(gridSize * cellSize, gridSize * cellSize);
  const ctx = canvas.getContext('2d');
  
  // Fill background with white
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Place images in grid with preserved aspect ratios
  for (let i = 0; i < Math.min(images.length, 9); i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const cellX = col * cellSize;
    const cellY = row * cellSize;
    
    const image = images[i];
    const originalWidth = image.width;
    const originalHeight = image.height;
    const originalAspectRatio = originalWidth / originalHeight;
    
    // Calculate dimensions to fit within cell while preserving aspect ratio
    const maxSize = cellSize - (padding * 2);
    let drawWidth, drawHeight;
    
    if (originalAspectRatio > 1) {
      // Landscape: fit to width
      drawWidth = maxSize;
      drawHeight = maxSize / originalAspectRatio;
    } else {
      // Portrait or square: fit to height
      drawHeight = maxSize;
      drawWidth = maxSize * originalAspectRatio;
    }
    
    // Center the image in its cell
    const drawX = cellX + (cellSize - drawWidth) / 2;
    const drawY = cellY + (cellSize - drawHeight) / 2;
    
    // Draw a subtle border around each image
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(cellX + padding/2, cellY + padding/2, cellSize - padding, cellSize - padding);
    
    // Draw the image
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    
    // Add image number in corner for reference
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(cellX + 5, cellY + 5, 25, 20);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText((i + 1).toString(), cellX + 12, cellY + 18);
  }
  
  // Save the grid image
  const outputDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const gridImagePath = path.join(outputDir, 'restaurant-grid.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(gridImagePath, buffer);
  
  console.log(`💾 Saved grid image to: ${gridImagePath}`);
  
  // Save image info for reference
  const infoPath = path.join(outputDir, 'image-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(imageInfo, null, 2));
  
  return { gridImagePath, imageInfo };
}

async function analyzeWithOpenAI(gridImagePath, imageInfo) {
  console.log('🤖 Analyzing images with OpenAI Vision...');
  
  // Read the image file
  const imageBuffer = fs.readFileSync(gridImagePath);
  const base64Image = imageBuffer.toString('base64');
  
  const prompt = `You are helping a restaurant discovery app select the most appetizing photos to showcase to potential customers. These images come from Google Places API for real restaurants, and your analysis will determine which photos get displayed to hungry users browsing for places to eat.

Analyze this 3x3 grid of restaurant images. Each image is numbered in the top-left corner (1-9) and arranged in reading order (left to right, top to bottom). The images preserve their original aspect ratios and are centered within each grid cell.

Your goal: Help identify photos that would make someone want to visit and order from these restaurants. Think like a customer scrolling through options - what would catch your eye and make your mouth water?

For each image in the grid, provide the following metadata in JSON format:

{
  "image_1": {
    "subject": "food|drinks|outside|interior|other",
    "photo_quality": 1-100,
    "appetizing": 1-100,
    "photo_style": "professional|amateur",
    "description": "2-3 word description"
  },
  "image_2": {
    ...
  },
  ...
}

Guidelines:
- subject: "food" for food photos, "drinks" for beverages/cocktails, "outside" for exterior shots, "interior" for inside restaurant, "other" for anything else
- photo_quality: Rate overall image quality (lighting, focus, composition) from 1-100
- appetizing: Rate how appealing/delicious the item looks from 1-100 (relevant for "food" and "drinks" images, use 0 for non-consumable items)
- photo_style: "professional" for restaurant/marketing photos (perfect lighting, styled plating, professional composition) vs "amateur" for customer photos (phone camera, casual angles, authentic but less polished)
- description: Brief 2-3 word description of what's shown

Context for scoring:
- These photos will be the FIRST thing potential customers see when browsing restaurants
- High appetizing scores should go to photos that would make someone immediately want to order
- Consider factors like: freshness, plating presentation, lighting, portion size, color vibrancy
- Food should look delicious, not just technically well-photographed
- Drinks should look refreshing and well-crafted
- Professional photos: Often have perfect lighting and styling but may look "too perfect" or staged
- Amateur photos: More authentic and relatable but may have poor lighting or composition
- Both can be highly appetizing - focus on what would make someone hungry, regardless of photo style
- Remember: you're helping restaurants put their best foot forward to attract hungry customers

The images maintain their original proportions, so you can see the true composition and framing of each photo. Focus on marketing appeal - what would convert a browser into a customer?

Only analyze images that are actually present in the grid. If there are fewer than 9 images, only provide data for the images that exist.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o which has vision capabilities
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1500
    });

    const analysisResult = response.choices[0].message.content;
    
    console.log('✅ OpenAI Analysis Complete');
    console.log('📊 Raw Analysis Result:');
    console.log(analysisResult);
    
    // Save the analysis result
    const outputDir = path.join(process.cwd(), 'test-output');
    const analysisPath = path.join(outputDir, 'analysis-result.json');
    
    // Try to parse as JSON, if it fails save as text
    let parsedResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse as JSON, saving as text');
      parsedResult = { raw_response: analysisResult };
    }
    
    fs.writeFileSync(analysisPath, JSON.stringify(parsedResult, null, 2));
    console.log(`💾 Saved analysis to: ${analysisPath}`);
    
    return parsedResult;
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    throw error;
  }
}

function selectBestImage(analysisResult, imageInfo) {
  console.log('🎯 Selecting best image based on analysis...');
  
  if (!analysisResult || typeof analysisResult !== 'object') {
    console.error('❌ Invalid analysis result');
    return null;
  }
  
  let bestImage = null;
  let bestScore = 0;
  
  // Iterate through the analysis results
  Object.entries(analysisResult).forEach(([imageKey, data]) => {
    if (imageKey.startsWith('image_') && data && typeof data === 'object') {
      const imageIndex = parseInt(imageKey.split('_')[1]) - 1; // Convert to 0-based index
      
      if (imageIndex >= 0 && imageIndex < imageInfo.length) {
        const info = imageInfo[imageIndex];
        
        console.log(`📸 Image ${imageIndex + 1} (${info.restaurantName}):`, {
          subject: data.subject,
          quality: data.photo_quality,
          appetizing: data.appetizing,
          style: data.photo_style,
          description: data.description
        });
        
        // Only consider food and drinks images
        if ((data.subject === 'food' || data.subject === 'drinks') && data.appetizing > bestScore) {
          bestScore = data.appetizing;
          bestImage = {
            ...info,
            analysis: data,
            score: data.appetizing
          };
        }
      }
    }
  });
  
  if (bestImage) {
    console.log('🏆 Best image selected:');
    console.log(`   Restaurant: ${bestImage.restaurantName}`);
    console.log(`   Photo: ${bestImage.photoIndex} (${bestImage.description})`);
    console.log(`   Appetizing Score: ${bestImage.score}/100`);
    console.log(`   Quality Score: ${bestImage.analysis.photo_quality}/100`);
  } else {
    console.log('😞 No suitable food or drinks images found');
  }
  
  return bestImage;
}

async function main() {
  try {
    const startTime = Date.now();
    console.log('🚀 Starting restaurant image analysis test...\n');
    console.log(`⏰ Start time: ${new Date().toLocaleTimeString()}\n`);
    
    // Step 1: Fetch restaurants
    const step1Start = Date.now();
    const restaurants = await fetchRestaurants();
    const step1Time = Date.now() - step1Start;
    console.log(`⏱️ Step 1 (Fetch restaurants): ${step1Time}ms\n`);
    
    if (restaurants.length === 0) {
      console.error('❌ No restaurants found with sufficient photos');
      return;
    }
    
    // Step 2: Create image grid
    const step2Start = Date.now();
    const { gridImagePath, imageInfo } = await createImageGrid(restaurants);
    const step2Time = Date.now() - step2Start;
    console.log(`⏱️ Step 2 (Download images & create grid): ${step2Time}ms\n`);
    
    // Step 3: Analyze with OpenAI
    const step3Start = Date.now();
    const analysisResult = await analyzeWithOpenAI(gridImagePath, imageInfo);
    const step3Time = Date.now() - step3Start;
    console.log(`⏱️ Step 3 (OpenAI Vision analysis): ${step3Time}ms\n`);
    
    // Step 4: Select best image
    const step4Start = Date.now();
    const bestImage = selectBestImage(analysisResult, imageInfo);
    const step4Time = Date.now() - step4Start;
    console.log(`⏱️ Step 4 (Select best image): ${step4Time}ms\n`);
    
    // Total time
    const totalTime = Date.now() - startTime;
    console.log('✅ Test completed successfully!');
    console.log(`⏰ End time: ${new Date().toLocaleTimeString()}`);
    console.log(`🏁 Total execution time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log('\n📊 Performance Breakdown:');
    console.log(`   1. Fetch restaurants: ${step1Time}ms (${((step1Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`   2. Download & grid: ${step2Time}ms (${((step2Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`   3. OpenAI analysis: ${step3Time}ms (${((step3Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`   4. Select best: ${step4Time}ms (${((step4Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`\n📁 Check the test-output directory for results`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
main();
