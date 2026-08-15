-- Реквизиты оплаты у турнира и чек об оплате у заявки.
-- Макет `maket/Регистрация на турнир 1.png`, блок «3. Подтверждение оплаты»:
-- организатор указывает, куда и на чьё имя переводить взнос, участник
-- прикладывает чек. Платежи через платформу не проходят — она только
-- показывает реквизиты и хранит подтверждение.
--
-- Все колонки NULL-able и без значения по умолчанию: миграция ничего не
-- переписывает и применяется к заполненной базе без простоя. Существующие
-- турниры остаются без реквизитов, существующие заявки — без чека.

ALTER TABLE "Tournament" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "paymentAccount" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "paymentRecipient" TEXT;

ALTER TABLE "Registration" ADD COLUMN "receiptUrl" TEXT;
