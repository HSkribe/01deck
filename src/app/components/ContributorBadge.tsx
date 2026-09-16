import React from 'react';
import { Medal } from 'lucide-react';

// Warm gold, deliberately its own color rather than reused from
// rarityConfig or the verification palette — this badge needs to read as
// "this agent identity earned recognition for doing something" (see
// contributorCredit in src/app/data/agents.ts), not as a rarity tier
// (Common→Legend, driven by rarityConfig) and not as an identity/protocol
// trust claim (Verified/Self-Signed/Unverified, driven by
// verification.status). The Medal icon is likewise unique in this app —
// distinct from ShieldCheck/ShieldAlert (trust) and Sparkles/Dna (created,
// evolution).
const GOLD = {
  background: 'rgba(240,180,41,0.14)',
  border: 'rgba(240,180,41,0.4)',
  color: '#f7c948',
};

interface ContributorBadgeProps {
  awardedFor: string;
  /** 'tag' matches the small inline pills in AgentBar rows (CREATED, VERIFIED, ...).
   *  'pill' matches the larger rounded-full pills on the card front (01P Verified, evolution stage). */
  variant?: 'tag' | 'pill';
}

export function ContributorBadge({ awardedFor, variant = 'tag' }: ContributorBadgeProps) {
  const tooltip = `Contributor Credit — ${awardedFor}`;

  if (variant === 'pill') {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em]"
        style={{ background: GOLD.background, border: `1px solid ${GOLD.border}`, color: GOLD.color }}
        title={tooltip}
      >
        <Medal size={11} />
        <span>Contributor</span>
      </div>
    );
  }

  return (
    <span
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-none"
      style={{ background: GOLD.background, border: `1px solid ${GOLD.border}`, color: GOLD.color }}
      title={tooltip}
    >
      <Medal size={8} />
      CONTRIBUTOR
    </span>
  );
}
