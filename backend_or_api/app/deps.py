from __future__ import annotations

import os
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlmodel import Session, select

from .auth_utils import decode_user_id, hash_password
from . import database
from .database import get_session
from .db_models import Sandbox, User

AUTH_DISABLED = os.getenv("AUTH_DISABLED", "").lower() in ("1", "true", "yes")

_DEV_EMAIL = "dev@localhost.internal"
_bearer = HTTPBearer(auto_error=False)


def _ensure_dev_user_standalone() -> str:
    with Session(database.engine) as session:
        row = session.exec(select(User).where(User.email == _DEV_EMAIL)).first()
        if row:
            return row.id
        user = User(
            id=str(uuid.uuid4()),
            email=_DEV_EMAIL,
            hashed_password=hash_password("dev"),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user.id


def get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Session = Depends(get_session),
) -> str:
    if AUTH_DISABLED:
        return _ensure_dev_user_standalone()
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_id = decode_user_id(creds.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user_id


def get_current_user_id_sse(
    access_token_q: Annotated[str | None, Query(alias="access_token")] = None,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
    session: Session = Depends(get_session),
) -> str:
    """Like `get_current_user_id`, but allows `?access_token=` for browsers (EventSource has no header)."""
    if AUTH_DISABLED:
        return _ensure_dev_user_standalone()
    if creds is not None and creds.credentials:
        try:
            user_id = decode_user_id(creds.credentials)
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token") from None
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user_id
    if access_token_q:
        try:
            user_id = decode_user_id(access_token_q)
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token") from None
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user_id
    raise HTTPException(status_code=401, detail="Not authenticated")


def require_sandbox_owner(
    session: Session,
    sandbox_id: str,
    user_id: str,
) -> Sandbox:
    row = session.get(Sandbox, sandbox_id)
    if not row:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    if row.owner_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this sandbox")
    return row
