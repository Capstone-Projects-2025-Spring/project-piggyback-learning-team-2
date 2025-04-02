from fastapi import APIRouter, status, HTTPException, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import db_models, tools, oauth2
from fastapi.security.oauth2 import OAuth2PasswordRequestForm

router = APIRouter()


# uses form data, extracts username and password
@router.post('/login')
def login(userCredentials: OAuth2PasswordRequestForm = Depends(),
          db: Session = Depends(get_db)):

    user = db.query(db_models.User_Login).filter(db_models.User_Login.email ==
                                              userCredentials.username).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Wrong login information")

    if not tools.verify_password(userCredentials.password,
                                 user.password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Wrong login information")
    access_token = oauth2.create_access_token(data={"id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}
