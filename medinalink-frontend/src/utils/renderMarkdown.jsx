const isSep = (line) => /^[\s|:\-]+$/.test(line) && line.includes('-') && line.includes('|');
const isTableRow = (line) => line.includes('|') && line.split('|').length >= 3;
const parseRow = (line) => {
  const parts = line.split('|');
  const inner = (parts[0].trim() === '' && parts[parts.length - 1].trim() === '')
    ? parts.slice(1, -1)
    : parts[0].trim() === ''
    ? parts.slice(1)
    : parts[parts.length - 1].trim() === ''
    ? parts.slice(0, -1)
    : parts;
  return inner.map(c => c.trim());
};

export function renderInline(text, keyPrefix) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] !== undefined)      parts.push(<strong key={`${keyPrefix}-b${match.index}`}>{match[2]}</strong>);
    else if (match[3] !== undefined) parts.push(<em key={`${keyPrefix}-i${match.index}`}>{match[3]}</em>);
    else if (match[4] !== undefined) parts.push(<code key={`${keyPrefix}-c${match.index}`} style={{ background: '#edf2f7', borderRadius: '3px', padding: '1px 4px', fontSize: '0.85em' }}>{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function cleanContent(content) {
  let t = content
    .replace(/\\n/g, '\n')
    .replace(/\\\s*\n/g, '\n')
    .replace(/\\+\s*$/, '')   // strip trailing backslash(es)
    .trimEnd();
  // Ensure ends with sentence-closing punctuation
  if (t && !/[.!?…»\]]$/.test(t)) t += '.';
  return t;
}

export function renderMarkdown(content) {
  const normalized = cleanContent(content);
  const lines = normalized.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    if (isTableRow(lines[i]) && !isSep(lines[i])) {
      const block = [];
      while (i < lines.length && (isTableRow(lines[i]) || isSep(lines[i]))) {
        block.push(lines[i]);
        i++;
      }
      const sepIdx = block.findIndex(isSep);
      const headerLine = block[0];
      const dataLines = sepIdx >= 0
        ? block.slice(sepIdx + 1).filter(l => !isSep(l))
        : block.slice(1).filter(l => !isSep(l));

      const headers = parseRow(headerLine);
      const rows = dataLines.map(parseRow);

      elements.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '6px 0', borderRadius: '8px', border: '1px solid #cbd5e0', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', width: '100%', minWidth: '320px' }}>
            <thead>
              <tr>
                {headers.map((h, j) => (
                  <th key={j} style={{
                    padding: '7px 10px', textAlign: 'left', whiteSpace: 'nowrap',
                    background: '#1a365d', color: 'white',
                    borderRight: j < headers.length - 1 ? '1px solid #2b4a7e' : 'none',
                  }}>{renderInline(h, `th-${j}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#f7fafc' : 'white' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '5px 10px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
                      borderRight: ci < row.length - 1 ? '1px solid #e2e8f0' : 'none',
                    }}>{renderInline(cell, `td-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      const raw = lines[i].replace(/^#{1,6}\s+/, '');
      if (raw.trim()) {
        elements.push(
          <span key={`line-${i}`} style={{ whiteSpace: 'pre-wrap', display: 'block' }}>
            {renderInline(raw, `ln-${i}`)}
          </span>
        );
      } else {
        elements.push(<br key={`br-${i}`} />);
      }
      i++;
    }
  }
  return <>{elements}</>;
}
