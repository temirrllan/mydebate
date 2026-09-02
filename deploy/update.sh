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
# адреса remote возможные «user@» или «user:token@», и не отправляя ничего из
# хранилища учётных данных (`-c credential.helper=`): протухший токен там
# превращает анонимный запрос, который прошёл бы, в отказ с требованием
# логина. GIT_TERMINAL_PROMPT=0 — чтобы при проблеме с доступом упасть сразу,
# а не повиснуть в ожидании ввода.
REMOTE_URL="$(git remote get-url origin)"
ANON_URL="$(printf '%s' "$REMOTE_URL" | sed -E 's#(https://)[^@/]*@#\1#')"

# НЕУДАЧНЫЙ FETCH НЕ ОСТАНАВЛИВАЕТ ВЫКАТКУ — осознанное решение.
#
# Само приложение приезжает готовым образом из GHCR, а репозиторий на сервере
# нужен только ради docker-compose.yml, Caddyfile и скриптов в deploy/. Когда
# доступ к git с сервера сломан (так было: он требовал логин к публичному
# репозиторию), блокировать этим обновление приложения хуже, чем развернуть
# новый образ поверх прежнего конфига.
#
# РАСПЛАТА: если в этом же коммите менялся docker-compose.yml или Caddyfile,
# сервер их не увидит и поднимет контейнеры по старому конфигу. Чтобы это не
# случилось молча, ниже печатается расхождение между коммитом на сервере и
# разворачиваемым образом — смотрите на него в логе деплоя.
FETCH_OK=1
if GIT_TERMINAL_PROMPT=0 git -c credential.helper= fetch --prune "$ANON_URL" main; then
  # --ff-only, а не reset --hard: если на сервере оказались локальные правки
  # или ветка разъехалась, лучше остановиться с внятной ошибкой, чем молча их
  # стереть. Разбираться в такой ситуации нужно руками.
  git merge --ff-only FETCH_HEAD
else
  FETCH_OK=0
  echo ""
  echo "!!! ВНИМАНИЕ: не удалось забрать изменения из $ANON_URL"
  echo "!!! Выкатка продолжается: приложение обновится из образа, но"
  echo "!!! docker-compose.yml и Caddyfile останутся такими, как сейчас на сервере."
  echo "!!! Починить: git -C $APP_DIR remote -v"
  echo "!!!           git -C $APP_DIR config --list --show-origin | grep -Ei 'insteadof|extraheader|credential'"
  echo ""
fi

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

LOCAL_SHA="$(git rev-parse HEAD)"
echo "==> Готово: развёрнут образ ${IMAGE_TAG}"
echo "    конфиг на сервере: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

# Расхождение печатаем явно: при неудачном fetch это единственный признак,
# что compose-конфиг отстал от развёрнутого приложения.
if [ "$FETCH_OK" = "0" ] && [ "$IMAGE_TAG" != "latest" ] && [ "$LOCAL_SHA" != "$IMAGE_TAG" ]; then
  echo ""
  echo "!!! Конфиг на сервере отстал от развёрнутого образа."
  echo "!!! Если в новых коммитах менялись docker-compose.yml или Caddyfile —"
  echo "!!! они НЕ применились. Проверьте доступ к git и повторите выкатку."
fi
