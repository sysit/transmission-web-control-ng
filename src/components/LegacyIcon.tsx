// LegacyIcon — renders old Transmission Web Control iconfont vector icons
// Usage: <LegacyIcon name="start" size={16} />
// The iconfont.css file defines .iconfont (base) and .tr-icon-* (glyph) classes.
// Using <i> with iconfont classes preserves the authentic industrial vector look.
import type { CSSProperties } from 'react';
import { getIcon } from './icon-map';

interface Props {
  name: string;
  size?: number;
  style?: CSSProperties;
  className?: string;
  title?: string;
}

export default function LegacyIcon({ name, size = 16, style, className, title }: Props) {
  const def = getIcon(name);
  if (!def) {
    return null;
  }

  const cls = `iconfont ${def.className}${className ? ` ${className}` : ''}`;

  return (
    <i
      className={cls}
      title={title ?? def.alt}
      aria-label={def.alt}
      style={{
        fontSize: size,
        lineHeight: 1,
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}
