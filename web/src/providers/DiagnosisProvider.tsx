'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { Diagnosis } from '@/lib/types';
import { getSeason, isContrast, isSkinToneId, isSubtone } from '@/lib/stylist/knowledge';
import { useHydrated, useLocalValue, writeLocal } from '@/lib/local-store';
import { useSession } from './SessionProvider';

const DIAGNOSIS_KEY = 'titis:diagnosis:v1';
const FACE_KEY = 'titis:face:v1';

interface DiagnosisValue {
  diagnosis: Diagnosis | null;
  /** Salva no navegador e, se houver login, no perfil do Supabase. */
  setDiagnosis: (d: Diagnosis | null) => void;
  /** Foto do rosto (data URL comprimido) — fica somente neste navegador. */
  faceImage: string | null;
  setFaceImage: (dataUrl: string | null) => void;
  ready: boolean;
}

const DiagnosisContext = createContext<DiagnosisValue | null>(null);

function parseDiagnosis(raw: string | null): Diagnosis | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Diagnosis;
    return isSkinToneId(parsed?.skinTone) && isSubtone(parsed?.subtone) ? parsed : null;
  } catch {
    return null;
  }
}

/** Monta um diagnóstico a partir de tom + subtom usando a cartela da estação. */
export function diagnosisFromChoice(
  skinTone: Diagnosis['skinTone'],
  subtone: Diagnosis['subtone'],
  contrast: Diagnosis['contrast'] = 'medio',
): Diagnosis {
  const season = getSeason(skinTone, subtone);
  return {
    skinTone,
    subtone,
    contrast,
    season: season.name,
    palette: [...season.palette, ...season.neutrals],
    avoid: season.avoid,
    notes: season.note,
    recommendations: [],
    source: 'manual',
    createdAt: new Date().toISOString(),
  };
}

export function DiagnosisProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, updateProfile } = useSession();
  const ready = useHydrated();
  const rawDiagnosis = useLocalValue(DIAGNOSIS_KEY);
  const faceImage = useLocalValue(FACE_KEY);
  const diagnosis = useMemo(() => parseDiagnosis(rawDiagnosis), [rawDiagnosis]);

  /** Conta cujo perfil já foi consultado (ou cuja cartela foi alterada manualmente). */
  const settledFor = useRef<string | null>(null);

  // Sem diagnóstico local? Recupera uma única vez por conta o que estiver salvo no perfil.
  useEffect(() => {
    if (!ready || diagnosis || !profile || settledFor.current === profile.id) return;
    settledFor.current = profile.id;
    if (isSkinToneId(profile.preferred_skin_tone) && isSubtone(profile.skin_subtone)) {
      const d = diagnosisFromChoice(
        profile.preferred_skin_tone,
        profile.skin_subtone,
        isContrast(profile.contrast_level) ? profile.contrast_level : 'medio',
      );
      writeLocal(DIAGNOSIS_KEY, JSON.stringify(d));
    }
  }, [ready, diagnosis, profile]);

  const setDiagnosis = useCallback(
    (d: Diagnosis | null) => {
      // Uma escolha explícita (inclusive apagar) não deve ser sobrescrita pelo perfil depois.
      if (user) settledFor.current = user.id;
      writeLocal(DIAGNOSIS_KEY, d ? JSON.stringify(d) : null);
      if (d && user) {
        void updateProfile({
          preferred_skin_tone: d.skinTone,
          skin_subtone: d.subtone,
          contrast_level: d.contrast,
          seasonal_palette: d.season,
        });
      }
    },
    [user, updateProfile],
  );

  const setFaceImage = useCallback((dataUrl: string | null) => {
    writeLocal(FACE_KEY, dataUrl);
  }, []);

  const value = useMemo(
    () => ({ diagnosis, setDiagnosis, faceImage, setFaceImage, ready }),
    [diagnosis, setDiagnosis, faceImage, setFaceImage, ready],
  );

  return <DiagnosisContext.Provider value={value}>{children}</DiagnosisContext.Provider>;
}

export function useDiagnosis(): DiagnosisValue {
  const ctx = useContext(DiagnosisContext);
  if (!ctx) throw new Error('useDiagnosis deve ser usado dentro de <DiagnosisProvider>.');
  return ctx;
}
