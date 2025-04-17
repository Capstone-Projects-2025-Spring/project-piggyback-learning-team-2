# backend/routers/authentication.py

from fastapi import APIRouter, status, HTTPException, Depends
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.yolov7 import db_models, tools
from backend import oauth2
from backend.database import get_db
from backend import schemas

router = APIRouter()



@router.post('/login')
def login(userCredentials: OAuth2PasswordRequestForm = Depends(),
          db: Session = Depends(get_db)):

    user = db.query(db_models.User_Login).filter(
        db_models.User_Login.email == userCredentials.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wrong login information"
        )

    if not tools.verify_password(userCredentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wrong login information"
        )

    access_token = oauth2.create_access_token(data={"id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


# testing out user registration
@router.post("/register", status_code=status.HTTP_201_CREATED,
          response_model=schemas.UserResponse)
def register_user(user: schemas.UserCredentials,
                  db: Session = Depends(get_db)):
    existing_user = (db.query(db_models.User_Login)
                     .filter(db_models.User_Login.email == user.email)
                     .first())
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    hashed_password = tools.hash(user.password)
    user.password = hashed_password
    new_user = db_models.User_Login(**user.model_dump())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
