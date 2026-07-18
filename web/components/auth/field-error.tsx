/** Единообразный вывод ошибки валидации под полем формы (aria-live для а11y). */
export function FieldError({ messages, id }: { messages?: string[]; id?: string }) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-rose-600">
      {messages[0]}
    </p>
  );
}
