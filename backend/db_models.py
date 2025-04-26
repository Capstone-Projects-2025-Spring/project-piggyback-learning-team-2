from .database import Base
from sqlalchemy import Column, func, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.sql.expression import text
from sqlalchemy.sql.sqltypes import TIMESTAMP
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class User_engagment(Base):
    __tablename__ = "engagements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(String)
    progress = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User_Login", back_populates="engagements")


class User_Login(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    engagements = relationship("User_engagment", back_populates="user")

class VideoQuestion(Base):
    __tablename__ = "video_questions"

    video_id = Column(String, primary_key=True, index=True)
    video_link = Column(String, nullable=False)
    video_title = Column(String)
    video_thumbnail = Column(String)
    video_duration = Column(Integer)
    questions_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
