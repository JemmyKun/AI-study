import { readFileSync } from 'node:fs';

const s = readFileSync('node_modules/@copilotkit/core/dist/index.d.mts', 'utf8');
for (const key of ['  runAgent(', '  run:', 'interface RunAgentConfig', '  getTools(']) {
  let i = s.indexOf(key);
  console.log('\n=====', key, i);
  if (i !== -1) console.log(s.slice(Math.max(0, i - 700), i + 700));
}
