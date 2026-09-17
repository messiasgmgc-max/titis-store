'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CircleAlert } from 'lucide-react';
import type {
  BodyType,
  ClimateId,
  ContrastLevel,
  Diagnosis,
  Gender,
  LooksResponse,
  OccasionId,
  Product,
  SkinToneId,
  StylePreference,
  StyleRequest,
  Subtone,
  TimeOfDayId,
} from '@/lib/types';
import { detectBodyType, getSeason, occasionTitle } from '@/lib/stylist/knowledge';
import { generateLooks } from '@/lib/stylist/engine';
import { requestLooks } from '@/lib/api';
import { fetchCatalog, useCatalog } from '@/lib/catalog';
import { supabase } from '@/lib/supabaseClient';
import { diagnosisFromChoice, useDiagnosis } from '@/providers/DiagnosisProvider';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';
import { Button } from '@/components/ui/Button';
import {
  isConsultingLockError,
  lockReason,
  lockToastMessage,
  plansHref,
} from '@/components/consulting/shared';
import { TapeMeasure } from '@/components/ui/TapeMeasure';
import { StepTone } from './StepTone';
import { StepContext } from './StepContext';
import { StepLooks } from './StepLooks';
import { ComposingState } from './ComposingState';

const STEPS = ['Leitura', 'Contexto', 'Looks'];
const MIN_COMPOSE_MS = 1400;
const EASE = [0.22, 1, 0.36, 1] as const;

const FACTS = [
  { value: '12', label: 'estações cromáticas' },
  { value: '3', label: 'etapas' },
  { value: '3', label: 'looks por contexto' },
];

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
};

interface Composition {
  response: LooksResponse;
  request: StyleRequest;
  seasonName: string;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isUsableResponse(r: unknown): r is LooksResponse {
  if (!r || typeof r !== 'object') return false;
  const looks = (r as LooksResponse).looks;
  return (
    Array.isArray(looks) &&
    looks.length > 0 &&
    looks.every((l) => l && typeof l.title === 'string' && Array.isArray(l.pieces) && l.pieces.length > 0 && Array.isArray(l.palette))
  );
}

/**
 * Looks do servidor quando disponíveis; o motor local do Atelier cobre falhas técnicas.
 * 401/402 (sem login ou sem plano) nunca caem no motor local: a trava da consultoria vale aqui também.
 */
async function composeLooks(request: StyleRequest, products: Product[]): Promise<LooksResponse> {
  try {
    const remote = await requestLooks(request);
    if (isUsableResponse(remote)) return remote;
  } catch (err) {
    if (isConsultingLockError(err)) throw err;
    // demais falhas seguem para o motor local
  }
  const catalog = products.length > 0 ? products : (await fetchCatalog()).products;
  return generateLooks(request, catalog);
}

function seasonNameFor(request: StyleRequest, diagnosis: Diagnosis | null) {
  if (diagnosis && diagnosis.skinTone === request.skinTone && diagnosis.subtone === request.subtone && diagnosis.season) {
    return diagnosis.season;
  }
  return getSeason(request.skinTone, request.subtone).name;
}

export function Atelier() {
  const { diagnosis, setDiagnosis } = useDiagnosis();
  const { user, profile, refreshProfile } = useSession();
  const { openOverlay, toast } = useUI();
  const router = useRouter();
  const { products } = useCatalog();
  const reduceMotion = useReducedMotion();
  const anchorRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(0);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [maxStep, setMaxStep] = useState(0);

  const [tone, setTone] = useState<SkinToneId>(diagnosis?.skinTone ?? 'morena');
  const [subtone, setSubtone] = useState<Subtone>(diagnosis?.subtone ?? 'quente');
  const [contrast, setContrast] = useState<ContrastLevel>(diagnosis?.contrast ?? 'medio');

  const [weightKg, setWeightKg] = useState<number | null>(diagnosis?.weightKg ?? profile?.weight_kg ?? 76);
  const [heightCm, setHeightCm] = useState<number | null>(diagnosis?.heightCm ?? profile?.height_cm ?? 178);
  const [age, setAge] = useState<number | null>(diagnosis?.age ?? profile?.age ?? 30);
  const [gender, setGender] = useState<Gender>(diagnosis?.gender ?? profile?.gender ?? 'masculino');
  const [bodyType, setBodyType] = useState<BodyType>(
    diagnosis?.bodyType ??
      profile?.body_type ??
      detectBodyType(diagnosis?.weightKg ?? profile?.weight_kg ?? 76, diagnosis?.heightCm ?? profile?.height_cm ?? 178, 'masculino'),
  );

  const handleWeightChange = (w: number | null) => {
    setWeightKg(w);
    if (w && heightCm) {
      setBodyType(detectBodyType(w, heightCm, gender));
    }
  };

  const handleHeightChange = (h: number | null) => {
    setHeightCm(h);
    if (weightKg && h) {
      setBodyType(detectBodyType(weightKg, h, gender));
    }
  };

  const [occasion, setOccasion] = useState<OccasionId>('jantar');
  const [customVenue, setCustomVenue] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayId>('noite');
  const [climate, setClimate] = useState<ClimateId>('ameno');
  const [style, setStyle] = useState<StylePreference>('contemporaneo');

  const [result, setResult] = useState<Composition | null>(null);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFor, setSavedFor] = useState<Composition | null>(null);

  // Quando o diagnóstico muda fora daqui (leitura por foto, perfil da conta), a seleção acompanha.
  // Uma nova leitura por foto traz a pessoa de volta à etapa I para ver o resultado.
  const [syncedDiagnosis, setSyncedDiagnosis] = useState<Diagnosis | null>(diagnosis);
  if (diagnosis !== syncedDiagnosis) {
    setSyncedDiagnosis(diagnosis);
    if (diagnosis) {
      setTone(diagnosis.skinTone);
      setSubtone(diagnosis.subtone);
      setContrast(diagnosis.contrast ?? 'medio');
      if (diagnosis.weightKg !== undefined && diagnosis.weightKg !== null) setWeightKg(diagnosis.weightKg);
      if (diagnosis.heightCm !== undefined && diagnosis.heightCm !== null) setHeightCm(diagnosis.heightCm);
      if (diagnosis.age !== undefined && diagnosis.age !== null) setAge(diagnosis.age);
      if (diagnosis.gender) setGender(diagnosis.gender);
      if (diagnosis.bodyType) setBodyType(diagnosis.bodyType);
      const isNewPhotoReading = diagnosis.source !== 'manual' && diagnosis.createdAt !== syncedDiagnosis?.createdAt;
      if (isNewPhotoReading) {
        if (step !== 0) {
          setDirection(-1);
          setStep(0);
        }
        setResult(null);
        setError(null);
      }
    }
  }

  const scrollToSteps = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.top <= window.innerHeight * 0.4) return;
    window.scrollTo({ top: Math.max(0, rect.top + window.scrollY - 96), behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const commitTone = () => {
    setDiagnosis(
      diagnosisFromChoice(tone, subtone, contrast, {
        weightKg,
        heightCm,
        age,
        gender,
        bodyType,
      }),
    );
  };

  const goTo = (next: number) => {
    if (next === step || composing) return;
    if (step === 0 && next > 0) commitTone();
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    scrollToSteps();
  };

  const canVisit = (i: number) => !composing && (i === 0 || (i === 1 && maxStep >= 1) || (i === 2 && !!result));

  const compose = async () => {
    if (composing) return;
    const venue = customVenue.trim();
    const request: StyleRequest = {
      skinTone: tone,
      subtone,
      contrast,
      occasion,
      timeOfDay,
      climate,
      style,
      ...(venue ? { customVenue: venue } : {}),
      ...(weightKg ? { weightKg } : {}),
      ...(heightCm ? { heightCm } : {}),
      ...(age ? { age } : {}),
      ...(gender ? { gender } : {}),
      ...(bodyType ? { bodyType } : {}),
    };
    const run = ++runRef.current;
    setComposing(true);
    setError(null);
    setResult(null);
    setDirection(1);
    setStep(2);
    setMaxStep(2);
    scrollToSteps();

    try {
      const [response] = await Promise.all([composeLooks(request, products), wait(MIN_COMPOSE_MS)]);
      if (run !== runRef.current) return;
      setResult({ response, request, seasonName: seasonNameFor(request, diagnosis) });
    } catch (err) {
      if (run !== runRef.current) return;
      if (isConsultingLockError(err)) {
        toast(lockToastMessage(lockReason(err)), 'info');
        setDirection(-1);
        setStep(1);
        setMaxStep(1);
        void refreshProfile();
        router.push(plansHref(profile?.plan));
        return;
      }
      setError('Não conseguimos compor os looks agora. Tente novamente em instantes.');
    } finally {
      if (run === runRef.current) setComposing(false);
    }
  };

  const save = async () => {
    if (!result || saving) return;
    if (!user) {
      openOverlay({ type: 'auth', mode: 'register' });
      toast('Crie sua conta para guardar seus looks.', 'info');
      return;
    }
    const current = result;
    const { request, response, seasonName } = current;
    setSaving(true);
    try {
      const title = [occasionTitle(request.occasion), request.customVenue].filter(Boolean).join(' · ').slice(0, 140);
      let { error: dbError } = await supabase.from('consultations').insert({
        user_id: user.id,
        title,
        skin_tone: request.skinTone,
        skin_subtone: request.subtone,
        contrast_level: request.contrast,
        seasonal_palette: seasonName,
        occasion: request.occasion,
        custom_venue: request.customVenue ?? null,
        time_of_day: request.timeOfDay,
        climate: request.climate,
        style_preference: request.style,
        results: response.looks,
        source: response.source,
      });
      if (dbError?.code === 'PGRST204') {
        // Banco ainda no esquema anterior: grava as colunas essenciais.
        ({ error: dbError } = await supabase.from('consultations').insert({
          user_id: user.id,
          skin_tone: request.skinTone,
          skin_subtone: request.subtone,
          seasonal_palette: seasonName,
          occasion: request.occasion,
          time_of_day: request.timeOfDay,
          climate: request.climate,
          results: response.looks,
        }));
      }
      if (dbError) throw dbError;
      setSavedFor(current);
      toast('Looks guardados no seu acervo.', 'success');
    } catch {
      toast('Não foi possível salvar agora. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const restorePhotoReading = () => {
    if (!diagnosis) return;
    setTone(diagnosis.skinTone);
    setSubtone(diagnosis.subtone);
    setContrast(diagnosis.contrast ?? 'medio');
  };

  const viewKey = step === 2 ? (composing ? 'composing' : error ? 'error' : result ? 'looks' : 'composing') : `step-${step}`;

  let view: React.ReactNode;
  if (step === 0) {
    view = (
      <StepTone
        tone={tone}
        subtone={subtone}
        contrast={contrast}
        onToneChange={setTone}
        onSubtoneChange={setSubtone}
        onContrastChange={setContrast}
        weightKg={weightKg}
        heightCm={heightCm}
        age={age}
        gender={gender}
        bodyType={bodyType}
        onWeightChange={handleWeightChange}
        onHeightChange={handleHeightChange}
        onAgeChange={setAge}
        onGenderChange={setGender}
        onBodyTypeChange={setBodyType}
        diagnosis={diagnosis}
        onScan={() => openOverlay({ type: 'scanner' })}
        onRestorePhoto={restorePhotoReading}
        onContinue={() => goTo(1)}
      />
    );
  } else if (step === 1) {
    view = (
      <StepContext
        occasion={occasion}
        customVenue={customVenue}
        timeOfDay={timeOfDay}
        climate={climate}
        style={style}
        onOccasionChange={setOccasion}
        onVenueChange={setCustomVenue}
        onTimeChange={setTimeOfDay}
        onClimateChange={setClimate}
        onStyleChange={setStyle}
        onBack={() => goTo(0)}
        onCompose={() => void compose()}
        composing={composing}
      />
    );
  } else if (error && !composing) {
    view = (
      <div className="panel px-6 py-14 text-center sm:px-12" role="alert">
        <CircleAlert className="mx-auto h-6 w-6 text-danger" strokeWidth={1.5} aria-hidden />
        <p className="mt-4 text-2xl font-extrabold tracking-[-0.03em] text-ivory sm:text-3xl">A composição foi interrompida.</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist">{error}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => void compose()}>Tentar novamente</Button>
          <Button variant="ghost" onClick={() => goTo(1)}>
            Ajustar contexto
          </Button>
        </div>
      </div>
    );
  } else if (result && !composing) {
    view = (
      <StepLooks
        result={result.response}
        request={result.request}
        seasonName={result.seasonName}
        products={products}
        saving={saving}
        saved={savedFor === result}
        onSave={() => void save()}
        onAdjust={() => goTo(1)}
        onRestart={() => goTo(0)}
      />
    );
  } else {
    view = <ComposingState seasonName={getSeason(tone, subtone).name} />;
  }

  return (
    <section id="atelier" aria-labelledby="atelier-title" className="relative overflow-x-clip py-10 sm:py-14">
      <div className="glow-gold pointer-events-none absolute -left-40 top-10 h-[24rem] w-[24rem] opacity-60" aria-hidden />

      <div className="container-luxe relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <header className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Consultoria online</p>
            <h2
              id="atelier-title"
              className="mt-3 text-[clamp(1.6rem,3vw,2.3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-ivory"
            >
              Sua cartela, seu contexto, <span className="text-foil">seus looks</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-mist sm:text-base">
              Confirme sua pele e subtom (ou faça a leitura por foto), conte onde vai estar e receba três looks montados
              com peças da loja.
            </p>
          </header>
          <dl className="grid shrink-0 grid-cols-3 gap-5 border-l border-line-gold pl-5">
            {FACTS.map((f) => (
              <div key={f.label} className="flex flex-col-reverse">
                <dt className="mt-1 text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-mist">{f.label}</dt>
                <dd className="text-3xl font-extrabold leading-none tracking-[-0.03em] text-gold-light">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div ref={anchorRef} className="mt-10">
          <TapeMeasure steps={STEPS} current={step} onStepClick={goTo} canVisit={canVisit} />
        </div>

        <div className="relative mt-12">
          <AnimatePresence mode="wait" initial={false} custom={reduceMotion ? 0 : direction}>
            <motion.div
              key={viewKey}
              custom={reduceMotion ? 0 : direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.55, ease: EASE }}
            >
              {view}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
