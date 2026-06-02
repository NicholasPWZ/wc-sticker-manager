from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from auth import get_user_from_request
from database import get_db
from models import AlbumSticker, Trade, TradeItem, TradingSticker

router = APIRouter(prefix="/api/trades")


@router.post("")
async def create_trade(request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    body = await request.json()
    recipient_id = int(body.get("recipient_id"))
    want_items = body.get("want_items", [])   # [{country, number}]
    offer_items = body.get("offer_items", []) # [{country, number}]
    note = body.get("note", "")

    if not want_items and not offer_items:
        return JSONResponse({"error": "Nenhuma figurinha selecionada."}, status_code=400)

    trade = Trade(
        requester_id=current_user.id,
        recipient_id=recipient_id,
        note=note,
    )
    db.add(trade)
    db.flush()

    for item in want_items:
        db.add(TradeItem(trade_id=trade.id, direction="want", country=item["country"], number=int(item["number"])))
    for item in offer_items:
        db.add(TradeItem(trade_id=trade.id, direction="offer", country=item["country"], number=int(item["number"])))

    db.commit()

    # Notify recipient via WebSocket (imported lazily to avoid circular import)
    from main import manager
    await manager.notify(recipient_id, {
        "type": "trade_request",
        "trade_id": trade.id,
        "from_user": current_user.display_name,
        "message": f"{current_user.display_name} quer fazer uma troca com você!",
    })

    return JSONResponse({"trade_id": trade.id})


@router.post("/{trade_id}/finalize")
async def finalize_trade(trade_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        return JSONResponse({"error": "Troca não encontrada."}, status_code=404)

    is_requester = trade.requester_id == current_user.id
    is_recipient = trade.recipient_id == current_user.id
    if not is_requester and not is_recipient:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    # If this action would complete the trade, validate stickers are still available
    would_complete = (
        (is_requester and trade.recipient_finalized) or
        (is_recipient and trade.requester_finalized)
    )
    if would_complete:
        missing = []
        for item in trade.items:
            giver_id = trade.recipient_id if item.direction == "want" else trade.requester_id
            short = item.country.split("(")[0].strip() if "(" in item.country else item.country
            row = db.query(TradingSticker).filter(
                TradingSticker.user_id == giver_id,
                TradingSticker.country == item.country,
                TradingSticker.number == item.number,
            ).first()
            if not row or row.quantity < 1:
                missing.append(f"{short} #{item.number}")
        if missing:
            return JSONResponse({
                "error": f"Figurinha(s) esgotada(s): {', '.join(missing)}. Outra troca já usou estas figurinhas."
            }, status_code=409)

    if is_requester:
        trade.requester_finalized = True
    else:
        trade.recipient_finalized = True

    completed = trade.requester_finalized and trade.recipient_finalized
    if completed:
        _apply_trade_completion(trade, db)

    db.commit()

    # Notify the other party
    other_id = trade.recipient_id if is_requester else trade.requester_id
    from main import manager
    await manager.notify(other_id, {
        "type": "trade_finalized",
        "trade_id": trade.id,
        "completed": completed,
        "by_user": current_user.display_name,
    })

    return JSONResponse({"completed": completed})


@router.post("/{trade_id}/archive")
async def archive_trade(trade_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)
    if not current_user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        return JSONResponse({"error": "Troca não encontrada."}, status_code=404)

    if trade.requester_id != current_user.id and trade.recipient_id != current_user.id:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    trade.archived = True
    db.commit()
    return JSONResponse({"archived": True})


def _apply_trade_completion(trade: Trade, db: Session):
    for item in trade.items:
        if item.direction == "want":
            giver_id = trade.recipient_id
            receiver_id = trade.requester_id
        else:
            giver_id = trade.requester_id
            receiver_id = trade.recipient_id

        # Decrement giver's trading sticker
        row = (
            db.query(TradingSticker)
            .filter(
                TradingSticker.user_id == giver_id,
                TradingSticker.country == item.country,
                TradingSticker.number == item.number,
            )
            .first()
        )
        if row:
            row.quantity = max(0, row.quantity - 1)
            if row.quantity == 0:
                db.delete(row)

        # Add to receiver's album if not already owned
        already_owned = (
            db.query(AlbumSticker)
            .filter(
                AlbumSticker.user_id == receiver_id,
                AlbumSticker.country == item.country,
                AlbumSticker.number == item.number,
            )
            .first()
        )
        if not already_owned:
            db.add(AlbumSticker(user_id=receiver_id, country=item.country, number=item.number))
