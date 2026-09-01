-- Ссылка на TikTok турнира.
--
-- В контактах организатора были только Instagram и Telegram, хотя площадки
-- дебатов и MUN ведут аудиторию в основном в Instagram и TikTok. Иконка
-- TikTok в проекте уже была (components/icons/social.tsx) — не хватало поля.
--
-- Колонка NULL-able и без значения по умолчанию: миграция ничего не
-- переписывает и применяется к заполненной базе без простоя.

ALTER TABLE "Tournament" ADD COLUMN "tiktok" TEXT;
