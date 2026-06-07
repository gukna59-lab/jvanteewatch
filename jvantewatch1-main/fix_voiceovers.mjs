import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src', 'data', 'animeData.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/voiceovers:\s*\[.*?\]/g, "voiceovers: ['AniLibria.TV']");

fs.writeFileSync(file, content);
