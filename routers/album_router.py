from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from auth import get_user_from_request
from database import get_db
from models import AlbumSticker, Trade, TradingSticker, User, WishlistItem
from sticker_data import CODE_TO_COUNTRY, STICKERS, TOTAL_STICKERS

router = APIRouter()
templates = Jinja2Templates(directory="templates")

_ALL_KEYS = frozenset(
    (c, n) for c, info in STICKERS.items() for n in range(1, info["count"] + 1)
)


def build_page_context(current_user: User, db: Session) -> dict:
    all_users = db.query(User).all()
    for u in all_users:
        owned = db.query(func.count(AlbumSticker.id)).filter(AlbumSticker.user_id == u.id).scalar()
        u.completion = round(owned / TOTAL_STICKERS * 100, 1) if TOTAL_STICKERS > 0 else 0

    active_as_requester = (
        db.query(func.count(Trade.id))
        .filter(Trade.requester_id == current_user.id, Trade.archived == False, Trade.requester_finalized == False)
        .scalar()
    )
    active_as_recipient = (
        db.query(func.count(Trade.id))
        .filter(Trade.recipient_id == current_user.id, Trade.archived == False, Trade.recipient_finalized == False)
        .scalar()
    )
    return {
        "current_user": current_user,
        "all_users": all_users,
        "notif_count": active_as_requester + active_as_recipient,
    }


def build_sticker_data(user_id: int, db: Session) -> list:
    owned_rows = db.query(AlbumSticker).filter(AlbumSticker.user_id == user_id).all()
    owned_map: dict[str, set] = {}
    for r in owned_rows:
        owned_map.setdefault(r.country, set()).add(r.number)

    trading_rows = db.query(TradingSticker).filter(TradingSticker.user_id == user_id).all()
    trading_map: dict[str, dict] = {}
    for r in trading_rows:
        trading_map.setdefault(r.country, {})[r.number] = r.quantity

    wishlist_rows = db.query(WishlistItem).filter(WishlistItem.user_id == user_id).all()
    wishlist_map: dict[str, set] = {}
    for r in wishlist_rows:
        wishlist_map.setdefault(r.country, set()).add(r.number)

    result = []
    for country, info in STICKERS.items():
        owned_nums = owned_map.get(country, set())
        trading_nums = trading_map.get(country, {})
        wishlist_nums = wishlist_map.get(country, set())
        prefix = country.split("(")[0].strip() if "(" in country else country
        start = info.get("start", 1)
        result.append({
            "name": country,
            "code": info["code"],
            "prefix": prefix,
            "count": info["count"],
            "start": start,
            "owned": owned_nums,
            "trading": trading_nums,
            "wishlist": wishlist_nums,
            "owned_count": len(owned_nums),
            "trading_count": sum(trading_nums.values()),
        })
    return result


def compute_matches(current_user_id: int, db: Session) -> list:
    my_owned = frozenset(
        (s.country, s.number)
        for s in db.query(AlbumSticker).filter(AlbumSticker.user_id == current_user_id).all()
    )
    my_missing = _ALL_KEYS - my_owned
    my_trading = frozenset(
        (s.country, s.number)
        for s in db.query(TradingSticker)
        .filter(TradingSticker.user_id == current_user_id, TradingSticker.quantity > 0)
        .all()
    )

    other_users = db.query(User).filter(User.id != current_user_id).all()
    if not other_users:
        return []

    other_ids = [u.id for u in other_users]
    all_trading = db.query(TradingSticker).filter(
        TradingSticker.user_id.in_(other_ids), TradingSticker.quantity > 0
    ).all()
    all_owned = db.query(AlbumSticker).filter(AlbumSticker.user_id.in_(other_ids)).all()

    trading_by_user: dict[int, set] = {}
    for s in all_trading:
        trading_by_user.setdefault(s.user_id, set()).add((s.country, s.number))

    owned_by_user: dict[int, set] = {}
    for s in all_owned:
        owned_by_user.setdefault(s.user_id, set()).add((s.country, s.number))

    matches = []
    for user in other_users:
        their_trading = trading_by_user.get(user.id, set())
        their_missing = _ALL_KEYS - owned_by_user.get(user.id, set())

        they_give = sorted(their_trading & my_missing)
        i_give = sorted(my_trading & their_missing)

        if they_give or i_give:
            matches.append({
                "user_id": user.id,
                "display_name": user.display_name,
                "they_give": they_give[:20],      # cap display list
                "they_give_total": len(they_give),
                "i_give": i_give[:20],
                "i_give_total": len(i_give),
                "mutual": bool(they_give and i_give),
            })

    return sorted(matches, key=lambda m: (-int(m["mutual"]), -m["they_give_total"]))


# ── Pages ──────────────────────────────────────────────────────────────────────

@router.get("/", response_class=HTMLResponse)
async def index(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return RedirectResponse("/login", status_code=302)
    return RedirectResponse(f"/album/{current_user.id}", status_code=302)


@router.get("/album/{user_id}", response_class=HTMLResponse)
async def view_album(user_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return RedirectResponse("/login", status_code=302)

    album_owner = db.query(User).filter(User.id == user_id).first()
    if not album_owner:
        return RedirectResponse("/", status_code=302)

    is_own = current_user.id == user_id
    sticker_data = build_sticker_data(user_id, db)
    owned_count = sum(c["owned_count"] for c in sticker_data)
    trading_total = sum(c["trading_count"] for c in sticker_data)
    probability = (1 - (owned_count / TOTAL_STICKERS) ** 7) * 100 if owned_count < TOTAL_STICKERS else 0.0

    # Missing list (own album only)
    missing_by_country = []
    if is_own:
        for c in sticker_data:
            missing = sorted(n for n in range(c["start"], c["start"] + c["count"]) if n not in c["owned"])
            if missing:
                missing_by_country.append({"name": c["name"], "code": c["code"], "missing": missing})

    # Matches (own album only)
    matches = compute_matches(current_user.id, db) if is_own else []

    # Visitor data (other's album)
    my_trading = []
    my_owned_keys: set[str] = set()
    owner_missing_keys: list[str] = []
    if not is_own:
        trade_rows = db.query(TradingSticker).filter(
            TradingSticker.user_id == current_user.id, TradingSticker.quantity > 0
        ).all()
        my_trading = [{"country": r.country, "number": r.number, "quantity": r.quantity} for r in trade_rows]

        owned_rows = db.query(AlbumSticker).filter(AlbumSticker.user_id == current_user.id).all()
        my_owned_keys = {f"{r.country}|{r.number}" for r in owned_rows}

        owner_owned = frozenset(
            (s.country, s.number)
            for s in db.query(AlbumSticker).filter(AlbumSticker.user_id == user_id).all()
        )
        owner_missing_keys = [f"{c}|{n}" for c, n in (_ALL_KEYS - owner_owned)]

    # Trades (own album only)
    incoming_trades = outgoing_trades = past_trades = []
    if is_own:
        incoming_trades = (
            db.query(Trade)
            .filter(Trade.recipient_id == user_id, Trade.archived == False, Trade.recipient_finalized == False)
            .order_by(Trade.created_at.desc()).all()
        )
        outgoing_trades = (
            db.query(Trade)
            .filter(Trade.requester_id == user_id, Trade.archived == False, Trade.requester_finalized == False)
            .order_by(Trade.created_at.desc()).all()
        )
        past_trades = (
            db.query(Trade)
            .filter(
                or_(Trade.requester_id == user_id, Trade.recipient_id == user_id),
                or_(Trade.archived == True, (Trade.requester_finalized == True) & (Trade.recipient_finalized == True)),
            )
            .order_by(Trade.created_at.desc()).limit(50).all()
        )

    ctx = build_page_context(current_user, db)
    return templates.TemplateResponse(request, "album.html", {
        **ctx,
        "album_owner": album_owner,
        "sticker_data": sticker_data,
        "is_own_album": is_own,
        "stats": {
            "owned": owned_count,
            "total": TOTAL_STICKERS,
            "trading": trading_total,
            "full": owned_count + trading_total,
            "probability": round(probability, 1),
        },
        "missing_by_country": missing_by_country,
        "matches": matches,
        "incoming_trades": incoming_trades,
        "outgoing_trades": outgoing_trades,
        "past_trades": past_trades,
        "my_trading": my_trading,
        "my_owned_keys": my_owned_keys,
        "owner_missing_keys": owner_missing_keys,
        "code_to_country": CODE_TO_COUNTRY,
    })


# ── API ────────────────────────────────────────────────────────────────────────

@router.post("/api/sticker/toggle")
async def toggle_sticker(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    body = await request.json()
    country, number = body.get("country"), int(body.get("number"))

    existing = db.query(AlbumSticker).filter(
        AlbumSticker.user_id == current_user.id,
        AlbumSticker.country == country,
        AlbumSticker.number == number,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return JSONResponse({"owned": False})
    db.add(AlbumSticker(user_id=current_user.id, country=country, number=number))
    db.commit()
    return JSONResponse({"owned": True})


@router.post("/api/sticker/bulk")
async def bulk_toggle(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    body = await request.json()
    entries = body.get("entries", [])
    mode = body.get("mode", "album")  # "album" | "pack"

    existing_keys = frozenset(
        (s.country, s.number)
        for s in db.query(AlbumSticker).filter(AlbumSticker.user_id == current_user.id).all()
    )

    added_album = 0
    added_trading = 0

    if mode == "inverse":
        # entries = stickers the user is MISSING; mark everything else as owned
        skip_by_country: dict[str, set] = {}
        for e in entries:
            skip_by_country.setdefault(e["country"], set()).add(int(e["number"]))

        for country, skip_nums in skip_by_country.items():
            info = STICKERS.get(country)
            if not info:
                continue
            for num in range(info.get("start", 1), info.get("start", 1) + info["count"]):
                if num in skip_nums:
                    continue
                if (country, num) not in existing_keys:
                    db.add(AlbumSticker(user_id=current_user.id, country=country, number=num))
                    added_album += 1
    else:
        for e in entries:
            country, number = e["country"], int(e["number"])
            key = (country, number)

            if mode == "pack" and key in existing_keys:
                row = db.query(TradingSticker).filter(
                    TradingSticker.user_id == current_user.id,
                    TradingSticker.country == country,
                    TradingSticker.number == number,
                ).first()
                if row:
                    row.quantity += 1
                else:
                    db.add(TradingSticker(user_id=current_user.id, country=country, number=number, quantity=1))
                added_trading += 1
            elif key not in existing_keys:
                db.add(AlbumSticker(user_id=current_user.id, country=country, number=number))
                added_album += 1

    db.commit()
    return JSONResponse({"added_album": added_album, "added_trading": added_trading, "total": len(entries)})


@router.post("/api/sticker/trade")
async def update_trading(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    body = await request.json()
    country, number, delta = body.get("country"), int(body.get("number")), int(body.get("delta", 0))

    row = db.query(TradingSticker).filter(
        TradingSticker.user_id == current_user.id,
        TradingSticker.country == country,
        TradingSticker.number == number,
    ).first()
    if row:
        new_qty = max(0, row.quantity + delta)
        if new_qty == 0:
            db.delete(row)
        else:
            row.quantity = new_qty
        db.commit()
        return JSONResponse({"quantity": new_qty})
    elif delta > 0:
        db.add(TradingSticker(user_id=current_user.id, country=country, number=number, quantity=delta))
        db.commit()
        return JSONResponse({"quantity": delta})
    return JSONResponse({"quantity": 0})


@router.post("/api/wishlist/toggle")
async def toggle_wishlist(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    body = await request.json()
    country, number = body.get("country"), int(body.get("number"))

    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.country == country,
        WishlistItem.number == number,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return JSONResponse({"wished": False})
    db.add(WishlistItem(user_id=current_user.id, country=country, number=number))
    db.commit()
    return JSONResponse({"wished": True})
