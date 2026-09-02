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

# --- Освобождаем место ДО всего остального -------------------------------
#
# Порядок здесь не косметика. Раньше чистка стояла в самом конце скрипта, и
# когда диск кончался, деплой падал раньше, чем до неё доходил: `git fetch`
# сдыхал с "unable to create temporary file: No space left on device", а
# накопившиеся образы так и оставались лежать. Диск чинить приходилось руками.
#
# Что копится: каждый деплой скачивает образ с тегом коммита. `docker image
# prune -f` их не трогает — он удаляет только образы БЕЗ тега, а у этих тег
# есть. За десяток деплоев набегают гигабайты.
echo "==> Убираем образы прошлых версий"
docker images --filter=reference='ghcr.io/*/mydebate/*' --format '{{.Repository}}:{{.Tag}}' \
  | grep -v -e ":${IMAGE_TAG:-latest}\$" -e ':latest$' \
  | xargs -r docker rmi -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true
# Кэш сборки остался с тех времён, когда образы собирались прямо здесь.
docker builder prune -f >/dev/null 2>&1 || true

df -h "$APP_DIR" | tail -1 | awk '{print "==> Свободно на диске: " $4 " (занято " $5 ")"}'

echo "==> Подтягиваем изменения в $APP_DIR"

# Репозиторий публичный, поэтому забираем изменения АНОНИМНО, вычистив из
# адреса remote возможные «user@» или «user:token@».
#
# Зачем: если в адресе прописан пользователь, git считает, что нужна
# авторизация, и просит пароль. На сервере терминала нет — деплой падает с
# «could not read Username for 'https://github.com'». Один раз так и вышло:
# сборка прошла, образы уехали в GHCR, а сервер не смог сделать fetch.
#
# GIT_TERMINAL_PROMPT=0 — чтобы при любой другой проблеме с доступом деплой
# падал сразу с внятной ошибкой, а не висел в ожидании ввода.
REMOTE_URL="$(git remote get-url origin)"
ANON_URL="$(printf '%s' "$REMOTE_URL" | sed -E 's#(https://)[^@/]*@#\1#')"

# `-c credential.helper=` отключает сохранённые учётные данные ТОЛЬКО для этой
# команды. Без этого git отправляет то, что лежит в хранилище (например,
# протухший токен), GitHub отвечает 401 — и запрос к ПУБЛИЧНОМУ репозиторию,
# который прошёл бы анонимно, превращается в требование логина.
if ! GIT_TERMINAL_PROMPT=0 git -c credential.helper= fetch --prune "$ANON_URL" main; then
  echo "ОШИБКА: не удалось забрать изменения из $ANON_URL." >&2
  echo "Проверьте на сервере: git -C $APP_DIR remote -v && git -C $APP_DIR fetch origin" >&2
  exit 1
fi

# --ff-only, а не reset --hard: если на сервере оказались локальные правки или
# ветка разъехалась, деплой должен упасть с внятной ошибкой, а не молча стереть
# их. Разбираться в такой ситуации нужно руками.
git merge --ff-only FETCH_HEAD

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

# Контейнер `web` стартует только после успешных миграций. Если он не поднялся,
# деплой считается неудачным — иначе Actions покажет зелёную галочку на упавшем
# сайте.
if [ -z "$(docker compose ps --status=running --quiet web)" ]; then
  echo "ОШИБКА: контейнер web не запущен. Логи:" >&2
  docker compose logs --tail=50 web >&2
  exit 1
fi

echo "==> Готово: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"
