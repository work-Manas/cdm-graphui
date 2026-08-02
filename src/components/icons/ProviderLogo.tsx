"use client";

import type { ProviderId } from "@/types/architecture";
import { PROVIDERS } from "@/lib/constants";

type Props = {
  provider: ProviderId | string;
  size?: number;
  className?: string;
};

// ponytail: colored-monochrome logos via Iconify API ?color= query (single-path,
// fill=currentColor swapped to brand hex server-side). No local assets, no deps.
// Fallback ladder: lineicons -> simple-icons -> mdi -> generic cloud glyph.

const API = "https://api.iconify.design";

const LADDER: Record<string, string[]> = {
  aws:          ["lineicons/aws", "mdi/amazon"],
  azure:        ["lineicons/azure", "mdi/microsoft-azure"],
  gcp:          ["lineicons/google-cloud", "mdi/google-cloud"],
  nvidia:       ["lineicons/nvidia"],
  cloudflare:   ["lineicons/cloudflare"],
  vercel:       ["lineicons/vercel"],
  docker:       ["lineicons/docker"],
  kubernetes:   ["lineicons/kubernetes"],
  supabase:     ["lineicons/supabase"],
  heroku:       ["simple-icons/heroku"],
  linode:       ["mdi/linode"],
  netlify:      ["lineicons/netlify"],
  openai:       ["simple-icons/openai"],
  redis:        ["simple-icons/redis"],
  postgresql:   ["lineicons/postgresql"],
  rabbitmq:     ["simple-icons/rabbitmq", "mdi/rabbit"],
  digitalocean: ["lineicons/digitalocean"],
};

const GENERIC = "mdi/cloud-outline";

function url(icon: string, hex: string) {
  return `${API}/${icon}.svg?color=${encodeURIComponent(hex)}`;
}

export function ProviderLogo({ provider, size = 14, className }: Props) {
  const ladder = LADDER[provider] ? [...LADDER[provider], GENERIC] : [GENERIC];
  const brand = PROVIDERS[provider as ProviderId]?.color ?? "#a1a1aa";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url(ladder[0], brand)}
      width={size}
      height={size}
      data-ladder={JSON.stringify(ladder.slice(1))}
      data-brand={brand}
      data-idx="0"
      alt={`${provider} logo`}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
      onError={(e) => {
        const img = e.currentTarget;
        let remaining: string[] = [];
        try { remaining = JSON.parse(img.dataset.ladder ?? "[]"); } catch {}
        if (remaining.length) {
          const next = remaining[0];
          img.dataset.ladder = JSON.stringify(remaining.slice(1));
          img.src = url(next, img.dataset.brand ?? brand);
        }
      }}
    />
  );
}
