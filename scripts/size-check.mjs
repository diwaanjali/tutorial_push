import fs from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB limit
const rootDir = process.cwd();

function getDirSize(dir) {
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Ignore node_modules
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      total += getDirSize(fullPath);
    } else if (entry.isFile()) {
      try {
        const stats = fs.statSync(fullPath);
        total += stats.size;
      } catch {
        // Skip unreadable files
      }
    }
  }

  return total;
}

const totalBytes = getDirSize(rootDir);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
const limitMB = (MAX_BYTES / (1024 * 1024)).toFixed(2);

console.log(`Repository size (including .git, excluding node_modules): ${totalMB} MB / ${limitMB} MB`);

if (totalBytes > MAX_BYTES) {
  console.error(`❌ FAILED: Repo size (${totalMB} MB) exceeds maximum allowed limit (${limitMB} MB)!`);
  process.exit(1);
} else {
  console.log(`✅ PASSED: Repo size is safely within the 5 MB limit.`);
  process.exit(0);
}

