#!/usr/bin/env node
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
let failed = false;
for (const test of ['test-search.js', 'test-browser.js']) {
  console.log('\n━━━ ' + test + ' ━━━');
  const r = spawnSync(process.execPath, [path.join(__dirname, test)], {stdio:'inherit', env:process.env});
  if (r.error || r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
