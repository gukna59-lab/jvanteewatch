import fs from 'fs';

let tsContext = fs.readFileSync('src/data/animeData.ts', 'utf-8');

tsContext = tsContext.replace(/\r?\n/g, '\\n');

// Actually wait, I can just replace literal newlines strictly inside longPlot
// Or I can rewrite it via a simple regex
// Let's just do it directly.

let original = fs.readFileSync('src/data/animeData.ts', 'utf-8');
const fixed = original.replace(/plot: longPlot\('([^']*)', '([^']*)'\),/g, (match, p1, p2) => {
  return `plot: longPlot('${p1.replace(/\r?\n/g, ' ')}', '${p2.replace(/\r?\n/g, ' ')}'),`;
});

fs.writeFileSync('src/data/animeData.ts', fixed);
console.log("FIXED STRINGS");
