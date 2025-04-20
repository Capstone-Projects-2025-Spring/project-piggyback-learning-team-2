from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class User_Login(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    engagements = relationship("User_engagment", back_populates="user")


class User_engagment(Base):
    __tablename__ = "engagements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(String)
    progress = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User_Login", back_populates="engagements")
