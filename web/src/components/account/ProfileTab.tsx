'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Ruler,
  ScanFace,
  Search,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';
import { diagnosisFromChoice, useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';
import { formatCEP, formatCPF, formatPhoneBR } from '@/lib/format';
import {
  BODY_TYPES,
  CONTRASTS,
  SKIN_TONES,
  SUBTONES,
  detectBodyType,
  estimateSizes,
  getSeason,
} from '@/lib/stylist/knowledge';
import type { BodyType, ContrastLevel, Gender, SkinToneId, Subtone } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
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
    <span className="inline-flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.14em]" role="group" aria-label={question}>
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
  const { user, profile, updateProfile, isAdmin } = useSession();
  const { diagnosis, setDiagnosis, faceImage, setFaceImage } = useDiagnosis();
  const { toast } = useUI();

  // IDs para acessibilidade
  const nameId = useId();
  const phoneId = useId();
  const cpfId = useId();
  const cepId = useId();
  const streetId = useId();
  const numberId = useId();
  const compId = useId();
  const neighId = useId();
  const cityId = useId();
  const stateId = useId();
  const currentEmailId = useId();
  const newEmailId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();

  // --- DADOS PESSOAIS ---
  const savedName = profile?.full_name ?? '';
  const savedPhone = profile?.phone ? formatPhoneBR(profile.phone) : '';
  const savedCpf = profile?.cpf ? formatCPF(profile.cpf) : '';

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [cpfDraft, setCpfDraft] = useState<string | null>(null);

  const name = nameDraft ?? savedName;
  const phone = phoneDraft ?? savedPhone;
  const cpf = cpfDraft ?? savedCpf;

  // --- ENDEREÇO DE ENTREGA ---
  const savedShipping = profile?.shipping_address;
  const [cepDraft, setCepDraft] = useState<string | null>(null);
  const [streetDraft, setStreetDraft] = useState<string | null>(null);
  const [numberDraft, setNumberDraft] = useState<string | null>(null);
  const [compDraft, setCompDraft] = useState<string | null>(null);
  const [neighDraft, setNeighDraft] = useState<string | null>(null);
  const [cityDraft, setCityDraft] = useState<string | null>(null);
  const [stateDraft, setStateDraft] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);

  const cep = cepDraft ?? savedShipping?.cep ?? '';
  const street = streetDraft ?? savedShipping?.street ?? '';
  const number = numberDraft ?? savedShipping?.number ?? '';
  const complement = compDraft ?? savedShipping?.complement ?? '';
  const neighborhood = neighDraft ?? savedShipping?.neighborhood ?? '';
  const city = cityDraft ?? savedShipping?.city ?? '';
  const state = stateDraft ?? savedShipping?.state ?? '';

  // --- BIOMETRIA E COLORIMETRIA ---
  const initialWeight = diagnosis?.weightKg ?? profile?.weight_kg ?? null;
  const initialHeight = diagnosis?.heightCm ?? profile?.height_cm ?? null;
  const initialAge = diagnosis?.age ?? profile?.age ?? null;
  const initialGender = diagnosis?.gender ?? profile?.gender ?? 'masculino';
  const initialTone = diagnosis?.skinTone ?? (profile?.preferred_skin_tone as SkinToneId) ?? 'morena';
  const initialSubtone = diagnosis?.subtone ?? profile?.skin_subtone ?? 'neutro';
  const initialContrast = diagnosis?.contrast ?? profile?.contrast_level ?? 'medio';
  const initialBodyType = diagnosis?.bodyType ?? profile?.body_type ?? detectBodyType(initialWeight, initialHeight, initialGender);

  const [weightKg, setWeightKg] = useState<number | null>(initialWeight);
  const [heightCm, setHeightCm] = useState<number | null>(initialHeight);
  const [age, setAge] = useState<number | null>(initialAge);
  const [gender, setGender] = useState<Gender>(initialGender);
  const [tone, setTone] = useState<SkinToneId>(initialTone);
  const [subtone, setSubtone] = useState<Subtone>(initialSubtone);
  const [contrast, setContrast] = useState<ContrastLevel>(initialContrast);
  const [bodyType, setBodyType] = useState<BodyType>(initialBodyType);

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalFeedback, setPersonalFeedback] = useState<Feedback>(null);

  // --- SEGURANÇA: E-MAIL & SENHA ---
  const email = profile?.email ?? user?.email ?? '';
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  // --- PRIVACIDADE E CARTELA ---
  const [confirmErase, setConfirmErase] = useState(false);
  const [erasing, setErasing] = useState(false);

  // Busca automática de CEP
  async function handleCepLookup(rawCep: string) {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreetDraft(data.logradouro || '');
        setNeighDraft(data.bairro || '');
        setCityDraft(data.localidade || '');
        setStateDraft(data.uf || '');
        toast('Endereço encontrado pelo CEP.', 'success');
      } else {
        toast('CEP não localizado.', 'error');
      }
    } catch {
      toast('Erro ao buscar o CEP.', 'error');
    } finally {
      setLoadingCep(false);
    }
  }

  // Atualização de dados pessoais, endereço e biometria
  async function handleSavePersonal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const phoneDigits = phone.replace(/\D/g, '');
    const cpfDigits = cpf.replace(/\D/g, '');

    if (cleanName.length < 2) {
      setPersonalFeedback({ tone: 'error', message: 'Informe seu nome completo.' });
      return;
    }
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      setPersonalFeedback({ tone: 'error', message: 'Informe o WhatsApp com DDD.' });
      return;
    }

    setSavingPersonal(true);
    setPersonalFeedback(null);

    const shippingPayload =
      street.trim() || cep.trim()
        ? {
            cep: cep.trim(),
            street: street.trim(),
            number: number.trim(),
            complement: complement.trim(),
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            state: state.trim().toUpperCase(),
          }
        : null;

    const season = getSeason(tone, subtone);

    const patchPayload = {
      full_name: cleanName,
      phone: phoneDigits ? formatPhoneBR(phoneDigits) : null,
      cpf: cpfDigits ? formatCPF(cpfDigits) : null,
      shipping_address: shippingPayload,
      weight_kg: weightKg,
      height_cm: heightCm,
      age: age,
      gender: gender,
      body_type: bodyType,
      preferred_skin_tone: tone,
      skin_subtone: subtone,
      contrast_level: contrast,
      seasonal_palette: season.name,
    };

    const { error } = await updateProfile(patchPayload);

    // Sincroniza também com o provedor de consultoria local
    setDiagnosis(
      diagnosisFromChoice(tone, subtone, contrast, {
        weightKg,
        heightCm,
        age,
        gender,
        bodyType,
      }),
    );

    setSavingPersonal(false);
    if (error) {
      setPersonalFeedback({ tone: 'error', message: 'Não foi possível salvar todos os dados. Tente novamente.' });
      return;
    }

    setNameDraft(null);
    setPhoneDraft(null);
    setCpfDraft(null);
    setCepDraft(null);
    setStreetDraft(null);
    setNumberDraft(null);
    setCompDraft(null);
    setNeighDraft(null);
    setCityDraft(null);
    setStateDraft(null);
    setPersonalFeedback({ tone: 'success', message: 'Ficha e medidas salvas com sucesso!' });
    toast('Seus dados e biometria foram atualizados.', 'success');
  }

  // Alteração de E-mail
  async function handleChangeEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailFeedback({ tone: 'error', message: 'Digite um endereço de e-mail válido.' });
      return;
    }
    if (cleanEmail === email.toLowerCase()) {
      setEmailFeedback({ tone: 'error', message: 'O novo e-mail deve ser diferente do atual.' });
      return;
    }

    setSavingEmail(true);
    setEmailFeedback(null);

    const { error } = await supabase.auth.updateUser({ email: cleanEmail });
    setSavingEmail(false);

    if (error) {
      setEmailFeedback({ tone: 'error', message: error.message || 'Erro ao solicitar troca de e-mail.' });
      return;
    }

    setEmailFeedback({
      tone: 'success',
      message: 'Confirmação enviada! Verifique a caixa de entrada do novo e-mail para validar.',
    });
    setNewEmail('');
    toast('Confirmação enviada para o novo e-mail.', 'success');
  }

  // Alteração de Senha
  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordFeedback({ tone: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ tone: 'error', message: 'As senhas digitadas não coincidem.' });
      return;
    }

    setSavingPassword(true);
    setPasswordFeedback(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordFeedback({ tone: 'error', message: error.message || 'Erro ao alterar a senha.' });
      return;
    }

    setPasswordFeedback({ tone: 'success', message: 'Senha atualizada com sucesso!' });
    setNewPassword('');
    setConfirmPassword('');
    toast('Sua senha foi alterada com segurança.', 'success');
  }

  function removeFace() {
    setFaceImage(null);
    toast('Foto removida deste aparelho.', 'success');
  }

  async function eraseDiagnosis() {
    setErasing(true);
    const { error } = await updateProfile({
      preferred_skin_tone: null,
      skin_subtone: null,
      contrast_level: null,
      seasonal_palette: null,
      weight_kg: null,
      height_cm: null,
      age: null,
      body_type: null,
    });
    setErasing(false);
    setConfirmErase(false);
    if (error) {
      toast('Não foi possível apagar a cartela agora. Tente novamente.', 'error');
      return;
    }
    setDiagnosis(null);
    toast('Cartela e biometria apagadas.', 'success');
  }

  const activeBodyInfo = BODY_TYPES.find((b) => b.id === bodyType);
  const activeSeason = getSeason(tone, subtone);
  const estimated = estimateSizes(weightKg, heightCm, bodyType, gender);

  return (
    <section aria-label="Perfil do cliente" className="space-y-12">
      <TabIntro
        numeral="V"
        eyebrow="Ficha do Cliente"
        title={
          <>
            Seus dados, medidas &amp; <span className="text-gold-light">segurança</span>
          </>
        }
        lead="Atualize suas informações cadastrais, medidas biométricas para o provador inteligente e credenciais de acesso."
      />

      {/* BANNER EXCLUSIVO DE ADMIN SE FOR ADMIN */}
      {isAdmin && (
        <div className="panel-gold relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <span className="glow-gold pointer-events-none absolute -right-20 -top-20 h-60 w-60" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line-gold bg-gold/10 text-gold">
                <ShieldCheck className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-gold-light">
                    Administrador Master
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ivory">
                  Painel de Gestão da Titi&apos;s Store
                </h3>
                <p className="mt-1 text-sm text-mist">
                  Você possui permissão de administrador. Gerencie pedidos, acervo de peças, fotos e cupons.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button href="/admin" variant="gold" className="whitespace-nowrap">
                Abrir Painel Admin
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Button>
              <Button href="/admin?aba=pedidos" variant="outline" size="sm" className="whitespace-nowrap">
                Pedidos
              </Button>
              <Button href="/admin?aba=produtos" variant="outline" size="sm" className="whitespace-nowrap">
                Catálogo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO PRINCIPAL: DADOS PESSOAIS, ENDEREÇO E BIOMETRIA */}
      <form onSubmit={handleSavePersonal} className="space-y-10" noValidate>
        
        {/* BLOCO 1: DADOS PESSOAIS & CONTATO */}
        <div className="panel relative rounded-3xl p-6 sm:p-10">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ivory">Dados Pessoais &amp; Contato</h3>
            </div>
            <span className="numeral text-[0.68rem] text-smoke">BLOCO I</span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  setPersonalFeedback(null);
                }}
                placeholder="Ex.: Carlos Drummond"
              />
            </div>

            <div>
              <label htmlFor={phoneId} className="label">
                WhatsApp / Celular
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
                  setPersonalFeedback(null);
                }}
                placeholder="(31) 99999-9999"
              />
            </div>

            <div>
              <label htmlFor={cpfId} className="label">
                CPF (para nota fiscal e frete)
              </label>
              <input
                id={cpfId}
                className="field-line"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => {
                  setCpfDraft(formatCPF(e.target.value));
                  setPersonalFeedback(null);
                }}
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: ENDEREÇO DE ENTREGA PRINCIPAL */}
        <div className="panel relative rounded-3xl p-6 sm:p-10">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ivory">Endereço de Entrega Principal</h3>
            </div>
            <span className="numeral text-[0.68rem] text-smoke">BLOCO II</span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor={cepId} className="label flex items-center justify-between">
                <span>CEP</span>
                {loadingCep && <span className="text-xs text-gold animate-pulse">Buscando endereço...</span>}
              </label>
              <div className="relative">
                <input
                  id={cepId}
                  className="field-line pr-10"
                  inputMode="numeric"
                  value={cep}
                  onChange={(e) => {
                    const formatted = formatCEP(e.target.value);
                    setCepDraft(formatted);
                    if (formatted.replace(/\D/g, '').length === 8) {
                      handleCepLookup(formatted);
                    }
                  }}
                  placeholder="00000-000"
                />
                <button
                  type="button"
                  onClick={() => handleCepLookup(cep)}
                  disabled={loadingCep || cep.replace(/\D/g, '').length !== 8}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-smoke hover:text-gold disabled:opacity-30"
                  title="Consultar CEP"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label htmlFor={streetId} className="label">
                Logradouro / Rua
              </label>
              <input
                id={streetId}
                className="field-line"
                value={street}
                onChange={(e) => setStreetDraft(e.target.value)}
                placeholder="Av., Rua, Travessa..."
              />
            </div>

            <div>
              <label htmlFor={numberId} className="label">
                Número
              </label>
              <input
                id={numberId}
                className="field-line"
                value={number}
                onChange={(e) => setNumberDraft(e.target.value)}
                placeholder="123"
              />
            </div>

            <div>
              <label htmlFor={compId} className="label">
                Complemento
              </label>
              <input
                id={compId}
                className="field-line"
                value={complement}
                onChange={(e) => setCompDraft(e.target.value)}
                placeholder="Apto 101, Bloco B..."
              />
            </div>

            <div>
              <label htmlFor={neighId} className="label">
                Bairro
              </label>
              <input
                id={neighId}
                className="field-line"
                value={neighborhood}
                onChange={(e) => setNeighDraft(e.target.value)}
                placeholder="Bairro"
              />
            </div>

            <div>
              <label htmlFor={cityId} className="label">
                Cidade
              </label>
              <input
                id={cityId}
                className="field-line"
                value={city}
                onChange={(e) => setCityDraft(e.target.value)}
                placeholder="Belo Horizonte"
              />
            </div>

            <div>
              <label htmlFor={stateId} className="label">
                Estado (UF)
              </label>
              <input
                id={stateId}
                className="field-line uppercase"
                maxLength={2}
                value={state}
                onChange={(e) => setStateDraft(e.target.value.toUpperCase())}
                placeholder="MG"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 3: MEDIDAS CORPORAIS & CONSULTORIA DE IMAGEM */}
        <div className="panel relative rounded-3xl p-6 sm:p-10">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <Ruler className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <div>
                <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ivory">
                  Perfil Físico, Biometria &amp; Colorimetria
                </h3>
                <p className="text-xs text-mist">
                  Alimenta o algoritmo de recomendação de looks do Atelier e a estimativa precisa de tamanhos.
                </p>
              </div>
            </div>
            <span className="numeral text-[0.68rem] text-smoke">BLOCO III</span>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Peso (kg)</label>
              <input
                type="number"
                step="0.5"
                min={30}
                max={250}
                className="field-line"
                value={weightKg ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  setWeightKg(val);
                  if (val && heightCm) setBodyType(detectBodyType(val, heightCm, gender));
                }}
                placeholder="Ex.: 78"
              />
            </div>

            <div>
              <label className="label">Altura (cm)</label>
              <input
                type="number"
                step="1"
                min={100}
                max={250}
                className="field-line"
                value={heightCm ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                  setHeightCm(val);
                  if (weightKg && val) setBodyType(detectBodyType(weightKg, val, gender));
                }}
                placeholder="Ex.: 180"
              />
            </div>

            <div>
              <label className="label">Idade (anos)</label>
              <input
                type="number"
                step="1"
                min={12}
                max={120}
                className="field-line"
                value={age ?? ''}
                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="Ex.: 32"
              />
            </div>

            <div>
              <label className="label">Gênero</label>
              <select
                className="field-line bg-surface"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro / Neutro</option>
              </select>
            </div>
          </div>

          {/* ESTIMATIVA DE TAMANHO */}
          {(weightKg || heightCm) && (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line-gold/40 bg-gold/[0.03] p-4 text-xs">
              <Sparkles className="h-4 w-4 text-gold shrink-0" />
              <div className="text-mist">
                Estimativa de modelagem Titi&apos;s Store:{' '}
                <strong className="text-parchment">Peças Superiores: {estimated.top}</strong> ·{' '}
                <strong className="text-parchment">Calças e Bermudas: {estimated.bottom}</strong>
              </div>
            </div>
          )}

          {/* SELEÇÃO DE BIOTIPO CORPORAL */}
          <div className="mt-8">
            <label className="label mb-3 block">
              Biotipo Corporal &amp; Estrutura Óssea
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BODY_TYPES.map((b) => {
                const selected = bodyType === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBodyType(b.id)}
                    className={`flex flex-col text-left rounded-2xl border p-4 transition-all ${
                      selected
                        ? 'border-gold bg-gold/[0.08] shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                        : 'border-line bg-surface hover:border-line-gold/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-bold text-ivory">{b.name}</span>
                      {selected && <Check className="h-4 w-4 text-gold" />}
                    </div>
                    <p className="mt-1.5 text-xs text-mist leading-relaxed">{b.description}</p>
                  </button>
                );
              })}
            </div>

            {activeBodyInfo && (
              <div className="mt-4 rounded-2xl border border-line bg-obsidian/40 p-4 text-xs">
                <span className="font-bold text-gold-light uppercase tracking-wider block mb-1">
                  Recomendação de Alfaiataria ({activeBodyInfo.name}):
                </span>
                <p className="text-mist leading-relaxed">{activeBodyInfo.tailoringAdvice}</p>
              </div>
            )}
          </div>

          {/* SELEÇÃO DE COLORIMETRIA */}
          <div className="mt-10 border-t border-line pt-8">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gold-light mb-6">
              Colorimetria Pessoal (Cartela de Cores)
            </h4>
            
            <div className="grid gap-6 md:grid-cols-3">
              {/* Tom de Pele */}
              <div>
                <label className="label">Tom de Pele</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SKIN_TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        tone === t.id
                          ? 'border-gold bg-gold/15 text-ivory'
                          : 'border-line bg-surface text-mist hover:text-ivory'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtom */}
              <div>
                <label className="label">Subtom de Pele</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {SUBTONES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubtone(s.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        subtone === s.id
                          ? 'border-gold bg-gold/15 text-ivory'
                          : 'border-line bg-surface text-mist hover:text-ivory'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contraste */}
              <div>
                <label className="label">Nível de Contraste</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {CONTRASTS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setContrast(c.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        contrast === c.id
                          ? 'border-gold bg-gold/15 text-ivory'
                          : 'border-line bg-surface text-mist hover:text-ivory'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-line-gold/40 bg-gold/[0.04] p-4 text-xs flex items-center justify-between">
              <div>
                <span className="text-smoke uppercase tracking-wider block">Cartela Pessoal Resultante:</span>
                <span className="text-base font-extrabold text-ivory mt-0.5 block">{activeSeason.name}</span>
              </div>
              <Link href="/dashboard?aba=cartela" className="text-gold-light hover:underline font-semibold">
                Ver paleta completa ›
              </Link>
            </div>
          </div>

          {/* BOTÃO DE SALVAR BLOCOS I, II E III */}
          <div className="mt-10 flex flex-wrap items-center gap-5 border-t border-line pt-6">
            <Button type="submit" loading={savingPersonal}>
              Salvar alterações cadastrais &amp; biométricas
            </Button>
            
            <p aria-live="polite" className="min-h-[1.25rem] text-sm">
              {personalFeedback && (
                <span className={`inline-flex items-center gap-2 ${personalFeedback.tone === 'success' ? 'text-success' : 'text-danger'}`}>
                  {personalFeedback.tone === 'success' ? (
                    <CircleCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <CircleAlert className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  )}
                  {personalFeedback.message}
                </span>
              )}
            </p>
          </div>
        </div>

      </form>

      {/* BLOCO 4: SEGURANÇA & CREDENCIAIS (E-MAIL E SENHA) */}
      <div className="grid gap-8 lg:grid-cols-2">
        
        {/* ALTERAÇÃO DE E-MAIL */}
        <form onSubmit={handleChangeEmail} className="panel relative rounded-3xl p-6 sm:p-8" noValidate>
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <Mail className="h-5 w-5 text-gold" strokeWidth={1.5} />
            <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ivory">Alterar E-mail de Acesso</h3>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor={currentEmailId} className="label">E-mail atual</label>
              <div className="relative">
                <input
                  id={currentEmailId}
                  className="field-line text-mist pr-8"
                  value={email}
                  readOnly
                  disabled
                />
                <Lock className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-smoke" />
              </div>
            </div>

            <div>
              <label htmlFor={newEmailId} className="label">Novo e-mail</label>
              <input
                id={newEmailId}
                type="email"
                className="field-line"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailFeedback(null);
                }}
                placeholder="novo.email@dominio.com"
              />
              <p className="mt-2 text-xs text-smoke">
                Um link de verificação será enviado para confirmar a titularidade da nova conta.
              </p>
            </div>

            <Button type="submit" variant="outline" loading={savingEmail} disabled={!newEmail.trim()}>
              Atualizar e-mail
            </Button>

            {emailFeedback && (
              <p className={`text-xs inline-flex items-center gap-2 ${emailFeedback.tone === 'success' ? 'text-success' : 'text-danger'}`}>
                {emailFeedback.tone === 'success' ? <CircleCheck className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
                {emailFeedback.message}
              </p>
            )}
          </div>
        </form>

        {/* ALTERAÇÃO DE SENHA */}
        <form onSubmit={handleChangePassword} className="panel relative rounded-3xl p-6 sm:p-8" noValidate>
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <KeyRound className="h-5 w-5 text-gold" strokeWidth={1.5} />
            <h3 className="text-lg font-extrabold tracking-[-0.02em] text-ivory">Alterar Senha</h3>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor={newPasswordId} className="label">Nova senha</label>
              <div className="relative">
                <input
                  id={newPasswordId}
                  type={showPassword ? 'text' : 'password'}
                  className="field-line pr-10"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordFeedback(null);
                  }}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-smoke hover:text-ivory"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor={confirmPasswordId} className="label">Confirmar nova senha</label>
              <input
                id={confirmPasswordId}
                type={showPassword ? 'text' : 'password'}
                className="field-line"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordFeedback(null);
                }}
                placeholder="Repita a nova senha"
              />
            </div>

            <Button type="submit" variant="outline" loading={savingPassword} disabled={!newPassword || !confirmPassword}>
              Salvar nova senha
            </Button>

            {passwordFeedback && (
              <p className={`text-xs inline-flex items-center gap-2 ${passwordFeedback.tone === 'success' ? 'text-success' : 'text-danger'}`}>
                {passwordFeedback.tone === 'success' ? <CircleCheck className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
                {passwordFeedback.message}
              </p>
            )}
          </div>
        </form>

      </div>

      {/* BLOCO 5: PRIVACIDADE LOCAL & SESSÃO */}
      <div className="rounded-3xl border border-line p-6 sm:p-8">
        <h3 className="kicker mb-4">Privacidade Local &amp; Sessão</h3>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            {faceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faceImage}
                alt="Foto do rosto salva"
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-gold"
              />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-dashed border-line text-[10px] text-smoke">
                Foto
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ivory">
                {faceImage ? 'Foto salva no provador' : 'Nenhuma foto salva'}
              </p>
              {faceImage && (
                <button
                  type="button"
                  onClick={removeFace}
                  className="mt-1 text-[11px] text-gold-light hover:underline block"
                >
                  Excluir foto deste aparelho
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
            <div>
              <p className="text-xs font-semibold text-ivory">Diagnóstico Cromático</p>
              <p className="text-[11px] text-mist">{diagnosis ? `Cartela: ${diagnosis.season}` : 'Não registrado'}</p>
            </div>
            {diagnosis && (
              confirmErase ? (
                <InlineConfirm
                  question="Apagar?"
                  onConfirm={eraseDiagnosis}
                  onCancel={() => setConfirmErase(false)}
                  busy={erasing}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmErase(true)}
                  className="text-xs text-danger hover:underline"
                >
                  Zerar cartela
                </button>
              )
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-xs font-semibold text-ivory">Sessão da Conta</p>
              <p className="text-[11px] text-smoke truncate max-w-[150px]">{email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onSignOut} loading={signingOut}>
              {!signingOut && <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />}
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
