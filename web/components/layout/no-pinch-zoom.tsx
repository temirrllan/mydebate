"use client";

import { useEffect } from "react";

/**
 * Запрет масштабирования щипком на iOS.
 *
 * Мета-тега viewport (`maximum-scale=1, user-scalable=no`, см. export
 * `viewport` в app/layout.tsx) хватает Chrome на Android, но Safari на iOS
 * с 10-й версии оба этих поля игнорирует — специально, чтобы страница не
 * могла отнять у пользователя зум. Единственное, что там ещё работает, —
 * нестандартные события `gesturestart`/`gesturechange`/`gestureend`: их
 * Safari шлёт на многопальцевые жесты, и отмена гасит зум.
 *
 * `dblclick` глушим отдельно — двойное касание масштабирует мимо gesture-событий.
 * Обычный скролл и нажатия не затрагиваются: одним пальцем этих событий нет.
 *
 * Компонент ничего не рисует, только вешает слушатели, поэтому монтируется
 * один раз в корневом layout.
 */
export function NoPinchZoom() {
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();

    // passive: false обязателен — иначе браузер вправе проигнорировать
    // preventDefault у сенсорных событий, и жест всё равно отработает.
    const options = { passive: false } as const;

    document.addEventListener("gesturestart", block, options);
    document.addEventListener("gesturechange", block, options);
    document.addEventListener("gestureend", block, options);
    document.addEventListener("dblclick", block, options);

    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
      document.removeEventListener("gestureend", block);
      document.removeEventListener("dblclick", block);
    };
  }, []);

  return null;
}
