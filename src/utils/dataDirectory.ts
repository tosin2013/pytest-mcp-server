/**
 * Centralized data directory configuration
 * 
 * This module provides a consistent way to access the data directory path
 * and ensures proper error handling when creating the directory.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// Determine the default data directory based on the OS
function getDefaultDataDir(): string {
  try {
    // Try to use a directory in the user's home folder first for better permissions
    const homeDir = os.homedir();
    return path.join(homeDir, '.pytest-mcp-server');
  } catch (error) {
    // Fallback to current working directory if home directory is not accessible
    return path.join(process.cwd(), 'data');
  }
}

// Use DATA_DIR from environment variable or use the default
export const DATA_DIR = process.env.DATA_DIR || getDefaultDataDir();

/**
 * Tests if a directory is writable by attempting to create a temporary file
 * @param dirPath Directory path to test
 * @returns True if writable, false otherwise
 */
function isDirectoryWritable(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      return false;
    }
    
    const testFile = path.join(dirPath, `.write-test-${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Finds a writable data directory, trying multiple locations if needed
 * @returns Path to a writable directory
 */
export function findWritableDataDir(): string {
  // First, check if the configured DATA_DIR is writable
  if (isDirectoryWritable(DATA_DIR)) {
    return DATA_DIR;
  }
  
  // Try to create the configured directory
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (isDirectoryWritable(DATA_DIR)) {
      console.log(`✅ Created data directory: ${DATA_DIR}`);
      return DATA_DIR;
    }
  } catch (error) {
    // Continue to fallback options
  }
  
  // Try fallback locations in order of preference
  const fallbackLocations = [
    path.join(os.homedir(), '.pytest-mcp-server'),
    path.join(os.tmpdir(), 'pytest-mcp-server'),
    path.join(process.cwd(), 'data')
  ];
  
  for (const location of fallbackLocations) {
    try {
      if (!fs.existsSync(location)) {
        fs.mkdirSync(location, { recursive: true });
      }
      
      if (isDirectoryWritable(location)) {
        console.log(`⚠️ Using fallback data directory: ${location}`);
        console.log(`   Original directory ${DATA_DIR} was not writable`);
        process.env.DATA_DIR = location; // Update environment variable
        return location;
      }
    } catch (error) {
      // Try next location
    }
  }
  
  // If we get here, we couldn't find any writable location
  console.error(`❌ Critical error: Could not find any writable data directory`);
  console.error(`   Tried: ${DATA_DIR} and fallback locations`);
  console.error(`   Server will continue but data persistence will not work`);
  
  // Return the original directory even though it's not writable
  // The application will handle file operation errors gracefully
  return DATA_DIR;
}

// Store the actual data directory we're using after checking writability
const ACTUAL_DATA_DIR = findWritableDataDir();

/**
 * Ensures the data directory exists, with proper error handling
 * @returns True if directory exists and is writable, false otherwise
 */
export function ensureDataDirectoryExists(): boolean {
  try {
    if (!fs.existsSync(ACTUAL_DATA_DIR)) {
      fs.mkdirSync(ACTUAL_DATA_DIR, { recursive: true });
    }
    return isDirectoryWritable(ACTUAL_DATA_DIR);
  } catch (error: any) {
    console.error(`❌ Error with data directory at ${ACTUAL_DATA_DIR}:`);
    console.error(`   ${error.message}`);
    console.error('   Please ensure:');
    console.error('   1. The specified path is valid');
    console.error('   2. The application has write permissions to this location');
    console.error('   3. If using an absolute path like /data, you may need root permissions');
    console.error('   Suggestion: Use a relative path or a path in your home folder');
    console.error('   Example: DATA_DIR=./my-data or DATA_DIR=$HOME/pytest-data');
    return false;
  }
}

/**
 * Gets the path to a file within the data directory
 * @param filename The name of the file
 * @returns The full path to the file
 */
export function getDataFilePath(filename: string): string {
  ensureDataDirectoryExists();
  return path.join(ACTUAL_DATA_DIR, filename);
}

/**
 * Ensures a file exists in the data directory, creating it with default content if it doesn't
 * @param filename The name of the file
 * @param defaultContent The default content to write if the file doesn't exist
 * @returns True if successful, false if file could not be created/accessed
 */
export function ensureDataFileExists(filename: string, defaultContent: string = '{}'): boolean {
  try {
    const filePath = getDataFilePath(filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultContent);
    }
    return true;
  } catch (error: any) {
    console.error(`❌ Error accessing data file ${filename}: ${error.message}`);
    return false;
  }
}
