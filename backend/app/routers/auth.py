from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models import User
from app.schemas import UserRegister, UserLogin, Token, GoogleAuthRequest, UserResponse, UpdateUser, ChangePassword, DeleteAccount

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user with email and password"""

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        email_verified=False,
        profile_completed=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""

    # Find user
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if account is deleted
    if user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deleted"
        )

    # Verify password
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google", response_model=Token)
async def google_auth(auth_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth"""

    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            auth_data.token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        # Get user info from token
        email = idinfo.get("email")
        name = idinfo.get("name")
        google_id = idinfo.get("sub")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not found in Google token"
            )

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Create new user
            user = User(
                email=email,
                full_name=name,
                oauth_provider="google",
                oauth_id=google_id,
                email_verified=True,  # Google emails are verified
                profile_completed=False
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif user.deleted_at:
            # Prevent login for deleted accounts
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deleted"
            )

        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: str = Header(None, alias="Authorization"), db: Session = Depends(get_db)):
    """Get current logged-in user"""
    from app.core.security import decode_access_token

    # Extract token from Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")

    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    # Get user from database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UpdateUser,
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Update current logged-in user information"""
    from app.core.security import decode_access_token

    # Extract token from Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")

    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    # Get user from database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update only provided fields
    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    db.commit()
    db.refresh(user)

    return user


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePassword,
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Change user password"""
    from app.core.security import decode_access_token
    from datetime import datetime

    # Extract token from Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")

    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    # Get user from database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if user is OAuth user (no password)
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change password for OAuth users"
        )

    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password (basic validation)
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )

    # Update password
    user.password_hash = get_password_hash(password_data.new_password)
    user.password_updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Password changed successfully"}


@router.post("/delete-account", status_code=status.HTTP_200_OK)
async def delete_account(
    delete_data: DeleteAccount,
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Soft delete user account (keeps data for ML purposes)"""
    from app.core.security import decode_access_token
    from datetime import datetime

    # Extract token from Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")

    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    # Get user from database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already deleted
    if user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already deleted"
        )

    # Verify password (for non-OAuth users)
    if user.password_hash:
        if not verify_password(delete_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is incorrect"
            )

    # Soft delete: set deleted_at timestamp
    # This prevents login but keeps data for ML purposes
    user.deleted_at = datetime.utcnow()

    db.commit()

    return {"message": "Account deleted successfully. Your data will be retained for ML purposes."}
