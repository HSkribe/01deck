import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Upload, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import type { AgeRange } from '../services/backendApi';

// Rendered once, right after sign-in/sign-up and before the agent-creation
// OnboardingFlow -- see main.tsx's AppRoot. Not inside AppProvider (that only
// wraps <App/>), so this matches AuthModal's convention of hardcoded colors
// rather than useApp() theme tokens.

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_54', label: '45–54' },
  { value: '55_64', label: '55–64' },
  { value: '65_plus', label: '65+' },
];

const MAX_AVATAR_DIMENSION = 512;
const AVATAR_JPEG_QUALITY = 0.85;

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported.'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function HumanProfileStep({ onDone }: { onDone: () => void }) {
  const { updateProfile } = useAuth();
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const panelRef = useModalA11y<HTMLDivElement>({ isOpen: true, closeOnEscape: false });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    setAvatarError(null);
    try {
      setAvatarDataUrl(await resizeImageFile(file));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not process that image.');
    }
  };

  const handleContinue = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const result = await updateProfile({
      ...(ageRange ? { ageRange } : {}),
      ...(avatarDataUrl ? { avatarDataUrl } : {}),
    });
    setSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error || 'Something went wrong — try again.');
      return;
    }
    onDone();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Set up your profile"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: 32,
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Quick profile
          </div>
          <div style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>
            Before you create your first agent — a couple of quick, optional details about you.
          </div>
        </div>

        {/* Avatar upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              border: '1px dashed rgba(255,255,255,0.2)',
              background: avatarDataUrl ? 'transparent' : 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="Your avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Upload size={20} style={{ color: 'rgba(255,255,255,0.35)' }} />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {avatarDataUrl ? 'Photo added' : 'Upload a photo (optional)'}
            </span>
            {avatarDataUrl && (
              <button
                type="button"
                onClick={() => setAvatarDataUrl(null)}
                aria-label="Remove photo"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {avatarError && <p style={{ color: '#ef4444', fontSize: 11, marginTop: 6 }}>{avatarError}</p>}
        </div>

        {/* Age range */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Age range (optional)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {AGE_RANGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAgeRange(current => (current === value ? null : value))}
                style={{
                  height: 40,
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: ageRange === value ? 'rgba(99,132,255,0.18)' : '#181818',
                  border: `1px solid ${ageRange === value ? 'rgba(99,132,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: ageRange === value ? '#a5b4fc' : 'rgba(255,255,255,0.7)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {submitError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 16 }}>{submitError}</p>}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            type="button"
            onClick={onDone}
            disabled={submitting}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            Skip for now
          </button>
          <motion.button
            type="button"
            onClick={() => void handleContinue()}
            disabled={submitting}
            whileTap={{ scale: 0.98 }}
            style={{
              flex: 2,
              height: 44,
              borderRadius: 12,
              background: '#ffffff',
              border: 'none',
              color: '#000000',
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {submitting ? 'Saving...' : 'Continue'}
            {!submitting && <ArrowRight size={14} />}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
