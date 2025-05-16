/**
 * Centralized data directory configuration
 * 
 * This module provides a consistent way to access the data directory path
 * and ensures proper error handling when creating the directory.
 */

import fs from 'fs';
import path from 'path';

// Use DATA_DIR from environment variable or default to a directory in the current working directory
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/**
 * Ensures the data directory exists, with proper error handling
 */
export function ensureDataDirectoryExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`✅ Created data directory: ${DATA_DIR}`);
    } catch (error: any) {
      console.error(`❌ Error creating data directory at ${DATA_DIR}:`);
      console.error(`   ${error.message}`);
      console.error('   Please ensure:');
      console.error('   1. The specified path is valid');
      console.error('   2. The application has write permissions to this location');
      console.error('   3. If using an absolute path like /data, you may need root permissions');
      console.error('   Suggestion: Use a relative path or a path in your home directory');
      console.error('   Example: DATA_DIR=./my-data or DATA_DIR=$HOME/pytest-data');
      
      // Rethrow with more helpful message
      throw new Error(`Failed to create data directory at ${DATA_DIR}. Please check permissions or use a different path.`);
    }
  }
}

/**
 * Gets the path to a file within the data directory
 * @param filename The name of the file
 * @returns The full path to the file
 */
export function getDataFilePath(filename: string): string {
  ensureDataDirectoryExists();
  return path.join(DATA_DIR, filename);
}

/**
 * Ensures a file exists in the data directory, creating it with default content if it doesn't
 * @param filename The name of the file
 * @param defaultContent The default content to write if the file doesn't exist
 */
export function ensureDataFileExists(filename: string, defaultContent: string = '{}'): void {
  const filePath = getDataFilePath(filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent);
  }
}
