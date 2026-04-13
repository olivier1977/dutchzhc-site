/**
 * Public TRA score profile page — no login required.
 * Route: /public/agents/:id/tra-score
 */

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Shield, Bot, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
const api = axios.create({ baseURL: API_BASE });

const RATING_COLORS: Record<string, { text: string; bg: string }> = {
  AAA: { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  AA:  { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  A:   { text: 'text-green-400',   bg: 'bg-green-400/10' },
  BBB: { text: 'text-amber-400',   bg: 'bg-amber-400/10' },
  BB:  { text: 'text-amber-400',   bg: 'bg-amber-400/10' },
  B:   { text: 'text-orange-400',  bg: 'bg-orange-400/10' },
  C:   { text: 'text-red-400',     bg: 'bg-red-400/10' },
  D:   { text: 'text-red-600',     bg: 'bg-red-900/20' },
};

interface TraProfile {
  agent: { id: string; name: string; role: string; did: string | null; status: string };
  traScore: {
    total: number;
    rating: string;
    components: { identityProof: number; governanceCoverage: number; operationalTrackRecord: number; transparency: number };
    assessedAt: string;
    version: number;
  } | null;
  badgeUrl: string;
  profileUrl: string;
}

export default function PublicTraProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<TraProfile>({
    queryKey: ['public-tra-profile', id],
    queryFn: () => api.get(`/api/public/agents/${id}/tra-score`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-gray-400 text-sm">
        Loading TRA profile…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-medium">Agent not found</p>
          <p className="text-gray-500 text-sm mt-1">This TRA profile does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const { agent, traScore, badgeUrl } = data;
  const ratingStyle = traScore ? (RATING_COLORS[traScore.rating] ?? RATING_COLORS['D']) : null;
  const pageUrl = `${window.location.origin}/public/agents/${agent.id}/tra-score`;
  const apiBadgeUrl = `${API_BASE}/api/public/agents/${agent.id}/badge.svg`;

  const embedMarkdown = `[![TRA Score](${apiBadgeUrl})](${pageUrl})`;
  const embedHtml = `<a href="${pageUrl}"><img src="${apiBadgeUrl}" alt="TRA Score: ${traScore?.total ?? 'N/A'} ${traScore?.rating ?? ''}" /></a>`;

  const layers = traScore ? [
    { label: 'Identity Proof', score: traScore.components.identityProof, max: 25 },
    { label: 'Governance Coverage', score: traScore.components.governanceCoverage, max: 40 },
    { label: 'Operational Track Record', score: traScore.components.operationalTrackRecord, max: 25 },
    { label: 'Transparency', score: traScore.components.transparency, max: 10 },
  ] : [];

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Shield className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-semibold text-gray-300">ZHC Governance · TRA Profile</span>
          <a href="/" className="ml-auto text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
            Open Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Agent header */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Bot className="h-7 w-7 text-gray-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-sm text-gray-400 capitalize mt-0.5">{agent.role.replace('_', ' ')}</p>
            {agent.did && (
              <code className="text-xs text-cyan-300 font-mono mt-1.5 block truncate">{agent.did}</code>
            )}
          </div>
          {traScore && ratingStyle && (
            <div className={clsx('flex flex-col items-center px-5 py-3 rounded-2xl', ratingStyle.bg)}>
              <span className={clsx('text-4xl font-black', ratingStyle.text)}>{traScore.rating}</span>
              <span className="text-xs text-gray-500 mt-0.5">{traScore.total}/100</span>
            </div>
          )}
        </div>

        {/* Score breakdown */}
        {traScore ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5">
            <h2 className="text-sm font-semibold mb-4">Score Breakdown</h2>
            <div className="space-y-3">
              {layers.map(({ label, score, max }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-xs font-medium text-white">{score} / {max}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        (score / max) >= 0.75 ? 'bg-emerald-400' :
                        (score / max) >= 0.5 ? 'bg-amber-400' : 'bg-red-400',
                      )}
                      style={{ width: `${(score / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
              <span>Version {traScore.version}</span>
              <span>Assessed {new Date(traScore.assessedAt).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No TRA assessment has been run for this agent yet.</p>
          </div>
        )}

        {/* Embed snippet */}
        {traScore && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5">
            <h2 className="text-sm font-semibold mb-3">Embed Badge</h2>

            {/* Badge preview */}
            <div className="mb-4 flex items-center gap-3">
              <img src={`${API_BASE}${badgeUrl}`} alt="TRA Score Badge" className="rounded" />
              <a href={pageUrl} target="_blank" rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                View public profile <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Markdown</p>
                <EmbedCodeBlock code={embedMarkdown} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">HTML</p>
                <EmbedCodeBlock code={embedHtml} />
              </div>
            </div>
          </div>
        )}

        {/* Verification status */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
          Verified by ZHC Governance Dashboard
        </div>
      </div>
    </div>
  );
}

function EmbedCodeBlock({ code }: { code: string }) {
  const copy = () => navigator.clipboard.writeText(code).catch(() => null);

  return (
    <div className="relative group">
      <pre className="text-[10px] text-cyan-300 font-mono bg-white/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-white/10 text-[10px] text-gray-300 hover:bg-white/20"
      >
        Copy
      </button>
    </div>
  );
}
