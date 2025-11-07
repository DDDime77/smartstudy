from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Task, Subject, TaskStage, Question, UserAnswer, StageType, TaskStatus
from app.schemas import (
    TaskInput,
    UpdateTask,
    TaskResponse,
    TaskStageInput,
    StartStageInput,
    CompleteStageInput,
    TaskStageResponse,
    QuestionInput,
    QuestionResponse,
    AnswerInput,
    GradeAnswerInput,
    UserAnswerResponse,
    TaskWithStagesResponse,
    StageWithQuestionsResponse,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ===== Task CRUD =====

@router.get("", response_model=List[TaskResponse])
async def get_all_tasks(
    status_filter: Optional[str] = Query(None, description="Filter by status: pending, in_progress, completed, overdue"),
    subject_id: Optional[str] = Query(None, description="Filter by subject ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks for the current user with optional filters"""
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if status_filter:
        try:
            status_enum = TaskStatus(status_filter)
            query = query.filter(Task.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )

    if subject_id:
        query = query.filter(Task.subject_id == subject_id)

    tasks = query.order_by(Task.deadline.asc().nullslast(), Task.created_at.desc()).all()
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific task by ID"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    return task


@router.get("/{task_id}/with-stages", response_model=TaskWithStagesResponse)
async def get_task_with_stages(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a task with all its stages"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    stages = db.query(TaskStage).filter(TaskStage.task_id == task_id).all()

    return {
        "task": task,
        "stages": stages
    }


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task"""
    # Verify subject exists if provided
    if task_data.subject_id:
        subject = db.query(Subject).filter(
            Subject.id == task_data.subject_id,
            Subject.user_id == current_user.id
        ).first()

        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )

    # Create task
    task = Task(
        user_id=current_user.id,
        subject_id=task_data.subject_id,
        title=task_data.title,
        description=task_data.description,
        task_type=task_data.task_type,
        difficulty=task_data.difficulty,
        deadline=task_data.deadline,
        tags=task_data.tags,
        status=TaskStatus.PENDING
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: UpdateTask,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Verify subject if being updated
    if task_data.subject_id:
        subject = db.query(Subject).filter(
            Subject.id == task_data.subject_id,
            Subject.user_id == current_user.id
        ).first()

        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )

    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    # Auto-set completed_at if status changes to completed
    if task_data.status == TaskStatus.COMPLETED and not task.completed_at:
        task.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    db.delete(task)
    db.commit()

    return None


# ===== Task Stage Endpoints =====

@router.post("/stages", response_model=TaskStageResponse, status_code=status.HTTP_201_CREATED)
async def create_task_stage(
    stage_data: TaskStageInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task stage (acknowledgement, preparation, or practice)"""
    # Verify task exists and belongs to user
    task = db.query(Task).filter(
        Task.id == stage_data.task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check if stage already exists for this task
    existing_stage = db.query(TaskStage).filter(
        TaskStage.task_id == stage_data.task_id,
        TaskStage.stage_type == stage_data.stage_type
    ).first()

    if existing_stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{stage_data.stage_type.value} stage already exists for this task"
        )

    # Create stage
    stage = TaskStage(
        task_id=stage_data.task_id,
        user_id=current_user.id,
        stage_type=stage_data.stage_type,
        difficulty=stage_data.difficulty,
        topic=stage_data.topic,
        resources=[r.model_dump() for r in stage_data.resources] if stage_data.resources else None
    )

    db.add(stage)
    db.commit()
    db.refresh(stage)

    return stage


@router.get("/stages/{stage_id}", response_model=StageWithQuestionsResponse)
async def get_task_stage(
    stage_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a task stage with its questions and user answers"""
    stage = db.query(TaskStage).filter(
        TaskStage.id == stage_id,
        TaskStage.user_id == current_user.id
    ).first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    questions = db.query(Question).filter(Question.stage_id == stage_id).all()
    user_answers = db.query(UserAnswer).filter(
        UserAnswer.user_id == current_user.id,
        UserAnswer.question_id.in_([q.id for q in questions])
    ).all() if questions else []

    return {
        "stage": stage,
        "questions": questions,
        "user_answers": user_answers
    }


@router.post("/stages/{stage_id}/start", response_model=TaskStageResponse)
async def start_task_stage(
    stage_id: str,
    start_data: StartStageInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a task stage (records start time)"""
    stage = db.query(TaskStage).filter(
        TaskStage.id == stage_id,
        TaskStage.user_id == current_user.id
    ).first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    if stage.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage already started"
        )

    stage.start_time = datetime.utcnow()
    stage.time_of_day = start_data.time_of_day
    stage.energy_level = start_data.energy_level

    db.commit()
    db.refresh(stage)

    return stage


@router.post("/stages/{stage_id}/complete", response_model=TaskStageResponse)
async def complete_task_stage(
    stage_id: str,
    complete_data: CompleteStageInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a task stage (records end time and performance)"""
    stage = db.query(TaskStage).filter(
        TaskStage.id == stage_id,
        TaskStage.user_id == current_user.id
    ).first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    if not stage.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot complete a stage that hasn't been started"
        )

    if stage.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage already completed"
        )

    # Calculate duration
    end_time = datetime.utcnow()
    duration_seconds = int((end_time - stage.start_time).total_seconds())

    # Calculate success rate from questions
    questions = db.query(Question).filter(Question.stage_id == stage_id).all()
    if questions:
        answers = db.query(UserAnswer).filter(
            UserAnswer.user_id == current_user.id,
            UserAnswer.question_id.in_([q.id for q in questions])
        ).all()

        stage.total_questions = len(questions)
        stage.correct_answers = sum(1 for a in answers if a.is_correct)
        if stage.total_questions > 0:
            stage.success_rate = stage.correct_answers / stage.total_questions

    stage.end_time = end_time
    stage.duration_seconds = duration_seconds
    stage.completed = True
    stage.completed_at = end_time
    stage.focus_rating = complete_data.focus_rating

    if complete_data.energy_level is not None:
        stage.energy_level = complete_data.energy_level

    db.commit()
    db.refresh(stage)

    return stage


# ===== Question Endpoints =====

@router.post("/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question_data: QuestionInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a question for a task stage"""
    # Verify stage exists and belongs to user
    stage = db.query(TaskStage).filter(
        TaskStage.id == question_data.stage_id,
        TaskStage.user_id == current_user.id
    ).first()

    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    # Create question
    question = Question(
        stage_id=question_data.stage_id,
        question_text=question_data.question_text,
        question_type=question_data.question_type,
        difficulty=question_data.difficulty,
        options=question_data.options,
        correct_answer=question_data.correct_answer,
        sample_solution=question_data.sample_solution,
        marking_criteria=question_data.marking_criteria
    )

    db.add(question)
    db.commit()
    db.refresh(question)

    return question


@router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific question"""
    question = db.query(Question).join(TaskStage).filter(
        Question.id == question_id,
        TaskStage.user_id == current_user.id
    ).first()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a question"""
    question = db.query(Question).join(TaskStage).filter(
        Question.id == question_id,
        TaskStage.user_id == current_user.id
    ).first()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    db.delete(question)
    db.commit()

    return None


# ===== Answer Endpoints =====

@router.post("/answers", response_model=UserAnswerResponse, status_code=status.HTTP_201_CREATED)
async def submit_answer(
    answer_data: AnswerInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an answer to a question"""
    # Verify question exists
    question = db.query(Question).join(TaskStage).filter(
        Question.id == answer_data.question_id,
        TaskStage.user_id == current_user.id
    ).first()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    # Check if answer already exists
    existing_answer = db.query(UserAnswer).filter(
        UserAnswer.question_id == answer_data.question_id,
        UserAnswer.user_id == current_user.id
    ).first()

    if existing_answer:
        # Update existing answer
        existing_answer.user_answer = answer_data.user_answer
        existing_answer.time_spent_seconds = answer_data.time_spent_seconds

        # Auto-grade multiple choice
        if question.question_type.value == "multiple_choice" and question.correct_answer:
            existing_answer.is_correct = answer_data.user_answer.strip().lower() == question.correct_answer.strip().lower()

        db.commit()
        db.refresh(existing_answer)
        return existing_answer

    # Create new answer
    answer = UserAnswer(
        question_id=answer_data.question_id,
        user_id=current_user.id,
        user_answer=answer_data.user_answer,
        time_spent_seconds=answer_data.time_spent_seconds
    )

    # Auto-grade multiple choice
    if question.question_type.value == "multiple_choice" and question.correct_answer:
        answer.is_correct = answer_data.user_answer.strip().lower() == question.correct_answer.strip().lower()

    db.add(answer)
    db.commit()
    db.refresh(answer)

    return answer


@router.put("/answers/{answer_id}/grade", response_model=UserAnswerResponse)
async def grade_answer(
    answer_id: str,
    grade_data: GradeAnswerInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Grade a user answer (for written/calculation questions)"""
    answer = db.query(UserAnswer).filter(
        UserAnswer.id == answer_id,
        UserAnswer.user_id == current_user.id
    ).first()

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found"
        )

    # Update grading fields
    if grade_data.is_correct is not None:
        answer.is_correct = grade_data.is_correct
    if grade_data.points_earned is not None:
        answer.points_earned = grade_data.points_earned
    if grade_data.max_points is not None:
        answer.max_points = grade_data.max_points
    if grade_data.feedback is not None:
        answer.feedback = grade_data.feedback

    db.commit()
    db.refresh(answer)

    return answer
