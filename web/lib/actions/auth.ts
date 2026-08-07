"use server";

// Server Actions для форм аутентификации (Этап 2, spec §3/§10/§11).
//
// Все проверки выполняются на сервере, независимо от клиентской валидации
// ("Protect API route handlers and Server Actions server-side — never rely
// on hidden UI as the only gate"). Критические действия (вход, регистрация,
// запрос сброса пароля, сам сброс) логируются через console.log (spec §11:
// "Log critical actions (login, publish, delete tournament, moderation,
// user block)") — полноценного лог-стора пока нет, консоль — временная
// реализация уровня Этапа 2.

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/email/templates";
import { rateLimit, rateLimitReset, getClientIp } from "@/lib/rate-limit";

const TOO_MANY_ATTEMPTS = (sec: number) =>
  `Слишком много попыток. Попробуйте снова через ${Math.ceil(sec / 60)} мин.`;

// Лимиты (окно 15 мин / 1 час). Подобраны так, чтобы не мешать живым
// пользователям, но душить автоматический перебор.
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const RESET_LIMIT = 4;
const RESET_WINDOW_MS = 60 * 60 * 1000;

export type ActionState = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | undefined;

const WRONG_CREDENTIALS_MESSAGE = "Неверный Email или пароль.";

function baseUrl() {
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// Регистрация
// ---------------------------------------------------------------------------

export async function registerUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Защита от повторной отправки формы уже авторизованным пользователем
  // (обычный гвард — редирект на /register — стоит на самой странице,
  // app/register/page.tsx; эта проверка — второй, серверный рубеж на случай
  // прямого вызова Server Action в обход рендера страницы, например по
  // устаревшей вкладке). Без неё код ниже дошёл бы до повторного signIn()
  // поверх уже активной сессии, что в NextAuth v5 может стереть валидную
  // cookie authjs.session-token вместо её обновления (баг из QA) — вместо
  // этого просто не трогаем существующую сессию и никого не регистрируем
  // повторно.
  const existingSession = await auth();
  if (existingSession?.user?.id) {
    redirect("/profile");
  }

  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    agree: formData.get("agree") === "on",
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  // Rate-limiting по IP — против массового создания аккаунтов ботами.
  const ip = await getClientIp();
  const regLimited = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!regLimited.ok) {
    return { message: TOO_MANY_ATTEMPTS(regLimited.retryAfterSec) };
  }

  const { firstName, lastName, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      fieldErrors: { email: ["Пользователь с таким email уже зарегистрирован."] },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      passwordHash,
      role: Role.USER,
    },
  });

  console.log(`[auth] Новая регистрация: ${email}`);

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // Крайне маловероятно (аккаунт только что создан), но не должно ронять
      // процесс регистрации — пользователь может войти вручную с /login.
      redirect("/login?registered=1");
    }
    throw error;
  }

  redirect("/profile");
}

// ---------------------------------------------------------------------------
// Вход
// ---------------------------------------------------------------------------

export async function loginUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const callbackUrl = (formData.get("callbackUrl") as string | null) || "/profile";
  const safeCallbackUrl = callbackUrl.startsWith("/") ? callbackUrl : "/profile";

  // Тот же второй рубеж защиты, что и в registerUser (см. комментарий там):
  // если сессия уже активна, не вызываем signIn() повторно — просто уводим
  // туда, куда должна была вести обычная успешная форма входа.
  const existingSession = await auth();
  if (existingSession?.user?.id) {
    redirect(safeCallbackUrl);
  }

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  // Rate-limiting: ключ по IP+email — душит и перебор пароля для одного
  // аккаунта, и распыление по многим email с одного адреса. Проверяем ДО
  // обращения к БД/bcrypt (дорогая операция — не даём её дёргать перебором).
  const ip = await getClientIp();
  const loginKey = `login:${ip}:${parsed.data.email}`;
  const limited = rateLimit(loginKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!limited.ok) {
    console.log(`[auth] Rate limit входа: ip=${ip} email=${parsed.data.email}`);
    return { message: TOO_MANY_ATTEMPTS(limited.retryAfterSec) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.log(`[auth] Неудачная попытка входа: ${parsed.data.email}`);
      return { message: WRONG_CREDENTIALS_MESSAGE };
    }
    throw error;
  }

  // Успешный вход — обнуляем счётчик, чтобы удачные входы не копили лимит.
  rateLimitReset(loginKey);
  console.log(`[auth] Успешный вход: ${parsed.data.email}`);
  // callbackUrl всегда относительный путь внутри приложения (см. проверку в
  // proxy.ts/login-форме) — безопасно передавать в redirect().
  redirect(safeCallbackUrl);
}

// ---------------------------------------------------------------------------
// Забыли пароль — запрос ссылки сброса
// ---------------------------------------------------------------------------

// Нейтральное сообщение независимо от того, существует ли email — не
// раскрываем факт регистрации адреса (защита от enumeration).
const FORGOT_PASSWORD_NEUTRAL_MESSAGE =
  "Если такой email существует, мы отправили ссылку для сброса пароля.";

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  // Rate-limiting по IP — не даём спамить письмами сброса на чужие адреса и
  // перебирать email. Сообщение при лимите тоже нейтральное (не палим факты).
  const ip = await getClientIp();
  const resetLimited = rateLimit(`reset:${ip}`, RESET_LIMIT, RESET_WINDOW_MS);
  if (!resetLimited.ok) {
    return { success: true, message: FORGOT_PASSWORD_NEUTRAL_MESSAGE };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    // Инвалидируем старые токены — актуальна только последняя ссылка.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 час

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Отправляем письмо со ссылкой сброса (Gmail SMTP, см. lib/email/send.ts).
    // Если SMTP не настроен, sendPasswordResetEmail сам печатает ссылку в
    // консоль (dev-фолбэк). Ответ пользователю в любом случае нейтральный —
    // не раскрываем, существует ли email и дошло ли письмо.
    const resetUrl = `${baseUrl()}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } else {
    console.log("[auth] Password reset requested for unknown email");
  }

  return { success: true, message: FORGOT_PASSWORD_NEUTRAL_MESSAGE };
}

// ---------------------------------------------------------------------------
// Сброс пароля по токену
// ---------------------------------------------------------------------------

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return {
      message:
        "Ссылка недействительна или истёк срок её действия. Запросите сброс пароля ещё раз.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  console.log(`[auth] Пароль сброшен для userId=${resetToken.userId}`);

  redirect("/login?reset=success");
}

// ---------------------------------------------------------------------------
// Выход
// ---------------------------------------------------------------------------

export async function logoutUser() {
  const session = await auth();
  if (session?.user?.email) {
    console.log(`[auth] Выход: ${session.user.email}`);
  }
  await signOut({ redirectTo: "/" });
}

// ---------------------------------------------------------------------------
// Вход через Google (OAuth). Провайдер и синхронизация с таблицей User — в
// auth.ts (callbacks signIn/jwt). Здесь только запуск OAuth-редиректа из
// формы-кнопки GoogleButton. signIn для OAuth бросает redirect на Google —
// это ожидаемо (как и остальные редиректящие экшены в этом файле).
// ---------------------------------------------------------------------------

export async function signInWithGoogle(callbackUrl?: string) {
  // Открытый redirect защищаем: принимаем только внутренние пути ("/...").
  const safe = typeof callbackUrl === "string" && callbackUrl.startsWith("/") ? callbackUrl : "/profile";
  await signIn("google", { redirectTo: safe });
}
