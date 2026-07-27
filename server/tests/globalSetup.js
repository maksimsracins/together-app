const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test'), override: true });

module.exports = async function globalSetup() {
  const serverDir = path.resolve(__dirname, '..');
  // Postgres equivalent of the old "delete the sqlite file" -- drops and
  // recreates the test database's schema fresh, then applies every
  // migration, so each full test run starts from a known-clean state.
  execSync('npx prisma migrate reset --force --skip-generate --skip-seed', {
    cwd: serverDir,
    env: process.env,
    stdio: 'inherit',
  });
};
