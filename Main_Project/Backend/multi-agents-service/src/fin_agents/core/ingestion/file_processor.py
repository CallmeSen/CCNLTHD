"""
File processor - extracts structured context from uploaded files.

Supports: images (base64 + LLM vision), PDFs, CSV/Excel, plain text.
"""

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Supported MIME type categories
IMAGE_TYPES = {
    "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp",
}
DOCUMENT_TYPES = {
    "application/pdf",
    "text/plain",
}
SPREADSHEET_TYPES = {
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}


def process_uploaded_file(
    storage_path: str,
    mime_type: str,
    original_name: str,
) -> Optional[Dict[str, Any]]:
    """
    Process an uploaded file and extract structured context.

    Returns a dict with extracted information, or None if extraction failed.
    The dict is stored in FileStore.extracted_context_json.
    """
    try:
        if mime_type in IMAGE_TYPES:
            return _process_image(storage_path, original_name)
        elif mime_type in DOCUMENT_TYPES:
            return _process_document(storage_path, mime_type, original_name)
        elif mime_type in SPREADSHEET_TYPES:
            return _process_spreadsheet(storage_path, mime_type, original_name)
        else:
            logger.warning(f"Unsupported mime type: {mime_type}")
            return None
    except Exception as e:
        logger.error(f"File processing failed for {original_name}: {e}")
        return {"error": str(e), "file_name": original_name}


def _process_image(storage_path: str, original_name: str) -> Dict[str, Any]:
    """Extract context from an image using LLM vision."""
    import base64
    import os

    try:
        with open(storage_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        logger.warning(f"Could not read image {original_name}: {e}")
        return {"type": "image", "file_name": original_name, "error": str(e)}

    try:
        from langchain_core.messages import HumanMessage
        from src.fin_agents.agents.agent_loader import get_shared_llm

        llm = get_shared_llm()
        vision_prompt = (
            "You are a financial analyst. Look at this image (chart, screenshot, financial document) "
            "and extract all relevant financial information. Return a JSON object with these fields:\n"
            "- summary: a brief description of what the image shows\n"
            "- key_data: any numbers, ticker symbols, dates, prices, or metrics visible\n"
            "- context: any relevant notes about the data\n"
            "Only output valid JSON."
        )
        message = HumanMessage(
            content=[
                {"type": "text", "text": vision_prompt},
                {
                    "type": "image_url",
                    "image_url": f"data:image/jpeg;base64,{image_data}",
                },
            ]
        )
        response = llm.invoke([message])
        content = getattr(response, "content", str(response))
        import json
        import re
        fences = re.findall(r"```(?:json)?\\s*(.*?)```", content, re.DOTALL)
        if fences:
            parsed = json.loads(fences[0].strip())
        else:
            parsed = json.loads(content)
        return {"type": "image", "file_name": original_name, **parsed}
    except Exception as e:
        logger.warning(f"Vision extraction failed for {original_name}: {e}")
        return {
            "type": "image",
            "file_name": original_name,
            "summary": "Image uploaded but automated extraction failed.",
            "note": "Content may be manually reviewed.",
            "error": str(e),
        }


def _process_document(storage_path: str, mime_type: str, original_name: str) -> Dict[str, Any]:
    """Extract context from PDF or plain text files."""
    text = ""
    if mime_type == "application/pdf":
        text = _extract_pdf_text(storage_path)
    else:
        try:
            with open(storage_path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
        except Exception as e:
            logger.warning(f"Could not read text file {original_name}: {e}")
            return {"type": "document", "file_name": original_name, "error": str(e)}

    if not text.strip():
        return {"type": "document", "file_name": original_name, "summary": "Empty document."}

    try:
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import JsonOutputParser

        from src.fin_agents.agents.agent_loader import get_shared_llm

        llm = get_shared_llm()
        system_prompt = (
            "You are a financial analyst. Extract structured information from the provided document. "
            "Return a JSON object with fields: summary (brief overview), key_metrics (dict of named values), "
            "mentioned_tickers (list of stock tickers if any), notes (any relevant observations). "
            "Only output valid JSON."
        )
        parser = JsonOutputParser()
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Document content:\n{document}"),
        ])
        chain = prompt | llm | parser
        result = chain.invoke({"document": text[:8000]})
        return {"type": "document", "file_name": original_name, **result}
    except Exception as e:
        logger.warning(f"Document extraction failed for {original_name}: {e}")
        return {
            "type": "document",
            "file_name": original_name,
            "summary": text[:500] if text else "Could not extract content.",
            "error": str(e),
        }


def _process_spreadsheet(storage_path: str, mime_type: str, original_name: str) -> Dict[str, Any]:
    """Extract context from CSV or Excel files."""
    import csv
    import io

    try:
        if mime_type == "text/csv":
            with open(storage_path, "r", encoding="utf-8", errors="replace") as f:
                raw = f.read()
        else:
            import pandas as pd
            dfs = pd.read_excel(storage_path, sheet_name=None)
            raw_lines = []
            for sheet_name, df in dfs.items():
                raw_lines.append(f"=== Sheet: {sheet_name} ===")
                raw_lines.append(df.to_csv(index=False))
            raw = "\n".join(raw_lines)

        reader = csv.reader(io.StringIO(raw[:20000]))
        headers = next(reader, None)
        sample_rows = list(reader)[:10]

        return {
            "type": "spreadsheet",
            "file_name": original_name,
            "summary": f"Spreadsheet with columns: {headers}",
            "columns": headers or [],
            "sample_rows": sample_rows,
            "row_count_estimate": raw.count("\n"),
        }
    except Exception as e:
        logger.warning(f"Spreadsheet extraction failed for {original_name}: {e}")
        return {"type": "spreadsheet", "file_name": original_name, "error": str(e)}


def _extract_pdf_text(storage_path: str) -> str:
    """Extract text from a PDF file."""
    try:
        import pypdf
        reader = pypdf.PdfReader(storage_path)
        text_parts = []
        for page in reader.pages:
            text_parts.append(page.extract_text())
        return "\n".join(text_parts)
    except ImportError:
        logger.warning("pypdf not installed, PDF text extraction skipped.")
        return ""
    except Exception as e:
        logger.warning(f"PDF extraction failed: {e}")
        return ""
