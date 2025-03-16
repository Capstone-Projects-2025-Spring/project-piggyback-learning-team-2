from .database import Base
from sqlalchemy import Column, Integer, String
from sqlalchemy.sql.expression import text
from sqlalchemy.sql.sqltypes import TIMESTAMP


# still need alembic for updates
class User_engagment(Base):
    __tablename__ = "user_engagement"

    total_time_seconds = Column(Integer, nullable=False,
                                server_default=text("0"))
    total_pauses = Column(Integer, nullable=False, server_default=text("0"))
    correct_answers = Column(Integer, nullable=False, server_default=text("0"))
    session_started = Column(TIMESTAMP(timezone=True), nullable=False,
                             server_default=text('now()'))
    video_url = Column(String(255), primary_key=True, nullable=False)
