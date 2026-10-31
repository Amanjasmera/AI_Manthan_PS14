from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initializes production SQLite database schema for all models and
    safely adds new columns if they do not exist in existing database files.
    """
    import app.models  # Ensures all tables are imported into Base.metadata
    Base.metadata.create_all(bind=engine)

    # Safe column migrations for existing SQLite database instances
    try:
        with engine.connect() as conn:
            # Check screenings table
            res = conn.execute(text("PRAGMA table_info(screenings)"))
            screenings_cols = {row[1] for row in res.fetchall()}
            if "uncertainty_score" not in screenings_cols:
                conn.execute(text("ALTER TABLE screenings ADD COLUMN uncertainty_score FLOAT DEFAULT 0.0"))
            if "requires_manual_doctor_review" not in screenings_cols:
                conn.execute(text("ALTER TABLE screenings ADD COLUMN requires_manual_doctor_review BOOLEAN DEFAULT 0"))

            # Check predictions table
            res_pred = conn.execute(text("PRAGMA table_info(predictions)"))
            pred_cols = {row[1] for row in res_pred.fetchall()}
            if "uncertainty_score" not in pred_cols:
                conn.execute(text("ALTER TABLE predictions ADD COLUMN uncertainty_score FLOAT DEFAULT 0.0"))
            if "requires_manual_doctor_review" not in pred_cols:
                conn.execute(text("ALTER TABLE predictions ADD COLUMN requires_manual_doctor_review BOOLEAN DEFAULT 0"))
            if "epistemic_uncertainty" not in pred_cols:
                conn.execute(text("ALTER TABLE predictions ADD COLUMN epistemic_uncertainty FLOAT DEFAULT 0.0"))
            if "aleatoric_uncertainty" not in pred_cols:
                conn.execute(text("ALTER TABLE predictions ADD COLUMN aleatoric_uncertainty FLOAT DEFAULT 0.0"))

            # Check active_learning_logs table
            res_al = conn.execute(text("PRAGMA table_info(active_learning_logs)"))
            al_cols = {row[1] for row in res_al.fetchall()}
            if "ai_predicted_grade" not in al_cols:
                conn.execute(text("ALTER TABLE active_learning_logs ADD COLUMN ai_predicted_grade INTEGER"))
            if "was_overridden" not in al_cols:
                conn.execute(text("ALTER TABLE active_learning_logs ADD COLUMN was_overridden BOOLEAN DEFAULT 0"))
            if "doctor_name" not in al_cols:
                conn.execute(text("ALTER TABLE active_learning_logs ADD COLUMN doctor_name VARCHAR(120)"))
            if "clinical_notes" not in al_cols:
                conn.execute(text("ALTER TABLE active_learning_logs ADD COLUMN clinical_notes TEXT DEFAULT ''"))
            if "uncertainty_score" not in al_cols:
                conn.execute(text("ALTER TABLE active_learning_logs ADD COLUMN uncertainty_score FLOAT DEFAULT 0.0"))
            if "image_path" not in al_cols:
                conn.execute(text("ALTER TABLE active_learning_logs ADD COLUMN image_path VARCHAR(500)"))

            conn.commit()
    except Exception as mig_err:
        print(f"Notice: SQLite migration check info: {mig_err}")
