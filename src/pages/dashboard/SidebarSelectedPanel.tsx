// SidebarSelectedPanel — sidebar-bottom panel listing checked torrents.
// Mirrors old showCheckedInStatus(): the #m_status south region with a
// "状态"/"Status" panel title bar, a "已选中 N 条数据：" line, a numbered
// plain-text list, and the floating cancel button (#button-cancel-checked)
// pinned at bottom-right.
import { useMemo } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import LegacyIcon from '@/components/LegacyIcon';
import type { TorrentCollection } from '@/core/rpc/rpc-types';

interface Props {
  selectedIds: number[];
  collection: TorrentCollection | null;
  onClear: () => void;
  onCollapse: () => void;
}

export default function SidebarSelectedPanel({ selectedIds, collection, onClear, onCollapse }: Props) {
  const { t } = useTranslation();

  const items = useMemo(() => {
    return selectedIds.map((id, i) => ({
      id,
      index: i + 1,
      name: collection?.all[id]?.name ?? `#${id}`,
    }));
  }, [selectedIds, collection]);

  return (
    <div className="sidebar-selected-panel">
      {/* Panel title bar — old #m_status header, title set to lang.title.status */}
      <div className="sidebar-selected-header">
        <span className="sidebar-selected-title">{t('title.status')}</span>
        <button
          type="button"
          className="sidebar-selected-collapse"
          title={t('sidebar.collapsePanel')}
          onClick={onCollapse}
        >
          <span className="sidebar-selected-collapse-glyph">∨∨</span>
        </button>
      </div>

      {/* Body: count line + numbered list */}
      <div className="sidebar-selected-body">
        <div className="sidebar-selected-count">
          {t('sidebar.selected', { count: items.length })}
        </div>
        <div className="sidebar-selected-list">
          {items.map((it) => (
            <div key={it.id} className="sidebar-selected-item" title={it.name}>
              <span className="sidebar-selected-idx">{it.index}.</span>
              <span className="sidebar-selected-name">{it.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating cancel button — old #button-cancel-checked, absolute right:5px bottom:5px */}
      <Button
        className="sidebar-selected-cancel"
        size="small"
        icon={<LegacyIcon name="cancel" size={13} />}
        title={t('sidebar.clearSelected')}
        onClick={onClear}
      />
    </div>
  );
}
