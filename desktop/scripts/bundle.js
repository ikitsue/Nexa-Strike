#!/usr/bin/env node

/**
 * Manual bundler for NexaStrike Desktop
 * Bundles JSX files into a single JavaScript file for development
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const publicDir = path.join(__dirname, '../public');
const bundleFile = path.join(publicDir, 'bundle.js');

console.log('📦 Bundling NexaStrike Desktop App...');

// Helper to read and transform JSX file
function readAndTransformFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove ES6 imports - we'll handle dependencies via globals
  content = content.replace(/import\s+\{.*?\}\s+from\s+['"].*?['"];?/g, '');
  content = content.replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '');
  content = content.replace(/export\s+default\s+/g, 'window.$export = ');
  content = content.replace(/export\s+\{(.*?)\}/g, (match, exports) => {
    return exports.split(',').map(e => {
      const name = e.trim();
      return `window.${name} = ${name};`;
    }).join('\n');
  });
  
  return content;
}

// List of files to bundle in order
const filesToBundle = [
  // Store first
  'store/authStore.js',
  // Components
  'components/Layout.js',
  // Pages
  'pages/Login.js',
  'pages/Register.js',
  'pages/Home.js',
  'pages/Profile.js',
  'pages/MapDetail.js',
  'pages/MapEditor.js',
  'pages/Suggestions.js',
  'pages/Admin.js',
  'pages/Download.js',
  'pages/UtilityManager.js',
  // API
  'api/supabaseApi.js',
  // App entry
  'App.js',
  'index.js',
];

// Start bundling
let bundleContent = `// NexaStrike Desktop - Development Bundle
// Auto-generated from source files
// Created at ${new Date().toISOString()}

`;

// Add global declarations
bundleContent += `
// Global React and dependencies
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useContext, useRef } = React;
const { BrowserRouter, Routes, Route, useNavigate, useParams, Link } = window.ReactRouterDOM;

// Zustand for state
const { create } = window.zustand || { create: (fn) => fn({}) };

`;

try {
  filesToBundle.forEach((file) => {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${file}`);
      bundleContent += `\n// ===== ${file} =====\n`;
      bundleContent += readAndTransformFile(filePath);
    } else {
      console.warn(`  ⚠ ${file} not found, skipping`);
    }
  });

  // Write bundle
  fs.writeFileSync(bundleFile, bundleContent);
  console.log(`\n✅ Bundle created: ${bundleFile}`);
  console.log(`📊 Bundle size: ${Math.round(fs.statSync(bundleFile).size / 1024)}KB`);
} catch (err) {
  console.error('❌ Bundling failed:', err);
  process.exit(1);
}
