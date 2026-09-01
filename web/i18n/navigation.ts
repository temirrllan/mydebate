// Навигация с учётом локали. ВЕЗДЕ в интерфейсе используйте эти обёртки, а не
// `next/link` и `next/navigation`: обычный <Link href="/tournaments"> увёл бы
// казахоязычного пользователя на русскую версию, потеряв префикс.
//
// Исключение — ссылки на файлы и route handlers (выгрузка CSV, загруженные
// картинки): они не локализованы, для них обычный <a href>.
import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
