from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)   # login handle, lowercase
    display_name = Column(String, nullable=False)            # shown to other users
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

    album_stickers = relationship("AlbumSticker", back_populates="user", cascade="all, delete-orphan")
    trading_stickers = relationship("TradingSticker", back_populates="user", cascade="all, delete-orphan")


class AlbumSticker(Base):
    __tablename__ = "album_stickers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    country = Column(String, nullable=False)
    number = Column(Integer, nullable=False)

    user = relationship("User", back_populates="album_stickers")


class TradingSticker(Base):
    __tablename__ = "trading_stickers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    country = Column(String, nullable=False)
    number = Column(Integer, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    user = relationship("User", back_populates="trading_stickers")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(String, nullable=True)
    requester_finalized = Column(Boolean, default=False, nullable=False)
    recipient_finalized = Column(Boolean, default=False, nullable=False)
    archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now())

    requester = relationship("User", foreign_keys=[requester_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    items = relationship("TradeItem", back_populates="trade", cascade="all, delete-orphan")

    @property
    def is_completed(self):
        return self.requester_finalized and self.recipient_finalized

    @property
    def status_label(self):
        if self.is_completed:
            return "completed"
        if self.requester_finalized or self.recipient_finalized:
            return "partial"
        return "pending"


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    country = Column(String, nullable=False)
    number = Column(Integer, nullable=False)

    user = relationship("User", foreign_keys=[user_id])


class TradeItem(Base):
    __tablename__ = "trade_items"

    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False)
    direction = Column(String, nullable=False)  # "want" | "offer"
    country = Column(String, nullable=False)
    number = Column(Integer, nullable=False)

    trade = relationship("Trade", back_populates="items")
