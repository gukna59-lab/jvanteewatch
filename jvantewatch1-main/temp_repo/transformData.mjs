import fs from 'fs';

const tsContext = fs.readFileSync('src/data/animeData.ts', 'utf-8');

const badTitles = [
  "Атака титанов",
  "Унесённые призраками",
  "Ходячий замок",
  "Человек-бензопила",
  "Ван-Пис",
  "Сад изящных слов",
  "Гуррен-Лаганн",
  "Код Гиас: Лелуш Воскресший",
  "Охотник х Охотник",
  "Re:Zero. Жизнь с нуля в альтернативном мире",
  "Паразит: Учение о жизни"
];

// Just match all object blocks and filter them out
// Each block looks like:
/*
  {
    id: X, title: 'TITLE', ...
    ...
  },
*/

let result = tsContext;

for (const title of badTitles) {
  // Regex to match the block for this title
  // We look for `{` then anything then `title: 'TITLE'` then anything until `  },` or `  }\n];`
  const regex = new RegExp(`\\{\\s*id: \\d+, title: '${title}'.*?\\n\\s*\\},?\\n?`, 'gs');
  result = result.replace(regex, '');
}

// Ensure the last comma in the array is removed before `];` if necessary,
// actually the trailing comma is optional in JS/TS but we can fix double commas or trailing commas.
// JS is fine with trailing comma. Wait, what if the last element was removed? It might leave `},\n];` which is also valid JS array.

// For screenshots replacement:
const updates = [
  {
    title: 'Город, в котором меня нет',
    screenshots: ["https://shikimori.one/system/screenshots/original/1881e4c9f766599447da74d4794ccea55c5d8aae.jpg?1680114126", "https://shikimori.one/system/screenshots/original/cabc54924bb33cfd97b331624734f38b0dc685be.jpg?1680114126", "https://shikimori.one/system/screenshots/original/bea824aa83b5e2bc90f9d2e326c6cc5ba5cd1d2b.jpg?1680114127", "https://shikimori.one/system/screenshots/original/cbd90a97faac6275afa9cb6195630c076a9861dd.jpg?1680114127"]
  },
  {
    title: 'Мастера Меча Онлайн',
    screenshots: ["https://shikimori.one/system/screenshots/original/47c1d5b648e108f97d5344e32055d41017d134da.jpg?1656082680", "https://shikimori.one/system/screenshots/original/3b96f4e0f578a3d6f4220f10f227ea24237cea1a.jpg?1656082681", "https://shikimori.one/system/screenshots/original/29b201eac1257b7b2fda3be25842843be6b82153.jpg?1656082682", "https://shikimori.one/system/screenshots/original/6988c53d1f70d602e57df87571b59f3d8263b136.jpg?1656082682"]
  },
  {
    title: 'ДжоДжо',
    screenshots: ["https://shikimori.one/system/screenshots/original/bc56d7ad4c587532f3791a62ec250fcf00a6c515.jpg?1423532811", "https://shikimori.one/system/screenshots/original/e33d8eab8c79e02f0cf577aa6a5424bbf521c594.jpg?1423532811", "https://shikimori.one/system/screenshots/original/04ce4d6fb0c3cfec010884e4631d9ed18a992275.jpg?1423532811", "https://shikimori.one/system/screenshots/original/22dfe0895675ec44bc13487966e958cf4cd631d4.jpg?1423532812"]
  },
  {
    title: 'Тёмный дворецкий',
    screenshots: ["https://shikimori.one/system/screenshots/original/f3729b47c2bdd420c7af68740a08c89b89bd4180.jpg?1690862181", "https://shikimori.one/system/screenshots/original/e3d5086a359a897f7872aeadf97354af0e491d55.jpg?1690862181", "https://shikimori.one/system/screenshots/original/9d3e075ee93b145927962161bfd3b22088b13198.jpg?1690862182", "https://shikimori.one/system/screenshots/original/c46d1fc234ab6000a220b934388b1ad69dc5e2b0.jpg?1690862183"]
  },
  {
    title: 'Бездомный бог',
    screenshots: ["https://shikimori.one/system/screenshots/original/61599ec39314f848f2318245d14e42f376398572.jpg?1632321263", "https://shikimori.one/system/screenshots/original/9da3c621684b4c798bb2d823ade6a60fab303d50.jpg?1632321264", "https://shikimori.one/system/screenshots/original/ee81498f85691ed63366edf5d0687c6d71196f96.jpg?1632321264", "https://shikimori.one/system/screenshots/original/b42fb42d167cfc2efed757c05be27ba9d65a1453.jpg?1632321264"]
  }
];

for (const up of updates) {
  const screenshotsStr = `screenshots: ${JSON.stringify(up.screenshots)}`;
  const regex = new RegExp(`(title: '${up.title}'.*?screenshots: )\\[.*?\\]`, 's');
  result = result.replace(regex, `$1${JSON.stringify(up.screenshots)}`);
}

fs.writeFileSync('src/data/animeData.ts', result);
console.log("SUCCESS");
