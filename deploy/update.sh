#!/usr/bin/env bash
# Обновление приложения на сервере: подтянуть main и пересобрать контейнеры.
#
# Запускается двумя способами и в обоих делает одно и то же:
#   - автоматически из GitHub Actions после пуша в main
#     (.github/workflows/deploy.yml передаёт этот файл в `ssh bash -s`);
#   - руками на сервере: `cd ~/mydebate && ./deploy/update.sh`.
#
# Миграции применять отдельно не нужно: сервис `migrate` из docker-compose.yml
# отрабатывает до старта нового `web`, поэтому приложение никогда не видит
# устаревшую схему.

set -euo pipefail

# Каталог с docker-compose.yml. Через SSH скрипт приходит на stdin, своего
# пути не знает — отсюда переменная (её задаёт workflow) и разумный дефолт.
APP_DIR="${DEPLOY_PATH:-$HOME/mydebate}"
cd "$APP_DIR"

echo "==> Подтягиваем изменения в $APP_DIR"
git fetch --prune origin
# --ff-only, а не reset --hard: если на сервере оказались локальные правки или
# ветка разъехалась, деплой должен упасть с внятной ошибкой, а не молча стереть
# их. Разбираться в такой ситуации нужно руками.
git merge --ff-only origin/main

echo "==> Пересобираем и поднимаем контейнеры"
docker compose up -d --build

echo "==> Логи миграций"
docker compose logs --no-log-prefix migrate | tail -20

echo "==> Состояние"
docker compose ps

# Пересборка каждый раз оставляет предыдущий образ висеть без тега. На диске
# VPS это быстро превращается в десятки гигабайт.
docker image prune -f >/dev/null

# Контейнер `web` стартует только после успешных миграций. Если он не поднялся,
# деплой считается неудачным — иначе Actions покажет зелёную галочку на упавшем
# сайте.
if [ -z "$(docker compose ps --status=running --quiet web)" ]; then
  echo "ОШИБКА: контейнер web не запущен. Логи:" >&2
  docker compose logs --tail=50 web >&2
  exit 1
fi

echo "==> Готово: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"
