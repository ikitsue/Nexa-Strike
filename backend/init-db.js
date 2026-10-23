#!/usr/bin/env node

/**
 * Database Initialization Script
 * This script initializes the CS2 Utility database with the required schema
 * Usage: node init-db.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function initializeDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cs2_utility',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('📦 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected successfully');

    // Read and execute main database schema
    console.log('\n📝 Creating database schema...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schemaSql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      try {
        await client.query(statement);
        console.log('  ✓ Statement executed');
      } catch (err) {
        // Ignore errors for CREATE TABLE IF NOT EXISTS or similar
        if (err.message.includes('already exists')) {
          console.log('  ℹ Table/index already exists, skipping');
        } else {
          console.error('  ✗ Error executing statement:', err.message);
        }
      }
    }

    // Read and execute security migrations
    console.log('\n🔒 Running security migrations...');
    const migrationSql = fs.readFileSync(path.join(__dirname, 'migrations_security.sql'), 'utf8');
    
    const migrationStatements = migrationSql.split(';').filter(s => s.trim());
    
    for (const statement of migrationStatements) {
      try {
        await client.query(statement);
        console.log('  ✓ Migration executed');
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('ERROR: column')) {
          console.log('  ℹ Already applied, skipping');
        } else {
          console.error('  ✗ Error executing migration:', err.message);
        }
      }
    }

    console.log('\n✅ Database initialization completed successfully!');
    console.log('\n📊 Database summary:');
    console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  Port: ${process.env.DB_PORT || 5432}`);
    console.log(`  Database: ${process.env.DB_NAME || 'cs2_utility'}`);
    console.log(`  User: ${process.env.DB_USER || 'postgres'}`);
    
    client.release();
  } catch (err) {
    console.error('❌ Database initialization failed:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeDatabase();
