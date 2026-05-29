"""One-time migration: rename country keys + fix FWC sticker numbering."""
from database import SessionLocal

RENAMES = {
    "IRA (Irã)":           "IRN (Irã)",
    "CPE (Cabo Verde)":    "CPV (Cabo Verde)",
    "ARS (Arábia Saudita)": "KSA (Arábia Saudita)",
    "CON (Congo)":         "COD (Congo DR)",
    "ING (Inglaterra)":    "ENG (Inglaterra)",
    "GAN (Gana)":          "GHA (Gana)",
}

TABLES = ["album_stickers", "trading_stickers", "wishlist_items", "trade_items"]

db = SessionLocal()
try:
    for old, new in RENAMES.items():
        for table in TABLES:
            result = db.execute(
                __import__("sqlalchemy").text(
                    f"UPDATE {table} SET country = :new WHERE country = :old"
                ),
                {"new": new, "old": old},
            )
            if result.rowcount:
                print(f"  {table}: '{old}' → '{new}' ({result.rowcount} rows)")
    # Fix FWC sticker 20 → 0
    fwc = "FWC (Especiais  Logos)"
    for table in ["album_stickers", "trading_stickers", "wishlist_items"]:
        r = db.execute(
            __import__("sqlalchemy").text(f"UPDATE {table} SET number = 0 WHERE country = :c AND number = 20"),
            {"c": fwc},
        )
        if r.rowcount:
            print(f"  {table}: FWC #20 → #0 ({r.rowcount} rows)")

    db.commit()
    print("Done.")
finally:
    db.close()
