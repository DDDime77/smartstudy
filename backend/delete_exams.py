"""
Script to delete all existing exam records from the database.
This is needed after modifying the exam table structure.
"""
from app.core.database import SessionLocal
from app.models import Exam

def delete_all_exams():
    db = SessionLocal()
    try:
        # Get count of exams before deletion
        exam_count = db.query(Exam).count()
        print(f"Found {exam_count} existing exam records")

        # Delete all exam records
        db.query(Exam).delete()
        db.commit()

        print(f"Successfully deleted {exam_count} exam records")
        print("Exam table structure has been updated with new fields")

    except Exception as e:
        print(f"Error deleting exams: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_all_exams()
