"""
FastAPI routes for file upload and management.

Provides endpoints for uploading files to a chat session (for personalization),
listing uploaded files, and deleting files.
"""

import logging
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.fin_agents.db.database import get_db
from src.fin_agents.db.repositories import ChatSessionRepository, FileStoreRepository
from src.fin_agents.core.ingestion.file_processor import process_uploaded_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])

STORAGE_BASE = os.getenv("STORAGE_BASE", "./storage")
STORAGE_UPLOADS = os.path.join(STORAGE_BASE, "uploads")

ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/bmp",
    "application/pdf",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/plain",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _get_upload_dir(session_id: str) -> str:
    dir_path = os.path.join(STORAGE_UPLOADS, session_id)
    os.makedirs(dir_path, exist_ok=True)
    return dir_path


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("")
async def upload_file(
    session_id: str,
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
):
    """
    Upload a file to a chat session.

    Supported types: images (PNG, JPEG, GIF, WebP, BMP), PDF, CSV, Excel (.xlsx, .xls), plain text.
    Max size: 50 MB.
    """
    session = ChatSessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if file.size is not None and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max size is {MAX_FILE_SIZE // (1024*1024)} MB.")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Allowed: images, PDF, CSV, Excel, plain text.",
        )

    file_id = str(uuid.uuid4())
    original_name = file.filename or "unknown"
    safe_name = original_name.replace("/", "_").replace("\\", "_")
    storage_name = f"{file_id}_{safe_name}"
    upload_dir = _get_upload_dir(session_id)
    storage_path = os.path.join(upload_dir, storage_name)

    try:
        content = await file.read()
        with open(storage_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Failed to write uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file.")

    extracted_context = process_uploaded_file(storage_path, file.content_type, original_name)

    file_store = FileStoreRepository.create(db, {
        "file_id": file_id,
        "session_id": session_id,
        "file_name": original_name,
        "mime_type": file.content_type,
        "storage_path": storage_path,
        "file_size": len(content),
        "extracted_context_json": extracted_context,
    })

    return {
        "file_id": file_id,
        "session_id": session_id,
        "file_name": original_name,
        "mime_type": file.content_type,
        "file_size": len(content),
        "status": "uploaded",
    }


@router.get("/sessions/{session_id}/files", response_model=List[dict])
async def list_session_files(
    session_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List all uploaded files for a session."""
    session = ChatSessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    files = FileStoreRepository.get_by_session(db, session_id)
    files = files[skip: skip + limit]
    return [
        {
            "file_id": f.file_id,
            "session_id": f.session_id,
            "file_name": f.file_name,
            "mime_type": f.mime_type,
            "file_size": f.file_size,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "has_context": f.extracted_context_json is not None,
        }
        for f in files
    ]


@router.delete("/sessions/{session_id}/files/{file_id}")
async def delete_file(
    session_id: str,
    file_id: str,
    db: Session = Depends(get_db),
):
    """Delete an uploaded file and its stored content."""
    file_store = FileStoreRepository.get_by_id(db, file_id)
    if not file_store:
        raise HTTPException(status_code=404, detail="File not found")
    if file_store.session_id != session_id:
        raise HTTPException(status_code=403, detail="File does not belong to this session")

    storage_path = file_store.storage_path
    if os.path.exists(storage_path):
        try:
            os.remove(storage_path)
        except OSError as e:
            logger.warning(f"Could not remove file at {storage_path}: {e}")

    FileStoreRepository.delete(db, file_id)
    return {"status": "deleted", "file_id": file_id}


@router.get("/sessions/{session_id}/files/{file_id}/download")
async def download_file(
    session_id: str,
    file_id: str,
    db: Session = Depends(get_db),
):
    """Download an uploaded file."""
    file_store = FileStoreRepository.get_by_id(db, file_id)
    if not file_store:
        raise HTTPException(status_code=404, detail="File not found")
    if file_store.session_id != session_id:
        raise HTTPException(status_code=403, detail="File does not belong to this session")

    storage_path = file_store.storage_path
    if not os.path.exists(storage_path):
        raise HTTPException(status_code=404, detail="File content not found on disk")

    return FileResponse(
        path=storage_path,
        filename=file_store.file_name,
        media_type=file_store.mime_type,
    )
