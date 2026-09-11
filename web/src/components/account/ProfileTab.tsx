'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, CircleCheck, Lock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';
import { formatPhoneBR } from '@/lib/format';
import { TabIntro } from './shared';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

function InlineConfirm({
  question,
  onConfirm,
  onCancel,
  busy,
}: {
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-4 text-[0.72rem] font-medium uppercase tracking-[0.2em]" role="group" aria-label={question}>
      <span className="text-parchment">{question}</span>
      <button type="button" onClick={onConfirm} disabled={busy} className="text-danger underline-offset-4 hover:underline disabled:opacity-50">
        Sim
      </button>
      <button type="button" onClick={onCancel} disabled={busy} className="text-mist underline-offset-4 hover:text-ivory hover:underline" autoFocus>
        Não
      </button>
    </span>
  );
}

export function ProfileTab({ onSignOut, signingOut }: { onSignOut: () => void; signingOut: boolean }) {
  const { user, profile, updateProfile } = useSession();
  const { diagnosis, setDiagnosis, faceImage, setFaceImage } = useDiagnosis();
  const { toast } = useUI();
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();

  // Rascunhos: null = sem edição (exibe o valor salvo no perfil).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [erasing, setErasing] = useState(false);

  const savedName = profile?.full_name ?? '';
  const savedPhone = profile?.phone ? formatPhoneBR(profile.phone) : '';
  const name = nameDraft ?? savedName;
  const phone = phoneDraft ?? savedPhone;
  const email = profile?.email ?? user?.email ?? '';
  const dirty = name.trim() !== savedName.trim() || phone !== savedPhone;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const digits = phone.replace(/\D/g, '');
    if (cleanName.length < 2) {
      setFeedback({ tone: 'error', message: 'Informe seu nome.' });
      return;
    }
    if (digits.length > 0 && digits.length < 10) {
      setFeedback({ tone: 'error', message: 'Informe o WhatsApp com DDD.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    const { error } = await updateProfile({ full_name: cleanName, phone: digits ? formatPhoneBR(digits) : null });
    setSaving(false);
    if (error) {
      setFeedback({ tone: 'error', message: 'Não foi possível salvar agora. Tente novamente.' });
      return;
    }
    setNameDraft(null);
    setPhoneDraft(null);
    setFeedback({ tone: 'success', message: 'Perfil atualizado.' });
  }

  function removeFace() {
    setFaceImage(null);
    toast('Foto removida deste aparelho.', 'success');
  }

  async function eraseDiagnosis() {
    setErasing(true);
    // Limpa primeiro a conta: se o estado local fosse zerado antes, o DiagnosisProvider
    // recuperaria a cartela a partir do perfil ainda preenchido.
    const { error } = await updateProfile({
      preferred_skin_tone: null,
      skin_subtone: null,
      contrast_level: null,
      seasonal_palette: null,
    });
    setErasing(false);
    setConfirmErase(false);
    if (error) {
      toast('Não foi possível apagar a cartela agora. Tente novamente.', 'error');
      return;
    }
    setDiagnosis(null);
    toast('Cartela apagada.', 'success');
  }

  return (
    <section aria-label="Perfil" className="space-y-10">
      <TabIntro
        numeral="IV"
        eyebrow="Perfil"
        title={
          <>
            Seus dados de <em className="italic text-gold-light">atendimento</em>
          </>
        }
        lead="Mantenha nome e WhatsApp atualizados para agilizar pedidos e retornos."
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <form onSubmit={handleSubmit} className="panel relative p-6 sm:p-10 lg:col-span-7" noValidate>
          <span className="numeral absolute right-6 top-6 text-[0.62rem] text-smoke" aria-hidden>
            FICHA
          </span>
          <div className="grid gap-8">
            <div>
              <label htmlFor={nameId} className="label">
                Nome completo
              </label>
              <input
                id={nameId}
                className="field-line"
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  setFeedback(null);
                }}
                placeholder="Como prefere ser chamado"
              />
            </div>
            <div>
              <label htmlFor={phoneId} className="label">
                WhatsApp
              </label>
              <input
                id={phoneId}
                className="field-line"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => {
                  setPhoneDraft(formatPhoneBR(e.target.value));
                  setFeedback(null);
                }}
                placeholder="(31) 99999-9999"
              />
            </div>
            <div>
              <label htmlFor={emailId} className="label">
                E-mail
              </label>
              <div className="relative">
                <input id={emailId} className="field-line pr-8 text-mist" value={email} readOnly aria-describedby={`${emailId}-hint`} />
                <Lock className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-smoke" strokeWidth={1.5} aria-hidden />
              </div>
              <p id={`${emailId}-hint`} className="mt-2 text-xs text-smoke">
                O e-mail de acesso não pode ser alterado por aqui.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Button type="submit" loading={saving} disabled={!dirty}>
              Salvar alterações
            </Button>
            {dirty && !saving && (
              <button
                type="button"
                className="text-[0.7rem] uppercase tracking-[0.2em] text-mist hover:text-ivory"
                onClick={() => {
                  setNameDraft(null);
                  setPhoneDraft(null);
                  setFeedback(null);
                }}
              >
                Descartar
              </button>
            )}
            <p aria-live="polite" className="min-h-[1.25rem] text-sm">
              {feedback && (
                <span className={`inline-flex items-center gap-2 ${feedback.tone === 'success' ? 'text-success' : 'text-danger'}`}>
                  {feedback.tone === 'success' ? (
                    <CircleCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <CircleAlert className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  )}
                  {feedback.message}
                </span>
              )}
            </p>
          </div>
        </form>

        <aside className="space-y-8 lg:col-span-5" aria-label="Privacidade e sessão">
          <div className="border border-line p-6 sm:p-8">
            <h3 className="kicker">Neste aparelho</h3>
            <ul className="mt-5 divide-y divide-line">
              <li className="flex items-center gap-4 py-4">
                {faceImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={faceImage} alt="Foto do rosto guardada neste aparelho" className="h-14 w-14 shrink-0 object-cover img-editorial" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center border border-dashed border-line text-[0.55rem] uppercase tracking-[0.2em] text-smoke" aria-hidden>
                    Foto
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ivory">{faceImage ? 'Foto guardada para o provador' : 'Nenhuma foto guardada'}</p>
                  {faceImage ? (
                    <button type="button" onClick={removeFace} className="mt-1 text-left text-xs text-gold-light underline-offset-4 hover:underline">
                      Remover foto guardada neste aparelho
                    </button>
                  ) : (
                    <p className="mt-1 text-xs text-smoke">A foto nunca sai do navegador sem a sua ação.</p>
                  )}
                </div>
              </li>
              <li className="py-4">
                <p className="text-sm text-ivory">{diagnosis ? `Cartela: ${diagnosis.season}` : 'Nenhuma cartela registrada'}</p>
                {diagnosis &&
                  (confirmErase ? (
                    <div className="mt-2">
                      <InlineConfirm question="Apagar cartela?" onConfirm={eraseDiagnosis} onCancel={() => setConfirmErase(false)} busy={erasing} />
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmErase(true)} className="mt-1 text-xs text-gold-light underline-offset-4 hover:underline">
                      Apagar minha cartela
                    </button>
                  ))}
              </li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-smoke">
              Saiba como tratamos seus dados na{' '}
              <Link href="/privacidade" className="text-mist underline underline-offset-4 hover:text-ivory">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <p className="text-xs text-smoke">Conectado como {email || 'cliente'}</p>
            <Button variant="ghost" size="sm" onClick={onSignOut} loading={signingOut}>
              {!signingOut && <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />}
              Sair
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
