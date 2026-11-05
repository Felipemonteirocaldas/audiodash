/** Textos de estado da tela de Configurações, separados da interface para poderem ser testados. */

const formatDate = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');

/** Preço exibido nas telas. O valor cobrado é o do produto na Dodo: mudar os dois juntos. */
export const PLAN_PRICE_LABEL = 'R$ 50,00';
/** Link de pagamento do modo de TESTE; em produção, definir VITE_DODO_CHECKOUT_URL na Vercel. */
export const TEST_CHECKOUT_URL = 'https://test.checkout.dodopayments.com/buy/pdt_0NkP4tyyh4C0dF9wG6eUW';

/** Mesma regra do RLS (public.has_paid_access): ativa ou cancelada, dentro da validade. */
export function hasPaidAccess(status: string | null | undefined, endDate: number | null | undefined, now: number = Date.now()): boolean {
  return (status === 'active' || status === 'canceled') && typeof endDate === 'number' && now < endDate;
}

/**
 * Link de checkout amarrado à conta: e-mail travado e id do usuário no metadata (lido pelo webhook).
 * Parâmetros de link estático da Dodo: email, disableEmail, metadata_*, redirect_url.
 */
export function checkoutUrl(base: string, user: { id: string; email: string }, origin: string): string {
  const url = new URL(base);
  url.searchParams.set('email', user.email);
  url.searchParams.set('disableEmail', 'true');
  url.searchParams.set('metadata_user_id', user.id);
  url.searchParams.set('redirect_url', `${origin}/planos`);
  return url.toString();
}

export interface SubscriptionSummary {
  label: string;
  detail: string;
  endLabel: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
}

export function subscriptionSummary(status: string | null | undefined, endDate: number | null | undefined, now: number = Date.now()): SubscriptionSummary {
  const end = typeof endDate === 'number' && Number.isFinite(endDate) ? endDate : null;
  const stillValid = end !== null && end > now;
  const notInformed = 'Data de validade não informada';
  switch (status) {
    case 'active':
      if (end !== null && !stillValid) {
        return { label: 'Assinatura vencida', tone: 'danger', detail: 'A data de validade já passou. Se o pagamento foi feito, aguarde a confirmação; se persistir, fale com o suporte.', endLabel: `Venceu em ${formatDate(end)}` };
      }
      return { label: 'Assinatura ativa', tone: 'ok', detail: 'Acesso a todos os recursos da plataforma.', endLabel: end !== null ? `Válida até ${formatDate(end)}` : notInformed };
    case 'canceled':
      return stillValid
        ? { label: 'Assinatura cancelada', tone: 'warn', detail: `O acesso continua até ${formatDate(end!)}.`, endLabel: `Acesso até ${formatDate(end!)}` }
        : { label: 'Assinatura cancelada', tone: 'warn', detail: 'O período pago terminou e o acesso foi encerrado.', endLabel: end !== null ? `Encerrada em ${formatDate(end)}` : 'Data de encerramento não informada' };
    case 'past_due':
      return { label: 'Pagamento em atraso', tone: 'danger', detail: 'Há um problema com o último pagamento. Regularize para não perder o acesso.', endLabel: end !== null ? `Última validade: ${formatDate(end)}` : notInformed };
    default:
      return { label: 'Sem assinatura ativa', tone: 'neutral', detail: 'Assine para liberar os recursos da plataforma.', endLabel: end !== null ? `${stillValid ? 'Válida até' : 'Venceu em'} ${formatDate(end)}` : notInformed };
  }
}

/**
 * Resultado de salvar: os dados já estão no aparelho; a mensagem diz o que se sabe sobre a nuvem.
 * `rowSynced` vem da própria linha salva (syncStatus === 'synced'), não de um erro antigo do gerenciador.
 */
export function saveOutcome(rowSynced: boolean, syncStatus: string): { tone: 'ok' | 'warn'; message: string } {
  if (rowSynced) return { tone: 'ok', message: 'Salvo e sincronizado com a nuvem.' };
  switch (syncStatus) {
    case 'offline': return { tone: 'warn', message: 'Salvo neste aparelho. Sem conexão: será enviado quando a internet voltar.' };
    case 'unconfigured': return { tone: 'ok', message: 'Salvo neste aparelho. A sincronização com a nuvem não está configurada.' };
    case 'error': return { tone: 'warn', message: 'Salvo neste aparelho. O envio para a nuvem falhou agora e será tentado de novo.' };
    default: return { tone: 'warn', message: 'Salvo neste aparelho. A sincronização ainda está em andamento.' };
  }
}
