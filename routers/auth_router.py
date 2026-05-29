from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from auth import create_token, get_user_from_request, hash_password, verify_password
from database import get_db
from models import User

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, db: Session = Depends(get_db)):
    if get_user_from_request(request, db):
        return RedirectResponse("/", status_code=302)
    return templates.TemplateResponse(request, "login.html", {"error": None})


@router.post("/login", response_class=HTMLResponse)
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(request, "login.html", {"error": "Usuário ou senha inválidos."})
    response = RedirectResponse("/", status_code=302)
    response.set_cookie("token", create_token(user.id), httponly=True, max_age=60 * 60 * 24 * 30)
    return response


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request, db: Session = Depends(get_db)):
    if get_user_from_request(request, db):
        return RedirectResponse("/", status_code=302)
    return templates.TemplateResponse(request, "register.html", {"error": None})


@router.post("/register", response_class=HTMLResponse)
async def register_submit(
    request: Request,
    username: str = Form(...),
    display_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    username = username.lower().strip()
    if db.query(User).filter(User.username == username).first():
        return templates.TemplateResponse(request, "register.html", {"error": "Nome de usuário já existe."})
    if db.query(User).filter(User.email == email).first():
        return templates.TemplateResponse(request, "register.html", {"error": "E-mail já cadastrado."})
    user = User(username=username, display_name=display_name.strip(), email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    response = RedirectResponse("/", status_code=302)
    response.set_cookie("token", create_token(user.id), httponly=True, max_age=60 * 60 * 24 * 30)
    return response


@router.get("/logout")
async def logout():
    response = RedirectResponse("/login", status_code=302)
    response.delete_cookie("token")
    return response
