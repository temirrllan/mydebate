"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/actions/auth";

/**
 * Кнопка «Войти/Зарегистрироваться через Google». По клику вызывает серверный
 * экшен signInWithGoogle, который запускает OAuth-редирект на Google (auth.ts,
 * провайдер Google). onClick, а НЕ вложенный <form>: кнопка живёт внутри форм
 * входа/регистрации, а вложенные формы недопустимы (ломают гидрацию).
 * callbackUrl — куда вернуть после входа (по умолчанию /profile; проверку
 * «только внутренний путь» делает сам экшен).
 */
export function GoogleButton({ label, callbackUrl }: { label: string; callbackUrl?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => signInWithGoogle(callbackUrl))}
      className="w-full justify-center gap-2.5 text-ink"
    >
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.89c2.27-2.09 3.56-5.17 3.56-8.82Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.89-3c-1.08.73-2.46 1.16-4.06 1.16-3.12 0-5.77-2.11-6.71-4.94H1.27v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.29 14.31A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.58.38-2.31v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.41l4.02-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.76 0 3.35.61 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.59l4.02 3.1C6.23 6.86 8.88 4.75 12 4.75Z"
        />
      </svg>
      {pending ? "Переходим в Google…" : label}
    </Button>
  );
}
