#!/usr/bin/env bash
# Обновление приложения на сервере: забрать готовые образы и перезапустить.
#
# Сборка происходит НЕ здесь: образы собирает GitHub Actions и кладёт в GHCR
# (.github/workflows/deploy.yml). На этом VPS `next build` занимал 45+ минут
# и выедал всю память, из-за чего сайт во время деплоя еле отвечал.
#
# Запускается двумя способами и в обоих делает одно и то же:
#   - автоматически из GitHub Actions после пуша в main;
#   - руками на сервере: `cd ~/mydebate && ./deploy/update.sh`
#     (возьмёт тег latest — образ последнего успешного пуша в main).
#
# Миграции применять отдельно не нужно: сервис `migrate` отрабатывает до
# старта нового `web`, поэтому приложение никогда не видит устаревшую схему.

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

# Какой образ разворачиваем. Workflow передаёт SHA коммита — так на сервере
# видно, что именно запущено, и можно откатиться на предыдущий тег. Значение
# пишем в .env: docker compose читает его при подстановке ${IMAGE_TAG}, и
# следующий ручной `docker compose up -d` поднимет ту же версию, а не latest.
IMAGE_TAG="${IMAGE_TAG:-latest}"
if grep -q '^IMAGE_TAG=' .env 2>/dev/null; then
  sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|" .env
else
  printf 'IMAGE_TAG=%s\n' "$IMAGE_TAG" >> .env
fi

echo "==> Скачиваем образы ($IMAGE_TAG)"
docker compose pull --quiet migrate web

echo "==> Перезапускаем"
docker compose up -d

echo "==> Логи миграций"
docker compose logs --no-log-prefix migrate | tail -20

echo "==> Состояние"
docker compose ps

# Каждый деплой оставляет предыдущий образ без тега. На диске VPS это быстро
# превращается в десятки гигабайт (у нас уже было 80% занято).
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
