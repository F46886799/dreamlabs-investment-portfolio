import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, delete

from app.models import AssetInstrument


def _unique_symbol(prefix: str = "TST") -> str:
    # Symbol max_length is 32
    return f"{prefix}{uuid.uuid4().hex[:8]}"


@pytest.fixture(autouse=True)
def clean_asset_instruments(db: Session) -> None:
    db.exec(delete(AssetInstrument))
    db.commit()
    yield
    db.exec(delete(AssetInstrument))
    db.commit()


def test_assetinstrument_uniqueness_is_null_safe(db: Session) -> None:
    symbol = _unique_symbol("NULL")

    db.add(
        AssetInstrument(
            asset_type="stock",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market=None,
        )
    )
    db.commit()

    db.add(
        AssetInstrument(
            asset_type="stock",
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
            asset_type="stock",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market="US",
        )
    )
    db.commit()

    db.add(
        AssetInstrument(
            asset_type="stock",
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
            asset_type="stock",
            symbol=symbol,
            display_name="Test Instrument",
            exchange=None,
            market="CA",
        )
    )
    db.commit()


def test_assetinstrument_uniqueness_includes_exchange_and_normalized_symbol(
    db: Session,
) -> None:
    symbol = _unique_symbol("EXG")

    db.add(
        AssetInstrument(
            asset_type="stock",
            symbol=f" {symbol.lower()} ",
            display_name="Test Instrument",
            exchange=" nasdaq ",
            market="US",
        )
    )
    db.commit()

    db.add(
        AssetInstrument(
            asset_type="stock",
            symbol=symbol,
            display_name="Test Instrument",
            exchange="NASDAQ",
            market="US",
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    db.add(
        AssetInstrument(
            asset_type="stock",
            symbol=symbol,
            display_name="Test Instrument",
            exchange="NYSE",
            market="US",
        )
    )
    db.commit()
