from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from auth import get_user_from_request
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
    ctx = build_page_context(current_user, db)
    return templates.TemplateResponse(request, "admin_feedback.html", {
        **ctx,
        "feedbacks": feedbacks,
        "album_owner": current_user,
    })
