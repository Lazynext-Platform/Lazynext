import { useState } from 'react';
import type { Proposal } from '../../agent/proposal';
import { useT } from '../../i18n/locale';
import { Icon } from '../icons';

export function ProposalCard({ proposal, onApply, onReject, onPreview, stale, onForceApply, onRePropose }: {
  proposal: Proposal;
  onApply: (selected: Set<number>) => void;
  onReject: () => void;
  onPreview: (on: boolean) => void;
  /** Proposal expiration (staleness): Real time footer change, still apply/re-propose/cancel three choices */
  stale?: boolean;
  onForceApply?: (selected: Set<number>) => void;
  onRePropose?: () => void;
}) {
  const t = useT();
  const ops = proposal.options[0].operations;
  const [selected, setSelected] = useState<Set<number>>(() => new Set(ops.map((_, i) => i)));
  const [preview, setPreview] = useState(false);

  const toggle = (i: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const selectAll = () => setSelected(new Set(ops.map((_, i) => i)));
  const selectNone = () => setSelected(new Set());
  const togglePreview = () => {
    const on = !preview;
    setPreview(on);
    onPreview(on);
  };
  const apply = () => { onPreview(false); onApply(selected); };
  const reject = () => { onPreview(false); onReject(); };

  const allOn = selected.size === ops.length;
  const noneOn = selected.size === 0;

  return (
    <div className="ln-proposal">
      <header className="ln-proposal-head">
        <div className="ln-proposal-head-left">
          <span className="ln-proposal-icon" aria-hidden>
            <Icon name="sparkles" size={14} />
          </span>
          <div className="ln-proposal-titles">
            <div className="ln-proposal-title-row">
              <h3 className="ln-proposal-title">{proposal.title || t('Edit proposal')}</h3>
              <span className="ln-proposal-badge">{t('Pending review')}</span>
            </div>
            {proposal.summary ? (
              <p className="ln-proposal-summary">{proposal.summary}</p>
            ) : null}
          </div>
        </div>
        {proposal.totalImpact ? (
          <span className="ln-proposal-impact" title={t('Impact')}>{proposal.totalImpact}</span>
        ) : null}
      </header>

      <div className="ln-proposal-ops-bar">
        <span className="ln-proposal-ops-label">
          {t('Will apply')} <strong>{selected.size}</strong> {t('of {total} ops', { total: ops.length })}
        </span>
        <div className="ln-proposal-ops-actions">
          <button type="button" className="ln-proposal-link" onClick={selectAll} disabled={allOn}>{t('Select all')}</button>
          <button type="button" className="ln-proposal-link" onClick={selectNone} disabled={noneOn}>{t('Clear')}</button>
        </div>
      </div>

      <ul className="ln-proposal-list">
        {ops.map((op, i) => {
          const on = selected.has(i);
          return (
            <li key={i} className={`ln-proposal-op${on ? '' : ' off'}`}>
              <label className="ln-proposal-op-label">
                <input
                  type="checkbox"
                  className="ln-proposal-check"
                  checked={on}
                  onChange={() => toggle(i)}
                />
                <span className="ln-proposal-check-ui" aria-hidden />
                <span className="ln-proposal-op-body">
                  <span className="ln-proposal-op-main">
                    <span className="ln-proposal-op-action">
                      {op.action}{(op.callCount ?? 1) > 1 ? ` ×${op.callCount}` : ''}
                    </span>
                    <span className="ln-proposal-op-target" title={op.target}>{op.target}</span>
                  </span>
                  <span className="ln-proposal-op-meta">
                    <span className="ln-proposal-tool">{op.tool}</span>
                    {op.impact ? <span className="ln-proposal-op-impact">{op.impact}</span> : null}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {stale && (
        <div className="ln-proposal-warning" role="alert">
          {t('The project changed after this proposal was generated — applying as-is may land edits in the wrong place.')}
        </div>
      )}
      <footer className="ln-proposal-foot">
        <button
          type="button"
          className={`ln-proposal-preview${preview ? ' on' : ''}`}
          onClick={togglePreview}
          title={t('Preview the result in the player (does not change the real timeline)')}
        >
          <span className="ln-proposal-preview-dot" />
          {preview ? t('Previewing') : t('Preview result')}
        </button>
        <div className="ln-proposal-foot-right">
          <button type="button" className="ln-proposal-reject" onClick={reject}>{stale ? t('Cancel') : t('Reject')}</button>
          {stale ? (
            <>
              {onRePropose && (
                <button type="button" className="ln-proposal-reject" onClick={() => { onPreview(false); onRePropose(); }}>{t('Re-propose')}</button>
              )}
              <button type="button" className="ln-proposal-apply" disabled={noneOn}
                onClick={() => { onPreview(false); onForceApply?.(selected); }}>
                {t('Apply anyway')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="ln-proposal-apply"
              disabled={noneOn}
              onClick={apply}
            >
              {t('Apply')}{noneOn ? '' : ` ${selected.size}`}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
