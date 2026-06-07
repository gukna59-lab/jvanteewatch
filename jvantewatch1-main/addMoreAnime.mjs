import fs from 'fs';
import fetch from 'node-fetch';

const tsContext = fs.readFileSync('src/data/animeData.ts', 'utf-8');

const targets = [
  "Магическая битва 2 сезон",
  "Восхождение в тени",
  "Милый во Франксе",
  "Невероятное приключение ДжоДжо: Каменный океан",
  "Тетрадь дружбы Нацумэ",
  "Обещанный Неверленд",
  "Доктор Стоун"
];

async function main() {
  const results = [];
  
  for (const t of targets) {
    try {
      const searchRes = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(t)}&limit=1`);
      const searchData = await searchRes.json();
      
      if (searchData.length === 0) continue;
      const shiki = searchData[0];
      
      const detailsRes = await fetch(`https://shikimori.one/api/animes/${shiki.id}`);
      const details = await detailsRes.json();
      
      const screensRes = await fetch(`https://shikimori.one/api/animes/${shiki.id}/screenshots`);
      const screensData = await screensRes.json();
      const screenshots = screensData.slice(0, 4).map(s => `https://shikimori.one${s.original}`);
      
      const plotArray = details.description ? details.description.split('. ').slice(0, 2).map(s => s + (s.endsWith('.') ? '' : '.')) : ['Описание отсутствует.', ''];
      
      results.push({
        title: shiki.russian || shiki.name,
        rating: Math.round(shiki.score * 10) / 10 || 8.0,
        shikimori_id: String(shiki.id),
        img: `https://shikimori.one${shiki.image.original}`,
        plot: plotArray,
        screenshots,
        episodes: details.episodes || 12
      });
    } catch (e) {
      console.log('Error for', t, e.message);
    }
  }
  
  let newText = tsContext;
  let maxId = 38; // last was 38
  const itemsStr = results.map(a => {
    maxId++;
    return `  {
    id: ${maxId}, title: '${a.title.replace(/'/g, "\\'")}', rating: ${a.rating}, rank: ${maxId}, type: 'Сериалы',
    shikimori_id: '${a.shikimori_id}',
    img: '${a.img}',
    plot: longPlot('${a.plot[0]}', '${a.plot[1]}'),
    screenshots: ${JSON.stringify(a.screenshots)},
    episodes: ${a.episodes}, voiceovers: ['AniLibria.TV'], videoSrc: ''
  }`;
  }).join(',\n');
  
  newText = newText.replace(/\n\];\s*$/, `,\n${itemsStr}\n];\n`);
  fs.writeFileSync('src/data/animeData.ts', newText);
  console.log("MORE ANIME ADDED");
}

main();
