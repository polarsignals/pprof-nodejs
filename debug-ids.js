const fs = require('node:fs');

const DEBUG_ID_RE =
  /\/\/# debugId=([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;

// `//# debugId=<uuid>` is appended at the end of the bundle; tail-read it.
const TAIL_BYTES = 256;

// Per-file debugId cache; lazy, null for non-bundle files.
const debugIdCache = new Map();

function readTail(fd, fileSize) {
  const length = Math.min(TAIL_BYTES, fileSize);
  const buf = Buffer.alloc(length);
  fs.readSync(fd, buf, 0, length, fileSize - length);
  return buf.toString('utf8');
}

function debugIdFor(filePath) {
  if (debugIdCache.has(filePath)) return debugIdCache.get(filePath);
  let debugId = null;
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const { size } = fs.fstatSync(fd);
    const m = readTail(fd, size).match(DEBUG_ID_RE);
    if (m) debugId = m[1];
  } catch {
    // ignore unreadable files (node: internals, deleted files, etc.)
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }
  debugIdCache.set(filePath, debugId);
  return debugId;
}

module.exports = { debugIdFor };
