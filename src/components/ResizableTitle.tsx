// ResizableTitle — draggable column header for Ant Design Table
// Uses react-resizable to add column width drag-resize support

import { Resizable } from 'react-resizable';
import type { ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface Props {
  onResize: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  width: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export default function ResizableTitle({ onResize, width, style, className, children, ...restProps }: Props) {
  if (width === undefined || width <= 0) {
    return <th {...restProps} style={style} className={className}>{children}</th>;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} style={{ ...style, overflow: 'hidden' }} className={className}>
        {children}
      </th>
    </Resizable>
  );
}
