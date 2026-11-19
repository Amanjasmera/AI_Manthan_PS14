import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
# Check root directory first, then current backend directory
root_dir = Path(__file__).resolve().parent.parent.parent
env_candidates = [root_dir / ".env", Path(__file__).resolve().parent.parent / ".env"]
for env_file in env_candidates:
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
        break
else:
    load_dotenv()

# Read DATABASE_URL from environment (PostgreSQL production URL)
raw_db_url = os.environ.get("DATABASE_URL")

if raw_db_url:
    # Render and Heroku use postgres://, SQLAlchemy 1.4+ / 2.0 requires postgresql://
    if raw_db_url.startswith("postgres://"):
        DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = raw_db_url
else:
    # Reliable local fallback to SQLite if PostgreSQL is not configured
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    DATABASE_URL = f"sqlite:///{data_dir / 'retinal_screening.db'}"

# Configure production engine with connection pooling
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Production PostgreSQL connection with connection pooling & ping verification
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy database session per request
    and ensures it is cleanly closed after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Auto-creates all database tables on application startup
    and safely handles dialect-specific migrations and compatibility views.
    """
    import app.models  # Ensures all ORM models are registered
    Base.metadata.create_all(bind=engine)

    # SQLite/PostgreSQL safe column checks and compatibility views
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                res = conn.execute(text("PRAGMA table_info(screenings)"))
                screenings_cols = {row[1] for row in res.fetchall()}
                if "record_id" not in screenings_cols:
                    conn.execute(text("ALTER TABLE screenings ADD COLUMN record_id VARCHAR(64)"))
                if "approval_status" not in screenings_cols:
                    conn.execute(text("ALTER TABLE screenings ADD COLUMN approval_status VARCHAR(50) DEFAULT 'AUTO_APPROVED'"))
                if "clinician_notes" not in screenings_cols:
                    conn.execute(text("ALTER TABLE screenings ADD COLUMN clinician_notes TEXT"))
                if "raw_image_url" not in screenings_cols:
                    conn.execute(text("ALTER TABLE screenings ADD COLUMN raw_image_url VARCHAR(500)"))
                if "heatmap_image_url" not in screenings_cols:
                    conn.execute(text("ALTER TABLE screenings ADD COLUMN heatmap_image_url VARCHAR(500)"))
                
                res_pat = conn.execute(text("PRAGMA table_info(patients)"))
                patient_cols = {row[1] for row in res_pat.fetchall()}
                if "symptoms" not in patient_cols:
                    conn.execute(text("ALTER TABLE patients ADD COLUMN symptoms TEXT"))
                if "name" not in patient_cols and "full_name" in patient_cols:
                    conn.execute(text("ALTER TABLE patients ADD COLUMN name VARCHAR(120)"))

                # Create compatibility views for legacy test assertions
                conn.execute(text("""
                    CREATE VIEW IF NOT EXISTS screening_records AS
                    SELECT 
                        s.record_id AS id, 
                        COALESCE(p.name, p.full_name) AS patient_name, 
                        p.age, 
                        p.gender, 
                        COALESCE(s.icdr_grade, s.predicted_grade) AS dr_grade, 
                        COALESCE(s.model_confidence, s.confidence) AS confidence, 
                        s.status, 
                        COALESCE(s.clinician_notes, s.doctor_notes) AS doctor_notes 
                    FROM screenings s
                    LEFT JOIN patients p ON s.patient_id = p.id;
                """))

                conn.execute(text("""
                    CREATE VIEW IF NOT EXISTS users_view AS
                    SELECT 
                        id, 
                        full_name AS name, 
                        email, 
                        hashed_password AS password_hash, 
                        role, 
                        is_verified 
                    FROM users;
                """))
                conn.commit()
    except Exception as e:
        print(f"Notice: database initialization / view setup: {e}")
