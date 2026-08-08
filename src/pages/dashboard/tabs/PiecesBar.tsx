// PiecesBar — visual representation of torrent piece completion
// Renders colored <i> elements matching old version's filter:saturate approach

interface Props {
  pieces: string;       // base64-encoded bitfield
  pieceCount: number;
  pieceSize: number;
}

const MAX_CELLS = 500;

/**
 * Decode a base64 bitfield string into a boolean array.
 * Each bit represents whether a piece has been downloaded.
 */
function decodeBitfield(base64: string, pieceCount: number): boolean[] {
  try {
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }
    const flags: boolean[] = [];
    for (let i = 0; i < pieceCount; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      if (byteIndex < bytes.length) {
        flags.push((bytes[byteIndex] & (1 << bitIndex)) !== 0);
      } else {
        flags.push(false);
      }
    }
    return flags;
  } catch {
    return [];
  }
}

export default function PiecesBar({ pieces, pieceCount, pieceSize }: Props) {
  if (!pieces || pieceCount <= 0) return null;

  const flags = decodeBitfield(pieces, pieceCount);
  const piecePerCell = Math.ceil((MAX_CELLS - 1 + pieceCount) / MAX_CELLS);
  const cellSize = pieceSize * piecePerCell;

  const cells: { percent: number; title: string }[] = [];
  let i = 0;
  while (i < pieceCount) {
    let done = 0;
    const start = i;
    while (i < pieceCount && i < start + piecePerCell) {
      if (flags[i]) done++;
      i++;
    }
    const percent = i <= pieceCount
      ? Math.round((done / (i - start)) * 100)
      : 100;
    cells.push({
      percent,
      title: `${formatCellSize(cellSize)} × ${percent}%`,
    });
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, padding: '2px 0' }}>
      {cells.map((cell, idx) => (
        <i
          key={idx}
          title={cell.title}
          style={{
            display: 'inline-block',
            width: 8,
            height: 12,
            backgroundColor: 'hsl(200, 80%, 40%)',
            filter: `saturate(${cell.percent / 100})`,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function formatCellSize(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}
