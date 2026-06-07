import fetch from 'node-fetch';

const targets = [
  { id: 31043, title: 'Город, в котором меня нет' },
  { id: 11757, title: 'Мастера Меча Онлайн' },
  { id: 14719, title: 'ДжоДжо' },
  { id: 4898, title: 'Тёмный дворецкий' },
  { id: 20507, title: 'Бездомный бог' }
];

async function main() {
  for (const t of targets) {
    try {
      const res = await fetch(`https://shikimori.one/api/animes/${t.id}/screenshots`);
      const data = await res.json();
      const urls = data.slice(0, 4).map(d => `https://shikimori.one${d.original}`);
      console.log(`Title: ${t.title}`);
      console.log(`Screenshots: ${JSON.stringify(urls)}\n`);
    } catch (e) {
      console.error(e);
    }
  }
}

main();
