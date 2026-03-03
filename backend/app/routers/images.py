import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, HTTPException

router = APIRouter(tags=["images"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_image(file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {file.content_type} not allowed. Allowed: png, jpg, gif, webp, svg")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")

    ext = Path(file.filename or "image.png").suffix.lower()
    if not ext:
        ext = ".png"
    filename = f"{uuid.uuid4().hex}{ext}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / filename).write_bytes(data)

    return {"url": f"/uploads/{filename}"}
