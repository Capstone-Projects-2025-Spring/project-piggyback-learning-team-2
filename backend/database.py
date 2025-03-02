from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os
# import psycopg2
# from psycopg2.extras import RealDictCursor
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

SQLAlchemy_Database_URL = os.getenv("database_url")

engine = create_engine(SQLAlchemy_Database_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# # Fetch variables
# USER = os.getenv("user")
# PASSWORD = os.getenv("password")
# HOST = os.getenv("host")
# PORT = os.getenv("port")
# DBNAME = os.getenv("dbname")

# # Connect to the database
# try:
#     conn = psycopg2.connect(
#         user=USER,
#         password=PASSWORD,
#         host=HOST,
#         port=PORT,
#         dbname=DBNAME,
#         cursor_factory=RealDictCursor
#     )
#     cursor = conn.cursor()
#     print("Database connection was successful!")
# except Exception as error:
#     print("Connecting to database failed")
#     print("Error:", error)
