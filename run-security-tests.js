#!/usr/bin/env node

// Simple test runner that bypasses Flow
import { execSync } from 'child_process';

try {
  console.log('Running security tests...\n');
  
  execSync(
    './node_modules/.bin/jest --maxWorkers=4 shared/utils/timeout-bumper.test.js server/db.test.js server/api.test.js server/socket.test.js',
    {
      stdio: 'inherit'
    }
  );
  
  process.exit(0);
} catch (error) {
  process.exit(error.status || 1);
}
