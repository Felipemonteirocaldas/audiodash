/** Data por extenso em português, só com a primeira letra maiúscula: "Quarta-feira, 21 de outubro". */
export function formatLongDatePt(date: Date = new Date()): string {
  const text = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}
