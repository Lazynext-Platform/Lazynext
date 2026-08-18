import { useT } from '../i18n/locale';

type DesktopWindowAction = 'close' | 'minimize' | 'toggle-maximize';

interface DesktopWindowControlButtonsProps {
  translate: (text: string) => string;
  onAction: (action: DesktopWindowAction) => void;
}

export function DesktopWindowControlButtons({
  translate,
  onAction,
}: DesktopWindowControlButtonsProps) {
  return (
    <div className="ln-window-controls" aria-label={translate('Window controls')}>
      <button
        type="button"
        className="ln-window-control ln-window-control--close ln-tip"
        aria-label={translate('Close window')}
        data-tip={translate('Close window')}
        onClick={() => onAction('close')}
      >
        <span className="ln-window-control-glyph" aria-hidden="true">×</span>
      </button>
      <button
        type="button"
        className="ln-window-control ln-window-control--minimize ln-tip"
        aria-label={translate('Minimize window')}
        data-tip={translate('Minimize window')}
        onClick={() => onAction('minimize')}
      >
        <span className="ln-window-control-glyph" aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        className="ln-window-control ln-window-control--maximize ln-tip"
        aria-label={translate('Zoom window')}
        data-tip={translate('Zoom window')}
        onClick={() => onAction('toggle-maximize')}
      >
        <span className="ln-window-control-glyph" aria-hidden="true">+</span>
      </button>
    </div>
  );
}

export function DesktopWindowControls() {
  const t = useT();
  const desktop = window.lazynextDesktop;
  if (desktop?.platform !== 'darwin') return null;

  return (
    <DesktopWindowControlButtons
      translate={t}
      onAction={(action) => { void desktop.windowAction(action); }}
    />
  );
}
