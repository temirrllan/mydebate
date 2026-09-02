// Данные FAQ страницы «Помощь» (app/[locale]/help/page.tsx). Вынесены
// отдельно, чтобы клиентские компоненты поиска/аккордеона (faq-provider/
// faq-search-input/faq-accordion) могли фильтровать один и тот же список.
//
// Здесь только ПОРЯДОК и идентификаторы вопросов. Сами тексты живут в
// словаре (namespace "faq", ключи `<id>Q` и `<id>A`): страница «Помощь»
// открыта поисковику и должна читаться на языке посетителя.
export type FaqId = (typeof FAQ_IDS)[number];

export const FAQ_IDS = [
  "register",
  "account",
  "noTeam",
  "status",
  "edit",
  "paid",
  "whoPublishes",
] as const;

/** Вопрос с уже подставленным переводом — то, с чем работают компоненты. */
export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};
