import { useT } from '../i18n/locale';
import { Icon } from '../components/icons';
import { runAssetDestinationAction, type AssetDestinationActions } from './assetDestination';

interface AssetMenuDestinationsProps {
  assetName: string;
  onAddTimeline: () => void;
  onAddChat: () => void;
}

export function AssetMenuDestinations({
  assetName,
  onAddTimeline,
  onAddChat,
}: AssetMenuDestinationsProps) {
  const t = useT();
  const actions: AssetDestinationActions = {
    timeline: onAddTimeline,
    chat: onAddChat,
  };

  return (
    <div className="ln-asset-menu-destinations">
      <span>{t('Add to:')}</span>
      <div className="ln-asset-menu-destination-buttons">
        <button
          type="button"
          className="ln-media-menu-item"
          role="menuitem"
          aria-label={t('Add {name} to AI chat', { name: assetName })}
          onClick={() => runAssetDestinationAction('chat', actions)}
        >
          <span className="ln-media-menu-item-icon" aria-hidden="true"><Icon name="sparkles" size={15} /></span>
          <span className="ln-media-menu-item-label">{t('AI chat')}</span>
        </button>
        <button
          type="button"
          className="ln-media-menu-item"
          role="menuitem"
          aria-label={t('Add {name} to timeline', { name: assetName })}
          onClick={() => runAssetDestinationAction('timeline', actions)}
        >
          <span className="ln-media-menu-item-icon" aria-hidden="true"><Icon name="film" size={15} /></span>
          <span className="ln-media-menu-item-label">{t('Timeline')}</span>
        </button>
      </div>
    </div>
  );
}
