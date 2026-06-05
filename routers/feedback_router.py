from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from auth import get_user_from_request, hash_password
from database import get_db
from models import Feedback, User
from routers.album_router import build_page_context

ADMIN_USERNAME = "nichoeduda"

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.post("/api/feedback")
async def submit_feedback(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    body = await request.json()
    message = body.get("message", "").strip()
    if not message:
        return JSONResponse({"error": "Mensagem vazia."}, status_code=400)
    if len(message) > 2000:
        return JSONResponse({"error": "Mensagem muito longa (máx 2000 caracteres)."}, status_code=400)
    db.add(Feedback(user_id=current_user.id, message=message))
    db.commit()
    return JSONResponse({"ok": True})


@router.post("/admin/set-password")
async def admin_set_password(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user or current_user.username != ADMIN_USERNAME:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    body = await request.json()
    user_id = int(body.get("user_id", 0))
    new_password = body.get("password", "").strip()
    if not new_password:
        return JSONResponse({"error": "Senha vazia."}, status_code=400)
    if len(new_password) < 4:
        return JSONResponse({"error": "Senha muito curta (mín 4 caracteres)."}, status_code=400)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return JSONResponse({"error": "Usuário não encontrado."}, status_code=404)
    user.password_hash = hash_password(new_password)
    db.commit()
    return JSONResponse({"ok": True, "display_name": user.display_name})


@router.get("/admin/feedback", response_class=HTMLResponse)
async def admin_feedback(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return RedirectResponse("/login")
    if current_user.username != ADMIN_USERNAME:
        return RedirectResponse("/")
    feedbacks = (
        db.query(Feedback)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    all_users = db.query(User).order_by(User.display_name).all()
    ctx = build_page_context(current_user, db)
    return templates.TemplateResponse(request, "admin_feedback.html", {
        **ctx,
        "feedbacks": feedbacks,
        "all_users": all_users,
        "album_owner": current_user,
    })
