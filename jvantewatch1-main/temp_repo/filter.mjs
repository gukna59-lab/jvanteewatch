import fs from 'fs';
import fetch from 'node-fetch';

const tsContext = fs.readFileSync('src/data/animeData.ts', 'utf-8');

// I'll just write a script to query API
const titles = [
  "Атака титанов", "Тетрадь смерти", "Стальной алхимик: Братство",
  "Унесённые призраками", "Твоё имя", "Киберпанк: Бегущие по краю",
  "Ванпанчмен", "Евангелион", "Врата Штейна", "Ходячий замок",
  "Человек-бензопила", "Магическая битва", "Клинок, рассекающий демонов",
  "Волейбол!!", "Моя геройская академия", "Ван-Пис", "Наруто", "Блич",
  "Моб Психо 100", "Монстр", "Сад изящных слов", "Вайолет Эвергарден",
  "Гуррен-Лаганн", "Код Гиас: Лелуш Воскресший", "Охотник х Охотник",
  "Re:Zero. Жизнь с нуля в альтернативном мире", "Город, в котором меня нет",
  "Мастера Меча Онлайн", "Паразит: Учение о жизни", "ДжоДжо",
  "Тёмный дворецкий", "Бездомный бог"
];

async function test(title) {
  const searchUrl = new URL('https://anilibria.top/api/v1/app/search/releases');
  searchUrl.searchParams.set('query', title);
  try {
    const res = await fetch(searchUrl.toString());
    const json = await res.json();
    if (json.length === 0) return false;
    // Check if it's actually similar
    const nameMatch = json.find((r) => {
        if (!r.name) return false;
        const mainName = r.name.main?.toLowerCase();
        const engName = r.name.english?.toLowerCase();
        const altName = r.name.alternative?.toLowerCase();
        const query = title.toLowerCase();
        
        return mainName?.includes(query) || 
               engName?.includes(query) || 
               altName?.includes(query);
      });
      return nameMatch ? true : false;
  } catch(e) {
    return false;
  }
}

async function main() {
  for (const t of titles) {
    const has = await test(t);
    if (!has) {
      console.log("NO_ANILIBRIA:", t);
    }
  }
}

main();
