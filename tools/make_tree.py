import argparse
from collections import Counter
from pathlib import Path


SKIP_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".idea",
    ".vscode",
    ".next",
}
TEXT_EXTENSIONS = {".py", ".js", ".ts", ".md", ".json", ".yml", ".yaml", ".sql", ".txt"}
DATA_EXTENSIONS = {".pdf", ".docx", ".csv", ".xlsx"}
DATA_NAME_PARTS = ("hợp đồng", "data", "dataset", "raw", "uploads")
MAX_DEPTH = 4
MAX_FILE_SIZE = 200 * 1024


def entries_in(directory):
    try:
        return sorted(directory.iterdir(), key=lambda item: (not item.is_dir(), item.name.casefold()))
    except OSError:
        return []


def is_directory(path):
    return path.is_dir() and not path.is_symlink()


def extension_label(path):
    return path.suffix.lower() or "[không đuôi]"


def protected_directory(path, entries):
    if any(part in path.name.casefold() for part in DATA_NAME_PARTS):
        return True
    return any(entry.is_file() and entry.suffix.lower() in DATA_EXTENSIONS for entry in entries)


def protected_summary(directory):
    counts = Counter()
    samples = []
    total = 0

    def scan(current):
        nonlocal total
        try:
            children = sorted(current.iterdir(), key=lambda item: item.name.casefold())
        except OSError:
            return
        for child in children:
            if is_directory(child):
                if child.name not in SKIP_DIRS:
                    scan(child)
            elif child.is_file():
                total += 1
                counts[extension_label(child)] += 1
                if len(samples) < 3:
                    samples.append(str(child.relative_to(directory)))

    scan(directory)
    extensions = ", ".join(f"{key}={value}" for key, value in sorted(counts.items()))
    sample_text = "; mẫu: " + ", ".join(samples) if samples else ""
    return f"[{total} file: {extensions or 'không có đuôi'}{sample_text}]"


def file_description(path):
    try:
        size = path.stat().st_size
    except OSError:
        return f"{path.name} [CHƯA RÕ]"

    if path.suffix.lower() not in TEXT_EXTENSIONS:
        return path.name
    size_text = f"{size / 1024:.1f} KB"
    if size > MAX_FILE_SIZE:
        return f"{path.name} ({size_text}; bỏ qua >200KB)"

    try:
        with path.open("r", encoding="utf-8", errors="replace") as source:
            line_count = sum(1 for _ in source)
    except OSError:
        return f"{path.name} ({size_text}; CHƯA RÕ số dòng)"
    return f"{path.name} ({size_text}; {line_count} dòng)"


def file_group_summary(files):
    counts = Counter(extension_label(path) for path in files)
    extensions = ", ".join(f"{key}={value}" for key, value in sorted(counts.items()))
    samples = ", ".join(path.name for path in files[:3])
    return f"[{len(files)} file: {extensions}; mẫu: {samples}]"


def render_directory(directory, prefix, depth, is_last, is_root=False):
    connector = "" if is_root else ("└── " if is_last else "├── ")
    print(f"{prefix}{connector}{directory.name}/")
    child_prefix = prefix if is_root else prefix + ("    " if is_last else "│   ")
    entries = [entry for entry in entries_in(directory) if entry.name not in SKIP_DIRS]
    directories = [entry for entry in entries if is_directory(entry)]
    files = [entry for entry in entries if entry.is_file()]

    if len(files) > 15:
        file_items = [file_group_summary(files)]
    else:
        file_items = [file_description(path) for path in files]

    if depth >= MAX_DEPTH:
        if directories:
            omitted = f"... ({len(directories)} thư mục con chưa mở)"
            print(f"{child_prefix}└── {omitted}")
        for index, description in enumerate(file_items):
            connector = "└── " if index == len(file_items) - 1 and not directories else "├── "
            print(f"{child_prefix}{connector}{description}")
        return

    items = [(path.name.casefold(), "directory", path) for path in directories]
    items.extend((path.name.casefold(), "file", path) for path in files)
    items.sort(key=lambda item: (item[0], item[1]))
    if len(files) > 15:
        items = [(name, kind, path) for name, kind, path in items if kind == "directory"]
        items.append(("~file-summary", "summary", file_group_summary(files)))

    for index, (_, kind, value) in enumerate(items):
        last = index == len(items) - 1
        branch = "└── " if last else "├── "
        if kind == "directory":
            child_entries = entries_in(value)
            if protected_directory(value, child_entries):
                print(f"{child_prefix}{branch}{value.name}/ {protected_summary(value)}")
            else:
                render_directory(value, child_prefix, depth + 1, last)
        elif kind == "summary":
            print(f"{child_prefix}{branch}{value}")
        else:
            print(f"{child_prefix}{branch}{file_description(value)}")


def main():
    parser = argparse.ArgumentParser(description="In cây thư mục an toàn, giới hạn độ sâu và nội dung tệp.")
    parser.add_argument("root", nargs="?", default=".", help="Đường dẫn gốc (mặc định: thư mục hiện tại)")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if not root.is_dir():
        parser.error(f"đường dẫn gốc không phải thư mục: {root}")
    render_directory(root, "", 0, True, is_root=True)


if __name__ == "__main__":
    main()