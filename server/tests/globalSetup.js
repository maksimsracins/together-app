const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test'), override: true });

module.exports = async function globalSetup() {
  const serverDir = path.resolve(__dirname, '..');
  const dbFile = path.resolve(serverDir, 'prisma/test.db');
  for (const f of [dbFile, `${dbFile}-journal`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: process.env,
    stdio: 'inherit',
  });
};
