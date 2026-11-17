import { freshProgress } from '../progress/ProgressSystem.ts';
import type { Progress } from '../progress/ProgressSystem.ts';

export function decodeSave(raw: string): Progress {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || !parsed || !('schema' in parsed) || ![1,2,3].includes(Number(parsed.schema))) {
    throw new Error('Неизвестная версия сохранения');
  }
  const stored = parsed as Partial<Progress>;
  const defaults = freshProgress();
  return { ...defaults, ...stored, schema:3, settings:{ ...defaults.settings, ...stored.settings },
    boosters:{ ...defaults.boosters, ...stored.boosters },
    quests:{ ...defaults.quests,...stored.quests },farm:{ ...defaults.farm,...stored.farm } };
}
