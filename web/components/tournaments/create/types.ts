// Общий тип состояния формы мастера создания турнира (Этап 5) — все поля
// строковые/контролируемые (значения из <input>/<select>), приводятся к
// нужным типам только на границе валидации (step1Schema/step2Schema/
// step3Schema из lib/validations/tournament.ts) и на финальной сборке
// FormData. Единый источник, чтобы все под-шаги (Step1/Step2/Step3) и сам
// оркестратор (create-wizard.tsx) держали одну и ту же форму данных.

export type WizardSection = { title: string; description: string };

export type WizardValues = {
  // Шаг 1
  title: string;
  format: string;
  locationType: string;
  level: string;
  languages: string[];
  city: string;
  address: string;
  venue: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  price: string;
  // Шаг 2
  description: string;
  coverImage: string;
  logoImage: string;
  sections: WizardSection[];
  // Шаг 3
  registrationType: string;
  externalUrl: string;
  paymentMethod: string;
  paymentAccount: string;
  paymentRecipient: string;
  instagram: string;
  telegram: string;
  email: string;
};

export const INITIAL_WIZARD_VALUES: WizardValues = {
  title: "",
  format: "",
  locationType: "",
  level: "",
  languages: [],
  city: "",
  address: "",
  venue: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  price: "0",
  description: "",
  coverImage: "",
  logoImage: "",
  sections: [],
  registrationType: "PLATFORM",
  externalUrl: "",
  paymentMethod: "Kaspi",
  paymentAccount: "",
  paymentRecipient: "",
  instagram: "",
  telegram: "",
  email: "",
};

/** Фиксированный список языков (совпадает с fallback-набором формы регистрации). */
export const LANGUAGE_OPTIONS = ["Казакша", "Русский", "English"];

export type FieldErrors = Record<string, string[]>;

export type WizardUpdate = <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => void;

/** Какому шагу мастера принадлежит поле — используется, чтобы вернуть
 * пользователя на нужный шаг, если сервер вернул fieldErrors на полях, не
 * покрытых клиентской валидацией текущего шага. */
const STEP_FIELDS: Record<number, (keyof WizardValues)[]> = {
  1: [
    "title",
    "format",
    "locationType",
    "level",
    "languages",
    "city",
    "address",
    "venue",
    "startDate",
    "endDate",
    "registrationDeadline",
    "price",
  ],
  2: ["description", "coverImage", "logoImage", "sections"],
  3: [
    "registrationType",
    "externalUrl",
    "paymentMethod",
    "paymentAccount",
    "paymentRecipient",
    "instagram",
    "telegram",
    "email",
  ],
};

export function getStepForField(field: string): number {
  for (const [step, fields] of Object.entries(STEP_FIELDS)) {
    if ((fields as string[]).includes(field)) return Number(step);
  }
  return 1;
}
