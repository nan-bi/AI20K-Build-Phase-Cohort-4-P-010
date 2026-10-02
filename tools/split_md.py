from pathlib import Path
import re


SOURCE = Path("docs/SAD_v2.md")
OUTPUT = Path("ai-pack/sad")
MAX_BYTES = 12 * 1024
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
SECTION = re.compile(r"^#{1,2}\s+(.+?)\s*#*\s*$")


def byte_length(text):
    return len(text.encode("utf-8"))


def split_sections(lines):
    sections = []
    current = []
    title = "Mở đầu"
    start = 1
    for line_number, line in enumerate(lines, 1):
        match = SECTION.match(line.rstrip("\r\n"))
        if match:
            if current:
                sections.append((title, current, start, line_number - 1))
            title = match.group(1)
            current = [line]
            start = line_number
        else:
            if not current:
                start = line_number
            current.append(line)
    if current:
        sections.append((title, current, start, len(lines)))
    return sections


def paragraph_units(lines, start_line):
    units = []
    current = []
    current_start = start_line
    line_number = start_line
    for line in lines:
        if not line.strip() and current:
            current.append(line)
            units.append(("".join(current), current_start, line_number))
            current = []
            current_start = line_number + 1
        else:
            if not current:
                current_start = line_number
            current.append(line)
        line_number += 1
    if current:
        units.append(("".join(current), current_start, line_number - 1))
    return units


def split_long_unit(text, start_line, end_line, limit):
    pieces = []
    current = ""
    current_line = start_line
    line_number = start_line
    for line in text.splitlines(keepends=True):
        if byte_length(line) > limit:
            if current:
                pieces.append((current, current_line, line_number - 1))
                current = ""
            fragment = ""
            for char in line:
                if fragment and byte_length(fragment + char) > limit:
                    pieces.append((fragment, line_number, line_number))
                    fragment = ""
                fragment += char
            if fragment:
                pieces.append((fragment, line_number, line_number))
            current_line = line_number + 1
        elif current and byte_length(current + line) > limit:
            pieces.append((current, current_line, line_number - 1))
            current = line
            current_line = line_number
        else:
            if not current:
                current_line = line_number
            current += line
        line_number += 1
    if current:
        pieces.append((current, current_line, end_line))
    return pieces


def bounded_parts(lines, start_line, limit):
    units = paragraph_units(lines, start_line)
    expanded = []
    for text, first, last in units:
        if byte_length(text) > limit:
            expanded.extend(split_long_unit(text, first, last, limit))
        else:
            expanded.append((text, first, last))

    parts = []
    content = ""
    first_line = start_line
    last_line = start_line
    for text, first, last in expanded:
        if content and byte_length(content + text) > limit:
            parts.append((content, first_line, last_line))
            content = ""
        if not content:
            first_line = first
        content += text
        last_line = last
    if content:
        parts.append((content, first_line, last_line))
    return parts


def slugify(title):
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "section"


def main():
    if not SOURCE.is_file():
        raise SystemExit(f"Không tìm thấy nguồn: {SOURCE}")
    lines = SOURCE.read_text(encoding="utf-8").splitlines(keepends=True)
    if OUTPUT.exists() and any(OUTPUT.iterdir()):
        raise SystemExit(f"Thư mục đích không rỗng, giữ nguyên mọi file hiện có: {OUTPUT}")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    entries = []
    index = 1
    for section_title, section_lines, start, _ in split_sections(lines):
        available = MAX_BYTES - 100
        parts = bounded_parts(section_lines, start, available)
        for content, first, last in parts:
            heading = next(
                (match.group(2) for line in content.splitlines() if (match := HEADING.match(line))),
                section_title,
            )
            if len(parts) > 1 and heading == section_title:
                heading = f"{section_title} tiếp {index}"
            provenance = f"<!-- nguồn: docs/SAD_v2.md, dòng {first}–{last} -->\n"
            output_text = provenance + content
            filename = f"{index:02d}_{slugify(heading)}.md"
            (OUTPUT / filename).write_text(output_text, encoding="utf-8", newline="")
            entries.append((index, heading, filename, byte_length(output_text), last - first + 1))
            index += 1

    index_lines = ["# SAD v2: lát cắt", "", "| STT | Tiêu đề | File | Dung lượng (byte) | Số dòng |", "|---:|---|---|---:|---:|"]
    for number, title, filename, size, line_count in entries:
        index_lines.append(f"| {number:02d} | {title} | `{filename}` | {size} | {line_count} |")
    (OUTPUT / "_INDEX.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")

    total_bytes = sum(item[3] for item in entries)
    print(f"files={len(entries)} total_bytes={total_bytes}")


if __name__ == "__main__":
    main()