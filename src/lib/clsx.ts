// Helper minúsculo pra não trazer uma dependência só pra concatenar
// classnames condicionais.
export function clsx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
