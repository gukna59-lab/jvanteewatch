import fs from 'fs';

let tsContext = fs.readFileSync('src/data/animeData.ts', 'utf-8');

tsContext = tsContext.replace(
  /title: 'Наруто',.*?episodes: \d+/s,
  match => match.replace(/episodes: \d+/, 'episodes: 220')
);

tsContext = tsContext.replace(
  /title: 'Блич',.*?episodes: \d+/s,
  match => match.replace(/episodes: \d+/, 'episodes: 366')
);

fs.writeFileSync('src/data/animeData.ts', tsContext);
console.log("EPISODES UPDATED");
