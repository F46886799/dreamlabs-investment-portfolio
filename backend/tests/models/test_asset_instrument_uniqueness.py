import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.models import AssetInstrument


def _unique_symbol(prefix: str = "TST") -> str:
    # Symbol max_length is 32
    return f"{prefix}{uuid.uuid4().hex[:8]}"


def test_assetinstrument_uniqueness_is_null_safe(db: Session) -> None:
    symbol = _unique_symbol("NULL")

    db.add(
        AssetInstrument(
            asset_type="equity",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market=None,
        )
    )
    db.commit()

    db.add(
        AssetInstrument(
            asset_type="equity",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market=None,
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_assetinstrument_uniqueness_includes_market(db: Session) -> None:
    symbol = _unique_symbol("MKT")

    db.add(
        AssetInstrument(
            asset_type="equity",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market="US",
        )
    )
    db.commit()

    db.add(
        AssetInstrument(
            asset_type="equity",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market="US",
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    db.add(
        AssetInstrument(
            asset_type="equity",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market="CA",
        )
    )
    db.commit()
