from fastapi import APIRouter, status, HTTPException, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import UserCredentials
from .. import models

router = APIRouter()


@router.post('/login')
def login(userCredentials: UserCredentials, db: Session = Depends(get_db)):
    user = db.query(models.User_Login).filter(models.User.email ==
                                              userCredentials.email).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Wrong login information")
