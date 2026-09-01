"use server";

// Server Actions настроек профиля (личный кабинет → «Настройки»):
// редактирование личных данных и смена пароля. Раньше вкладка была read-only
// («появится в следующих обновлениях») — здесь закрывается этот пробел ТЗ.
//
// Все проверки на сервере, независимо от клиента (spec §11). Критические
// действия (смена пароля) логируются через console.log — как в lib/actions/auth.ts.

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { formatLanguages, parseLanguages } from "@/lib/enums";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations/profile";
import { translateFieldErrors } from "@/lib/i18n/validation";

export type ProfileActionState = {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | undefined;

const GENERIC_ERROR = "Что-то пошло не так. Попробуйте позже.";

/** Пустую строку сохраняем как NULL (единый стиль с остальным кодом). */
function nullify(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Обновление личных данных профиля. Email не редактируется (см. комментарий
 * в validations/profile.ts). Обновлённые поля тут же видны за счёт
 * revalidatePath('/profile') — навбар/шапка перечитают имя из БД.
 */
export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser("/profile?tab=settings");

  const parsed = updateProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") ?? "",
    city: formData.get("city") ?? "",
    school: formData.get("school") ?? "",
    major: formData.get("major") ?? "",
    experience: formData.get("experience") ?? "",
    bio: formData.get("bio") ?? "",
    level: formData.get("level") ?? "",
    languages: formData.get("languages") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: await translateFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const d = parsed.data;
  // languages нормализуем через общий хелпер, чтобы формат не разъезжался
  // ("Русский, English" -> "Русский,English").
  const languages = formatLanguages(parseLanguages(d.languages));

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        phone: nullify(d.phone),
        city: nullify(d.city),
        school: nullify(d.school),
        major: nullify(d.major),
        experience: nullify(d.experience),
        bio: nullify(d.bio),
        level: d.level || null,
        languages: languages || null,
      },
    });
  } catch (error) {
    console.error("[profile] Не удалось обновить профиль:", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/profile");
  return { success: true, message: "Личные данные сохранены." };
}

/**
 * Смена пароля. Требует текущий пароль (защита, если сессия чужая/забыли
 * выйти) — сверяем bcrypt-хешем, как в authorize(). OAuth-пользователи без
 * passwordHash смену пароля здесь делать не могут (у них нет пароля).
 */
export async function changePassword(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser("/profile?tab=settings");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: await translateFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!record?.passwordHash) {
    return {
      error:
        "У вашего аккаунта нет пароля (вход через внешний сервис). Смена пароля недоступна.",
    };
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!ok) {
    return { fieldErrors: await translateFieldErrors({ currentPassword: ["currentPasswordWrong"] }) };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`[profile] Пароль изменён userId=${user.id}`);

  return { success: true, message: "Пароль изменён." };
}
