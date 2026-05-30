import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from auth import get_user_from_request, hash_password, verify_password
from database import get_db
from models import AlbumSticker, Trade, User
from sticker_data import TOTAL_STICKERS

router = APIRouter(prefix="/profile")
templates = Jinja2Templates(directory="templates")

AVATARS_DIR = Path("static/avatars")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _page_ctx(current_user: User, db: Session) -> dict:
    all_users = db.query(User).all()
    for u in all_users:
        owned = db.query(func.count(AlbumSticker.id)).filter(AlbumSticker.user_id == u.id).scalar()
        u.completion = round(owned / TOTAL_STICKERS * 100, 1)
    active_req = db.query(func.count(Trade.id)).filter(
        Trade.requester_id == current_user.id, Trade.archived == False, Trade.requester_finalized == False
    ).scalar()
    active_rec = db.query(func.count(Trade.id)).filter(
        Trade.recipient_id == current_user.id, Trade.archived == False, Trade.recipient_finalized == False
    ).scalar()
    return {"current_user": current_user, "all_users": all_users,
            "notif_count": active_req + active_rec, "album_owner": current_user}


@router.get("", response_class=HTMLResponse)
async def profile_page(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse(request, "profile.html", {**_page_ctx(current_user, db), "error": None, "success": None})


@router.post("/update", response_class=HTMLResponse)
async def update_profile(
    request: Request,
    display_name: str = Form(...),
    email: str = Form(...),
    current_password: str = Form(""),
    new_password: str = Form(""),
    always_edit_mode: str = Form("off"),
    db: Session = Depends(get_db),
):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return RedirectResponse("/login", status_code=302)

    ctx = _page_ctx(current_user, db)

    # Check email uniqueness
    if email != current_user.email:
        clash = db.query(User).filter(User.email == email, User.id != current_user.id).first()
        if clash:
            return templates.TemplateResponse(request, "profile.html", {**ctx, "error": "E-mail já em uso.", "success": None})

    # Password change
    if new_password:
        if not verify_password(current_password, current_user.password_hash):
            return templates.TemplateResponse(request, "profile.html", {**ctx, "error": "Senha atual incorreta.", "success": None})
        if len(new_password) < 6:
            return templates.TemplateResponse(request, "profile.html", {**ctx, "error": "Nova senha precisa ter ao menos 6 caracteres.", "success": None})
        current_user.password_hash = hash_password(new_password)

    current_user.display_name = display_name.strip()
    current_user.email = email.strip()
    current_user.always_edit_mode = (always_edit_mode == "on")
    db.commit()

    ctx = _page_ctx(current_user, db)
    return templates.TemplateResponse(request, "profile.html", {**ctx, "error": None, "success": "Perfil atualizado!"})


@router.post("/picture")
async def upload_picture(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    if file.content_type not in ALLOWED_TYPES:
        return JSONResponse({"error": "Formato inválido. Use JPG, PNG ou WebP."}, status_code=400)

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        return JSONResponse({"error": "Imagem muito grande (máx 5MB)."}, status_code=400)

    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.content_type.split("/")[-1].replace("jpeg", "jpg")
    filename = f"{current_user.id}.{ext}"

    # Remove old picture files
    for old in AVATARS_DIR.glob(f"{current_user.id}.*"):
        old.unlink(missing_ok=True)

    (AVATARS_DIR / filename).write_bytes(content)
    current_user.picture = filename
    db.commit()
    return JSONResponse({"url": f"/static/avatars/{filename}"})
