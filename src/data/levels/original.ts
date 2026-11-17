import type { Config, Block, Goal, Point } from '../../core/match3/Match3Engine.ts';
import type { HiddenConfig, ObjectArt, ObjectTarget } from '../../core/hiddenObject/HiddenObjectEngine.ts';

const take = (target: number, count: number): Goal => ({ kind: 'collect', target, count });
const damage = (target: Block, count: number): Goal => ({ kind: 'break', target, count });
const drop = (count: number): Goal => ({ kind: 'drop', count });
const block = (kind: Block, coordinates: Point[], layers = 1) => coordinates.map(at => ({ at, kind, layers }));
const match = (id: number, moves: number, goals: Goal[], extra: Partial<Config> = {}): Config =>
  ({ id, seed:1998, width: 8, height: 8, moves, colors: 6, goals, ...extra });


export const originalMatchLevels: Config[] = [
  match(1, 18, [take(0, 9)], { width: 7, height: 7, colors: 4, tutorial: 'Сдвиньте фишку на соседнюю клетку, чтобы собрать три одинаковые в ряд. Подсвеченные клетки показывают первый ход. Соберите девять ключей.' }),
  match(2, 20, [take(1, 12), take(2, 9)], { colors: 5, tutorial: 'Четыре фишки в ряд превращаются в ракету, пять — в цветную бомбу. Ракету можно запустить новым совпадением.' }),
  match(3, 21, [damage('crate', 4), take(3, 9)], { colors: 5, blocks: block('crate', [[2,3],[3,3],[4,3],[5,3]]), tutorial: 'Собирайте ряды рядом с ящиками, чтобы разбить доски. Ряд в форме угла или буквы Т создаёт бомбу.' }),
  match(4, 21, [damage('web', 5), take(1, 12)], { blocks: block('web', [[1,3],[3,3],[5,3],[3,5],[4,5]]) }),
  match(6, 22, [damage('glass', 6), take(2, 12)], { blocks: block('glass', [[2,3],[3,3],[4,3],[3,4],[4,4],[5,4]], 2) }),
  match(7, 23, [damage('lock', 7), take(4, 12)], { blocks: block('lock', [[2,2],[4,2],[6,2],[1,4],[3,4],[5,4],[4,5]]) }),
  match(8, 24, [drop(2), take(0, 12)], { drops: [[2,0],[5,0]], blocks: block('crate', [[2,4],[5,4]]) }),
  match(9, 25, [damage('crate', 7), damage('web', 5)], { blocks: [...block('crate', [[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[3,5]]), ...block('web', [[1,2],[2,2],[3,2],[4,2],[5,2]])] }),
  match(11, 24, [take(4, 18), damage('glass', 8)], { blocks: block('glass', [[1,2],[2,2],[3,2],[4,2],[3,3],[4,3],[5,3],[6,3]], 2) }),
  match(12, 26, [drop(2), damage('lock', 6)], { seed:2000, drops: [[1,0],[6,0]], blocks: block('lock', [[1,4],[2,4],[3,2],[4,2],[5,4],[6,4]]) }),
  match(13, 26, [damage('web', 8), take(5, 18), take(2, 15)], { blocks: block('web', [[1,1],[3,1],[5,1],[2,3],[4,3],[6,3],[2,5],[5,5]]) }),
  match(14, 28, [drop(2), damage('glass', 8), damage('crate', 6)], {
    seed:1999, drops: [[2,0],[5,0]],
    blocks: [...block('crate', [[1,4],[2,4],[3,4],[4,5],[5,5],[6,5]]), ...block('glass', [[2,2],[3,2],[4,2],[5,2],[2,3],[3,3],[4,3],[5,3]], 2)]
  })
];

const object = (id: ObjectArt, title: string, x: number, y: number, size: number, angle = 0): ObjectTarget =>
  ({ id, title, x, y, size, angle, radius: Math.max(19, size * .52) });

export const originalHiddenLevels: HiddenConfig[] = [
  { id: 5, title: 'Заброшенная кухня', scene: 'kitchen', clue: 'photo', tutorial: 'Касайтесь предметов прямо в комнате. Разведите два пальца, чтобы приблизить сцену. Если застрянете, воспользуйтесь подсказкой.', targets: [
    object('key','Ключ',299,430,37,-20), object('clock','Часы',58,101,51), object('photo','Фотография',285,273,43,9),
    object('spoon','Ложка',122,375,41,56), object('lamp','Керосиновая лампа',318,112,58),
    object('coin','Старая монета',199,399,30), object('letter','Письмо',58,263,52,-9), object('matches','Спички',266,356,41,15)
  ] },
  { id: 10, title: 'Пыльный чердак', scene: 'attic', clue: 'cassette', targets: [
    object('flashlight','Фонарик',256,265,51,33), object('cassette','Кассета',102,391,49,-13),
    object('compass','Компас',205,336,41), object('glasses','Очки',106,253,48,10),
    object('lock','Замок',281,382,46), object('pendant','Медальон',201,149,45,-8),
    object('notebook','Блокнот',71,307,55,12), object('radio','Радиодеталь',321,279,42,42)
  ] },
  { id: 15, title: 'Дом у пристани', scene: 'dock', clue: 'ledger', targets: [
    object('hook','Рыболовный крючок',281,124,44,13), object('map','Карта',78,267,66,-7),
    object('watch','Карманные часы',314,225,46,11), object('rope','Верёвка',59,420,69),
    object('key','Ключ',248,368,44,-22), object('photo','Фотография',170,270,51,9),
    object('battery','Батарейка',116,364,42,48), object('note','Записка',294,320,49,-11)
  ] }
];
