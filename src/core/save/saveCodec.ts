import { freshProgress } from '../progress/ProgressSystem.ts';
import type { Progress } from '../progress/ProgressSystem.ts';

export function decodeSave(raw: string): Progress {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || !parsed || !('schema' in parsed) || (parsed.schema !== 1 && parsed.schema !== 2)) {
    throw new Error('Неизвестная версия сохранения');
  }
  const stored = parsed as Partial<Progress>;
  const defaults = freshProgress();
  return { ...defaults, ...stored, schema:2, settings:{ ...defaults.settings, ...stored.settings },
    boosters:{ ...defaults.boosters, ...stored.boosters } };
}
