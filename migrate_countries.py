"""One-time migration: rename the 6 country keys that changed."""
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
    db.commit()
    print("Done.")
finally:
    db.close()
