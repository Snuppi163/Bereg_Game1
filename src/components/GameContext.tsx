import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { freshProgress, regenerate } from '../core/progress/ProgressSystem';
import type { Progress } from '../core/progress/ProgressSystem';
import { loadSave, save } from '../core/save/SaveSystem';
import { useGameAudio } from '../utils/useGameAudio';

type Game = {
  progress: Progress; update: (fn: (state: Progress) => Progress) => Promise<void>;
  effect: ReturnType<typeof useGameAudio>; saveError: boolean;
};
const GameContext = createContext<Game | null>(null);

export function GameProvider({ children, fallback, error }: { children:React.ReactNode; fallback:React.ReactNode; error:(retry:()=>void, reset:()=>void)=>React.ReactNode }) {
  const current = useRef<Progress | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const effect = useGameAudio(progress?.settings);
  useEffect(() => {
    let alive = true;
    setLoadError(false);
    void loadSave().then(state => {
      if (alive) {
        current.current = state;
        setProgress(state);
      }
    }).catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [attempt]);

  const update: Game['update'] = async fn => {
    if (!current.current) return;
    const state = fn(current.current);
    if (state === current.current && !saveError) return;
    current.current = state;
    setProgress(state);
    await save(state).then(() => setSaveError(false)).catch(() => setSaveError(true));
  };

  useEffect(() => {
    const tick = () => { void update(regenerate); };
    const interval = setInterval(tick, 1000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, [saveError]);

  const reset = () => {
    const state = freshProgress();
    current.current = state;
    setProgress(state);
    setLoadError(false);
    void save(state).catch(() => setSaveError(true));
  };
  if (!progress) return loadError ? error(() => setAttempt(n => n + 1), reset) : fallback;
  return <GameContext.Provider value={{progress, update, effect, saveError}}>{children}</GameContext.Provider>;
}
export function useGame() {
  const game = useContext(GameContext);
  if (!game) throw new Error('Состояние игры недоступно');
  return game;
}
