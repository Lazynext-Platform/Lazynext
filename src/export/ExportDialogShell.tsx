import type { ReactNode } from 'react';
import { Icon } from '../components/icons';
import type { TimelineState } from '../editor/types';
import { useT } from '../i18n/locale';
import { EXPORT_TABS } from './useExportDialogModel';
import type { ExportTab } from './useExportWorkflow';

interface ExportDialogShellProps {
  base: string;
  state: TimelineState;
  onClose: () => void;
  children: ReactNode;
}

function ExportDialogHeader({ base, state, onClose }: Omit<ExportDialogShellProps, 'children'>) {
  const t = useT();
  return (
    <header className="ln-export-header">
      <div>
        <h2 id="ln-export-title">{t('Export')}</h2>
        <p>{base} · {state.width}×{state.height} · {state.fps} fps</p>
      </div>
      <button type="button" className="ln-export-close" onClick={onClose} title={t('Close')}>
        <Icon name="x" size={16} />
      </button>
    </header>
  );
}

export function ExportDialogShell({ base, state, onClose, children }: ExportDialogShellProps) {
  return (
    <div className="ln-export-overlay" onClick={onClose}>
      <div
        className="ln-export-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ln-export-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ExportDialogHeader base={base} state={state} onClose={onClose} />
        <div className="ln-export-layout">{children}</div>
      </div>
    </div>
  );
}

interface ExportSidebarProps {
  tab: ExportTab;
  busy: boolean;
  onTabChange: (tab: ExportTab) => void;
}

export function ExportSidebar({ tab, busy, onTabChange }: ExportSidebarProps) {
  const t = useT();
  return (
    <aside className="ln-export-sidebar">
      <span className="ln-export-sidebar-label">{t('Output type')}</span>
      <div className="ln-export-tabs" role="tablist" aria-label={t('Output type')}>
        {EXPORT_TABS.map((entry) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            aria-controls={`ln-export-content-${entry.key}`}
            id={`ln-export-tab-${entry.key}`}
            key={entry.key}
            className={`ln-export-tab${tab === entry.key ? ' active' : ''}`}
            onClick={() => onTabChange(entry.key)}
            disabled={busy}
          >
            <span className="ln-export-tab-icon"><Icon name={entry.icon} size={15} /></span>
            <span><strong>{t(entry.label)}</strong><small>{entry.summary}</small></span>
          </button>
        ))}
      </div>
    </aside>
  );
}
