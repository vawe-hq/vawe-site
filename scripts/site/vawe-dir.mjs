// The engine checkout, for the scripts that render films or read prompts/moves. It is a sibling checkout of
// vawe-hq/vawe at ../vawe by default, or the folder in VAWE_DIR. The prebuild never needs it.
import fs from 'node:fs';
import path from 'node:path';

export const vaweDirIfPresent = (root) => {
  const dir = path.resolve(process.env.VAWE_DIR || path.join(root, '..', 'vawe'));
  return fs.existsSync(path.join(dir, 'bin', 'vawe')) ? dir : null;
};

export const vaweDir = (root) => {
  const dir = vaweDirIfPresent(root);
  if (!dir) {
    console.error('✗ this script needs a vawe-hq/vawe checkout. Clone it next to this repo (../vawe), or set VAWE_DIR.');
    process.exit(1);
  }
  return dir;
};
