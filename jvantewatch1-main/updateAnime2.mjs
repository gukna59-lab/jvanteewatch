import fs from 'fs';

let tsContext = fs.readFileSync('src/data/animeData.ts', 'utf-8');

tsContext = tsContext.replace(
  "img: 'https://cdn.myanimelist.net/images/anime/11/53175.jpg',",
  "img: 'https://shikimori.one/system/animes/original/4898.jpg',"
);

tsContext = tsContext.replace(
  "img: 'https://cdn.myanimelist.net/images/anime/9/55447.jpg',",
  "img: 'https://shikimori.one/system/animes/original/20507.jpg',"
);

const added = `  {
    id: 33, title: 'Провожающая в последний путь Фрирен', rating: 9.3, rank: 33, type: 'Сериалы',
    shikimori_id: '52991',
    img: 'https://shikimori.one/system/animes/original/52991.jpg',
    plot: longPlot('Одержав победу над Королём демонов, отряд героя Химмеля вернулся домой.', 'Приключение, растянувшееся на десятилетие, подошло к завершению.'),
    screenshots: ["https://shikimori.one/system/screenshots/original/b8a37b9a2b5e01e581f3313278a4e38bee9a1527.jpg?1696000681","https://shikimori.one/system/screenshots/original/de4d563c7524eb560351c6a166078f0a5f44407c.jpg?1696000683","https://shikimori.one/system/screenshots/original/a222e9ed6510a0b8cb0bc9e9d2291beb306e4b5c.jpg?1696000685","https://shikimori.one/system/screenshots/original/ad4f61192d399270a923c49a6a96b77a7f9343f6.jpg?1696000686"],
    episodes: 28, voiceovers: ['AniLibria.TV'], videoSrc: ''
  },
  {
    id: 34, title: 'Реинкарнация безработного', rating: 8.3, rank: 34, type: 'Сериалы',
    shikimori_id: '39535',
    img: 'https://shikimori.one/system/animes/original/39535.jpg',
    plot: longPlot('Бывает в жизни невезение.', 'Только тридцатичетырёхлетний безработный отаку-бездельник решает взяться за ум, как его насмерть сбивает грузовик.'),
    screenshots: ["https://shikimori.one/system/screenshots/original/b309a4367673eee354fae4b4721b2f72c0a55f1c.jpg?1666552006","https://shikimori.one/system/screenshots/original/a955c64409c218a69d014b01bdf3fc03f4d7580e.jpg?1666552006","https://shikimori.one/system/screenshots/original/ac79962816b0aa63cabb2636bd0dc7fc2b7550f1.jpg?1666552007","https://shikimori.one/system/screenshots/original/5987625ade63b4ead012d3073505990687894d27.jpg?1666552007"],
    episodes: 11, voiceovers: ['AniLibria.TV'], videoSrc: ''
  },
  {
    id: 35, title: 'Синяя тюрьма: Блю Лок', rating: 8.1, rank: 35, type: 'Сериалы',
    shikimori_id: '49596',
    img: 'https://shikimori.one/system/animes/original/49596.jpg',
    plot: longPlot('Осознав плачевное состояние японского футбола, национальная ассоциация решается на отчаянный шаг.', 'На плечах загадочного тренера лежит ответственность привести Японию к победе на чемпионате мира.'),
    screenshots: ["https://shikimori.one/system/screenshots/original/f1caa7b6127bc92a433fc9eb055afd60a2fb39c1.jpg?1665256192","https://shikimori.one/system/screenshots/original/c619d2fef9f414a784a5e660d0529c86ec073230.jpg?1665256192","https://shikimori.one/system/screenshots/original/620746a4994a740f4ea04212a944989eced76c1e.jpg?1665256192","https://shikimori.one/system/screenshots/original/dd26dc89e29a8ae04d4baf89df98308b5148a62c.jpg?1665256193"],
    episodes: 24, voiceovers: ['AniLibria.TV'], videoSrc: ''
  },
  {
    id: 36, title: 'Поднятие уровня в одиночку', rating: 8.2, rank: 36, type: 'Сериалы',
    shikimori_id: '52299',
    img: 'https://shikimori.one/system/animes/original/52299.jpg',
    plot: longPlot('Десять лет назад по всему миру стали открываться некие «врата», ведущие в подземелья с монстрами.', 'Сон Джинву получает шанс стать сильнее и раскрыть все секреты подземелий.'),
    screenshots: ["https://shikimori.one/system/screenshots/original/d9c7661d19f1cf8347aedeec49f743e86db3d071.jpg?1704560122","https://shikimori.one/system/screenshots/original/fc9f87aebf04218fc27cf3ca444fe18559538fbf.jpg?1704560123","https://shikimori.one/system/screenshots/original/d5e4dada624ab28db2bcbd51b18c56d236dce086.jpg?1704560125","https://shikimori.one/system/screenshots/original/61c3502d8f3e141269a0f13e048cc87ad10ee22d.jpg?1704560126"],
    episodes: 12, voiceovers: ['AniLibria.TV'], videoSrc: ''
  },
  {
    id: 37, title: 'Токийские мстители', rating: 7.8, rank: 37, type: 'Сериалы',
    shikimori_id: '42249',
    img: 'https://shikimori.one/system/animes/original/42249.jpg',
    plot: longPlot('Сложно исправить ошибки прошлого.', 'Некоторые — невозможно, но он решает попробовать изменить судьбу.'),
    screenshots: ["https://shikimori.one/system/screenshots/original/54e9c991276a49fd67b22275e1c3c4b31b162755.jpg?1618088991","https://shikimori.one/system/screenshots/original/c53de82d33b5d737b0932624ef51c374be978b3e.jpg?1618088992","https://shikimori.one/system/screenshots/original/46d363140d082219c91aa75bec3d40ab8d650fae.jpg?1618088993","https://shikimori.one/system/screenshots/original/14c0b64d52e5546ce3f9dd53904191696f4d50d6.jpg?1618088993"],
    episodes: 24, voiceovers: ['AniLibria.TV'], videoSrc: ''
  },
  {
    id: 38, title: 'Семья шпиона', rating: 8.2, rank: 38, type: 'Сериалы',
    shikimori_id: '50602',
    img: 'https://shikimori.one/system/animes/original/50602.jpg',
    plot: longPlot('Шпион, убийца и телепат объединяются в одну семью.', 'Их существование — это сплошной обман ради сохранения мира.'),
    screenshots: ["https://shikimori.one/system/screenshots/original/f11fdcd03db19186ea068bd11ab8726d53690b4f.jpg?1664639185","https://shikimori.one/system/screenshots/original/bcf8ad96a9e43ab3e74cc0e76bb03beed61dce93.jpg?1664639186","https://shikimori.one/system/screenshots/original/fc3debba04d4e9c05289f2f7cb43f2766266eae7.jpg?1664639186","https://shikimori.one/system/screenshots/original/b76aea9c24d1b0cc547964e652c6a65b359231be.jpg?1664639187"],
    episodes: 13, voiceovers: ['AniLibria.TV'], videoSrc: ''
  }`;

tsContext = tsContext.replace(/];\s*$/, ',\n' + added + '\n];\n');

fs.writeFileSync('src/data/animeData.ts', tsContext);
console.log("UPDATED");
