from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

SQLAlchemy_Database_URL = os.getenv("database_url")
print("Loaded DATABASE_URL:", SQLAlchemy_Database_URL)

# Set up SQLAlchemy engine and session
engine = create_engine(SQLAlchemy_Database_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency function for DB sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
