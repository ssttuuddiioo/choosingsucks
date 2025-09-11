#!/usr/bin/env node

/**
 * Test script for Watchmode API integration
 * This script will test the streaming search functionality
 */

const fetch = globalThis.fetch || require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || 'lh96BmCG2RmS1WcVi2zoDZtfN8S81Rnn8yDds468';

async function testWatchmodeAPI() {
  console.log('🎬 Testing Watchmode API integration...\n');
  
  try {
    // Test 1: Get available sources (streaming services)
    console.log('📡 Test 1: Fetching available streaming sources...');
    const sourcesUrl = `https://api.watchmode.com/v1/sources/?apiKey=${WATCHMODE_API_KEY}`;
    
    const sourcesResponse = await fetch(sourcesUrl);
    if (!sourcesResponse.ok) {
      throw new Error(`Sources API error: ${sourcesResponse.status} ${sourcesResponse.statusText}`);
    }
    
    const sources = await sourcesResponse.json();
    console.log(`✅ Found ${sources.length} streaming sources`);
    console.log('Top 10 sources:', sources.slice(0, 10).map(s => `${s.name} (ID: ${s.id})`).join(', '));
    
    // Test 2: Search for popular movies
    console.log('\n🎭 Test 2: Searching for popular movies...');
    const searchUrl = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&types=movie&sort_by=popularity_desc&limit=10`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`Search API error: ${searchResponse.status} ${searchResponse.statusText}`);
    }
    
    const searchResults = await searchResponse.json();
    console.log(`✅ Found ${searchResults.titles.length} popular movies`);
    
    searchResults.titles.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.year}) - Rating: ${movie.user_rating || 'N/A'}`);
    });
    
    // Test 3: Search for TV shows on Netflix
    console.log('\n📺 Test 3: Searching for TV shows on Netflix...');
    const netflixId = 203; // Netflix source ID
    const tvUrl = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&types=tv_series&source_ids=${netflixId}&sort_by=popularity_desc&limit=5`;
    
    const tvResponse = await fetch(tvUrl);
    if (!tvResponse.ok) {
      throw new Error(`TV search API error: ${tvResponse.status} ${tvResponse.statusText}`);
    }
    
    const tvResults = await tvResponse.json();
    console.log(`✅ Found ${tvResults.titles.length} popular TV shows on Netflix`);
    
    tvResults.titles.forEach((show, index) => {
      console.log(`${index + 1}. ${show.title} (${show.year}) - Rating: ${show.user_rating || 'N/A'}`);
    });
    
    // Test 4: Test our API endpoint
    console.log('\n🚀 Test 4: Testing our streaming search API...');
    const testPreferences = {
      contentType: 'both',
      streamingServices: [203, 157], // Netflix and Hulu
      genres: ['comedy', 'action'],
      useAllServices: false
    };
    
    const apiResponse = await fetch('http://localhost:3000/api/streaming-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test-session-123',
        preferences: testPreferences
      })
    });
    
    if (!apiResponse.ok) {
      throw new Error(`API endpoint error: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
    const apiResult = await apiResponse.json();
    console.log(`✅ API endpoint working! Found ${apiResult.candidatesAdded} candidates`);
    
    if (apiResult.candidates && apiResult.candidates.length > 0) {
      console.log('Sample candidates:');
      apiResult.candidates.slice(0, 3).forEach((candidate, index) => {
        console.log(`${index + 1}. ${candidate.title} (${candidate.type}) - ${candidate.year}`);
      });
    }
    
    console.log('\n🎉 All tests passed! Watchmode API integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the tests
testWatchmodeAPI();
