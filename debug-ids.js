const fs = require('node:fs');

const DEBUG_ID_RE =
  /\/\/# debugId=([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;

// Per-file debugId cache; lazy, null for non-bundle files.
const debugIdCache = new Map();

function debugIdFor(filePath) {
  if (debugIdCache.has(filePath)) return debugIdCache.get(filePath);
  let debugId = null;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const m = content.match(DEBUG_ID_RE);
    if (m) debugId = m[1];
  } catch {
    // ignore unreadable files (node: internals, deleted files, etc.)
  }
  debugIdCache.set(filePath, debugId);
  return debugId;
}

module.exports = { debugIdFor };
