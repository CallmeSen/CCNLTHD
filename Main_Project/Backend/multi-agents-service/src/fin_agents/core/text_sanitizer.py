"""Text cleanup helpers for generated assistant output."""
from __future__ import annotations

import re


_DISCLAIMER_LABEL_RE = re.compile(
    r"^\s*(?:[-*]\s*)?(?:\*\*|__)?\s*"
    r"(?:disclaimer|tuyên\s+bố\s+miễn\s+trừ\s+trách\s+nhiệm|tuyen\s+bo\s+mien\s+tru\s+trach\s+nhiem)"
    r"\s*:?\s*(?:\*\*|__)?\s*(.*)$",
    re.IGNORECASE,
)
_DISCLAIMER_BODY_RE = re.compile(
    r"(?:"
    r"informational\s+purposes|does\s+not\s+constitute\s+(?:financial|investment)\s+advice|"
    r"not\s+(?:financial|investment)\s+advice|consult\s+(?:with\s+)?(?:a\s+)?financial\s+advisor|"
    r"ai-generated\s+analysis|"
    r"chỉ\s+nhằm\s+mục\s+đích\s+thông\s+tin|chỉ\s+mang\s+tính\s+chất\s+tham\s+khảo|"
    r"không\s+cấu\s+thành\s+lời\s+khuyên|không\s+phải(?:\s+là)?\s+lời\s+khuyên|"
    r"tham\s+vấn\s+chuyên\s+gia\s+tài\s+chính|tham\s+khảo\s+ý\s+kiến\s+cố\s+vấn\s+tài\s+chính|"
    r"nhà\s+đầu\s+tư\s+nên\s+tự\s+tìm\s+hiểu|rủi\s+ro\s+mất\s+vốn|"
    r"phân\s+tích\s+được\s+tạo\s+bởi\s+ai"
    r")",
    re.IGNORECASE,
)
_HEADING_RE = re.compile(r"^\s{0,3}(?:#{1,6}\s+|[-*_]{3,}\s*$)")


def remove_disclaimer_blocks(text: str) -> str:
    """Remove generic financial-disclaimer lines or short blocks from generated text."""
    if not text:
        return text

    output: list[str] = []
    skipping_disclaimer = False
    skipped_body = False

    for line in text.splitlines():
        stripped = line.strip()
        label_match = _DISCLAIMER_LABEL_RE.match(stripped)
        if label_match:
            skipping_disclaimer = True
            skipped_body = bool(label_match.group(1).strip())
            continue

        if skipping_disclaimer:
            if not stripped:
                skipping_disclaimer = False
                skipped_body = False
                continue
            if _HEADING_RE.match(stripped):
                skipping_disclaimer = False
                skipped_body = False
                output.append(line)
                continue
            if _DISCLAIMER_BODY_RE.search(stripped):
                skipped_body = True
                continue
            if not skipped_body and len(stripped) <= 320:
                skipped_body = True
                continue
            skipping_disclaimer = False
            skipped_body = False

        if len(stripped) <= 420 and _DISCLAIMER_BODY_RE.search(stripped):
            continue

        output.append(line)

    return re.sub(r"\n{3,}", "\n\n", "\n".join(output)).strip()
