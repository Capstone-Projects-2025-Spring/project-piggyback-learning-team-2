from .database import Base
from sqlalchemy import Column, func, Integer, String, JSON, DateTime
from sqlalchemy.sql.expression import text
from sqlalchemy.sql.sqltypes import TIMESTAMP


class User_engagment(Base):
    __tablename__ = "user_engagement"

    total_time_seconds = Column(Integer, nullable=False,
                                server_default=text("0"))
    total_pauses = Column(Integer, nullable=False, server_default=text("0"))
    correct_answers = Column(Integer, nullable=False, server_default=text("0"))
    session_started = Column(TIMESTAMP(timezone=True), nullable=False,
                             server_default=text('now()'))
    video_url = Column(String(255), primary_key=True, nullable=False)


class User_Login(Base):
    __tablename__ = "user_login"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False,
                       server_default=('now()'))
    password = Column(String(255), nullable=False)

class VideoQuestion(Base):
    __tablename__ = "video_questions"

    video_id = Column(String, primary_key=True, index=True)
    video_link = Column(String, nullable=False)
    video_title = Column(String)
    video_thumbnail = Column(String)
    video_duration = Column(Integer)
    questions_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
