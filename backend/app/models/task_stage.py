from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Enum, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


class StageType(str, enum.Enum):
    ACKNOWLEDGEMENT = "acknowledgement"
    PREPARATION = "preparation"
    PRACTICE = "practice"


class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    WRITTEN = "written"
    CALCULATION = "calculation"


class TaskStage(Base):
    """Represents a stage (acknowledgement, preparation, practice) within a task"""
    __tablename__ = "task_stages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Stage info
    stage_type = Column(Enum(StageType), nullable=False)
    difficulty = Column(Integer, nullable=True)  # 1-5
    topic = Column(String, nullable=True)  # e.g., "Calculus - Derivatives"

    # Timing data (for ML training)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    time_of_day = Column(String, nullable=True)  # morning, afternoon, evening, night

    # Performance metrics
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    success_rate = Column(Float, nullable=True)  # correct_answers / total_questions
    focus_rating = Column(Integer, nullable=True)  # 1-5, user self-report
    energy_level = Column(Integer, nullable=True)  # 1-5, user self-report

    # Completion
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    # For acknowledgement stage: resources viewed
    resources = Column(JSON, nullable=True)  # [{type: "video", url: "...", title: "..."}]

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="stages")
    user = relationship("User", back_populates="task_stages")
    questions = relationship("Question", back_populates="stage", cascade="all, delete-orphan")


class Question(Base):
    """Questions within a task stage (preparation or practice)"""
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stage_id = Column(UUID(as_uuid=True), ForeignKey("task_stages.id", ondelete="CASCADE"), nullable=False)

    # Question content
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    difficulty = Column(Integer, nullable=True)  # 1-5

    # For multiple choice questions
    options = Column(JSON, nullable=True)  # ["option1", "option2", "option3", "option4"]
    correct_answer = Column(String, nullable=True)  # The correct answer

    # For written/calculation questions
    sample_solution = Column(Text, nullable=True)  # Example solution for reference
    marking_criteria = Column(JSON, nullable=True)  # Key points to look for

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    stage = relationship("TaskStage", back_populates="questions")
    user_answers = relationship("UserAnswer", back_populates="question", cascade="all, delete-orphan")


class UserAnswer(Base):
    """User's answer to a question (for performance tracking and ML)"""
    __tablename__ = "user_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Answer data
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=True)  # For MC questions, auto-graded; for written, teacher/self-graded
    time_spent_seconds = Column(Integer, nullable=True)

    # For written answers: optional grading
    points_earned = Column(Float, nullable=True)
    max_points = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)

    # Metadata
    submitted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    question = relationship("Question", back_populates="user_answers")
    user = relationship("User", back_populates="user_answers")
