import jwt
import os
from datetime import datetime, timedelta, timezone
from . import schemas
from jwt import ExpiredSignatureError, InvalidTokenError
from fastapi import Depends, status, HTTPException
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(data: dict):
    to_encode = data.copy()

    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def verify_access_token(token: str, exception):

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)

        id: str = payload.get("id")

        if id is None:
            raise exception
        token_data = schemas.TokenData(id=id)
    except ExpiredSignatureError:
        raise exception
    except InvalidTokenError:
        raise exception

    return token_data


def get_current_user(token: str = Depends()):
    exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                              detail="Could not validate credentials",
                              headers={"WWW-Authenticate": "Bearer"})
    return verify_access_token(token, exception)
