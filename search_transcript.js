/* eslint-disable */
const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\7e566f20-60ec-4f7c-84f7-95bcc9c2eed6\\.system_generated\\logs\\transcript.jsonl';
const outFile = 'C:\\Users\\HP\\Desktop\\agrobozor\\warp_matches.txt';

const rl = readline.createInterface({
  input: fs.createReadStream(logFile),
  crlfDelay: Infinity
});

const matches = [];

rl.on('line', (line) => {
  if (line.includes('warp-cli')) {
    matches.push(line);
  }
});

rl.on('close', () => {
  fs.writeFileSync(outFile, matches.join('\n'));
  console.log(`Successfully wrote ${matches.length} matches to ${outFile}`);
});
