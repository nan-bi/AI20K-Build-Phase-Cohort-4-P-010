import type { ReactNode } from "react";

/**
 * Bộ đọc markdown tối giản cho văn bản pháp lý trong `legal/` (tiêu đề, đoạn, danh sách, trích dẫn, bảng, đường kẻ;
 * inline **đậm**, *nghiêng*, `mã`). Dựng phần tử React trực tiếp — không HTML thô, không `dangerouslySetInnerHTML`.
 */
export function renderMarkdown(src: string): ReactNode[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const isTable = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isBullet = (l: string) => /^\s*[*+-]\s+/.test(l);
  const isOrdered = (l: string) => /^\s*\d+[.)]\s+/.test(l);
  const isHr = (l: string) => /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
  const isBlockStart = (l: string) => /^#{1,6}\s/.test(l) || isHr(l) || isBullet(l) || isOrdered(l) || isTable(l) || /^\s*>/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(h[1].length, 4);
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      out.push(<Tag key={key++}>{inline(h[2])}</Tag>);
      i++;
      continue;
    }

    if (isHr(line)) {
      out.push(<hr key={key++} />);
      i++;
      continue;
    }

    if (isTable(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTable(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={key++} style={{ overflowX: "auto", marginBottom: 10 }}>
          <table className="legal-table">
            <thead>
              <tr>{head?.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (isBullet(line) || isOrdered(line)) {
      const ordered = isOrdered(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? isOrdered(lines[i]) : isBullet(lines[i]))) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[*+-]\s+/, ""));
        i++;
        // Dòng tiếp nối thụt lề thuộc cùng mục.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !isBullet(lines[i]) && !isOrdered(lines[i])) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        }
      }
      const List = ordered ? "ol" : "ul";
      out.push(
        <List key={key++}>
          {items.map((t, j) => (
            <li key={j}>{inline(t)}</li>
          ))}
        </List>,
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(<blockquote key={key++}>{inline(quote.join(" "))}</blockquote>);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++].trim());
    out.push(<p key={key++}>{inline(para.join(" "))}</p>);
  }
  return out;
}

/** Inline: ***đậm nghiêng***, **đậm**, *nghiêng* / _nghiêng_, `mã`. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("***")) parts.push(<strong key={k++}><em>{tok.slice(3, -3)}</em></strong>);
    else if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
