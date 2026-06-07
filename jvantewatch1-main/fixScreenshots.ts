import fs from 'fs';
import https from 'https';

const code = fs.readFileSync('src/data/animeData.ts', 'utf-8');
const match = code.match(/export const animeData: Anime\[\] = (\[[\s\S]*\]);/);
if (!match) throw new Error('Could not parse animeData.ts');

const animeData = JSON.parse(match[1]);

function fetchJson(url: string, options: https.RequestOptions = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { ...options, headers: { 'User-Agent': 'Jvante app script', ...options.headers } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) resolve({ error: res.statusCode, body });
            else resolve(JSON.parse(body));
          } catch (e) {
            resolve({ error: 'parse', body });
          }
        });
      });
      req.on('error', (err) => resolve({ error: err.message }));
      req.end();
    });
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log('Fetching missing screenshots...');
    let fetched = 0;
    
    for (let i = 0; i < animeData.length; i++) {
        const item = animeData[i];
        if (!item.screenshots || item.screenshots.length === 0) {
            if (item.shikimori_id) {
                console.log(`Fetching ${item.shikimori_id}...`);
                const data = await fetchJson(`https://shikimori.one/api/animes/${item.shikimori_id}/screenshots`);
                if (Array.isArray(data)) {
                    item.screenshots = data.slice(0, 4).map((s: any) => `https://shikimori.one${s.original}`);
                    fetched++;
                } else {
                    console.log(`Failed ${item.shikimori_id}:`, data.error);
                }
                await delay(350); // Be gentle with Shikimori api
            }
        }
    }

    const outCode = `export interface Anime {
  id: number;
  title: string;
  rating: number;
  rank: number;
  img: string;
  type: 'Сериалы' | 'Фильмы' | 'ONA';
  plot: string;
  screenshots: string[];
  episodes: number;
  voiceovers: string[];
  videoSrc: string;
  shikimori_id: string;
}

export const animeData: Anime[] = ${JSON.stringify(animeData, null, 2)};
`;
    fs.writeFileSync('src/data/animeData.ts', outCode);
    console.log('Screenshots populated! Added:', fetched);
}

main().catch(console.error);
