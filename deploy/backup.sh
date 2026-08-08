#!/usr/bin/env bash
# Бэкап базы MyDebate.
#
# Зачем: база живёт на том же сервере, что и всё остальное. Умер сервер или
# диск — умерли данные. Это единственная защита, поэтому скрипт нужно не
# «когда-нибудь настроить», а поставить в cron сразу после первого запуска.
#
# Что делает: снимает дамп через pg_dump внутри контейнера db, кладёт рядом
# gzip-файл с датой в имени и удаляет дампы старше KEEP_DAYS дней.
#
# Установка (на сервере, из каталога проекта):
#   chmod +x deploy/backup.sh
#   crontab -e
#   # каждый день в 03:30
#   30 3 * * * cd /путь/к/mydebate && ./deploy/backup.sh >> backups/backup.log 2>&1
#
# ВАЖНО: дамп на том же диске спасает от «удалил не то» и от кривой миграции,
# но НЕ от смерти сервера. Настройте выгрузку каталога backups/ куда-то наружу
# (в объектное хранилище, на другую машину, к себе на ноутбук) — иначе смысл
# бэкапа наполовину теряется. Заготовка — в конце файла.

set -euo pipefail

# Каталог проекта — тот, где лежит docker-compose.yml (на уровень выше этого скрипта).
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

if [[ ! -f .env ]]; then
  echo "Нет файла .env рядом с docker-compose.yml — не знаю доступов к базе." >&2
  exit 1
fi

# Читаем POSTGRES_USER/POSTGRES_DB из .env, не вытаскивая их в общий вывод.
set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y-%m-%d_%H-%M)"
OUTFILE="$BACKUP_DIR/mydebate_$STAMP.sql.gz"

echo "[$(date '+%F %T')] Снимаю дамп базы $POSTGRES_DB -> $OUTFILE"

# --clean --if-exists: дамп можно накатить на непустую базу, он сам подчистит.
# Пишем во временный файл и переименовываем в конце: если pg_dump оборвётся,
# в каталоге не останется обрезанного файла, который выглядит как валидный бэкап.
docker compose exec -T db \
  pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --clean --if-exists \
  | gzip > "$OUTFILE.tmp"

mv "$OUTFILE.tmp" "$OUTFILE"

SIZE="$(du -h "$OUTFILE" | cut -f1)"
echo "[$(date '+%F %T')] Готово, размер $SIZE"

# Подозрительно маленький дамп — повод посмотреть глазами, а не узнать об этом
# в день, когда бэкап понадобится.
if [[ "$(stat -c%s "$OUTFILE" 2>/dev/null || stat -f%z "$OUTFILE")" -lt 1024 ]]; then
  echo "ВНИМАНИЕ: дамп меньше 1 КБ — вероятно, он пустой. Проверьте вручную." >&2
fi

echo "Удаляю дампы старше $KEEP_DAYS дней:"
find "$BACKUP_DIR" -name 'mydebate_*.sql.gz' -type f -mtime "+$KEEP_DAYS" -print -delete

# --- Восстановление (справка) ----------------------------------------------
# gunzip -c backups/mydebate_2026-08-09_03-30.sql.gz \
#   | docker compose exec -T db psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
#
# Восстановление ОБЯЗАТЕЛЬНО проверить хотя бы раз на пустой базе, пока ничего
# не горит. Непроверенный бэкап — это не бэкап.
#
# --- Выгрузка наружу (заготовка) -------------------------------------------
# rsync -az "$BACKUP_DIR/" user@другой-сервер:/backups/mydebate/
# либо rclone copy "$BACKUP_DIR" remote:mydebate-backups
