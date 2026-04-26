"""
SentinelAI User Management Routes
User CRUD, role management, invite, activate/deactivate
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from database import get_db, User, AuditLog, UserRole
from auth_utils import (
    get_current_user,
    require_role,
    hash_password,
    generate_api_key,
    log_audit
)

router = APIRouter(prefix="/api/users", tags=["User Management"])


# Pydantic models
class UserSummary(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    organisation: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]


class UserListResponse(BaseModel):
    users: List[UserSummary]
    total: int


class InviteUserRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    organisation: Optional[str] = None
    role: str = "viewer"


class InviteUserResponse(BaseModel):
    message: str
    user: UserSummary
    temporary_credentials: dict


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    organisation: Optional[str] = None


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    List all users in the system.

    Requires admin role.
    Returns users with their roles and last login times.
    """
    try:
        total = db.query(User).count()
        offset = (page - 1) * page_size
        users = db.query(User).offset(offset).limit(page_size).all()

        return UserListResponse(
            users=[
                UserSummary(
                    id=u.id,
                    email=u.email,
                    full_name=u.full_name,
                    organisation=u.organisation,
                    role=u.role.value,
                    is_active=u.is_active,
                    created_at=u.created_at,
                    last_login=u.last_login
                )
                for u in users
            ],
            total=total
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )


@router.post("/invite", response_model=InviteUserResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    request: InviteUserRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Invite a new user to the system.

    Creates user account and returns temporary credentials.
    The invited user should change their password on first login.
    """
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Validate role
        if request.role not in ["admin", "analyst", "viewer"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Must be: admin, analyst, or viewer"
            )

        # Generate temporary password
        import secrets
        temp_password = secrets.token_urlsafe(12)

        # Create user
        new_user = User(
            email=request.email,
            hashed_password=hash_password(temp_password),
            full_name=request.full_name,
            organisation=request.organisation,
            role=UserRole(request.role),
            is_active=True,
            api_key=generate_api_key()
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Log the invitation
        log_audit(
            db=db,
            user_id=current_user.id,
            action="USER_INVITED",
            resource="users",
            details=f"Admin {current_user.email} invited user: {request.email} as {request.role}"
        )

        return InviteUserResponse(
            message=f"User invited successfully. Welcome email would be sent to {request.email}",
            user=UserSummary(
                id=new_user.id,
                email=new_user.email,
                full_name=new_user.full_name,
                organisation=new_user.organisation,
                role=new_user.role.value,
                is_active=new_user.is_active,
                created_at=new_user.created_at,
                last_login=new_user.last_login
            ),
            temporary_credentials={
                "email": request.email,
                "temporary_password": temp_password,
                "warning": "User should change password on first login"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invite user: {str(e)}"
        )


@router.put("/{user_id}/role", response_model=UserSummary)
async def change_user_role(
    user_id: str,
    new_role: str = Query(..., description="New role: admin, analyst, or viewer"),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Change a user's role.

    Requires admin role.
    Valid roles: admin, analyst, viewer
    """
    try:
        # Validate role
        if new_role not in ["admin", "analyst", "viewer"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Must be: admin, analyst, or viewer"
            )

        # Find user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Prevent self-demotion
        if user.id == current_user.id and new_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote yourself from admin"
            )

        old_role = user.role.value
        user.role = UserRole(new_role)
        db.commit()
        db.refresh(user)

        # Log the change
        log_audit(
            db=db,
            user_id=current_user.id,
            action="ROLE_CHANGED",
            resource="users",
            details=f"Changed {user.email} role from {old_role} to {new_role}"
        )

        return UserSummary(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            organisation=user.organisation,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change role: {str(e)}"
        )


@router.put("/{user_id}/deactivate", response_model=UserSummary)
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Deactivate a user account.

    User can no longer login but their data is preserved.
    Requires admin role.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )

        user.is_active = False
        db.commit()
        db.refresh(user)

        # Log the deactivation
        log_audit(
            db=db,
            user_id=current_user.id,
            action="USER_DEACTIVATED",
            resource="users",
            details=f"Deactivated user: {user.email}"
        )

        return UserSummary(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            organisation=user.organisation,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate user: {str(e)}"
        )


@router.put("/{user_id}/activate", response_model=UserSummary)
async def activate_user(
    user_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Reactivate a previously deactivated user account.

    Requires admin role.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user.is_active = True
        db.commit()
        db.refresh(user)

        # Log the activation
        log_audit(
            db=db,
            user_id=current_user.id,
            action="USER_ACTIVATED",
            resource="users",
            details=f"Reactivated user: {user.email}"
        )

        return UserSummary(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            organisation=user.organisation,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate user: {str(e)}"
        )


@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Soft delete a user account.

    Sets is_active to false and anonymizes data.
    Does not delete associated records to preserve audit trail.
    Requires admin role.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )

        # Soft delete - preserve data but deactivate
        user.is_active = False
        user.email = f"deleted_{user_id}@deleted.local"
        user.full_name = "Deleted User"
        user.organisation = None
        user.api_key = None
        db.commit()

        # Log the deletion
        log_audit(
            db=db,
            user_id=current_user.id,
            action="USER_DELETED",
            resource="users",
            details=f"Soft deleted user ID: {user_id}"
        )

        return {
            "message": "User account has been soft deleted",
            "user_id": user_id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


@router.get("/me", response_model=UserSummary)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's own profile.

    Any authenticated user can access their own profile.
    """
    return UserSummary(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        organisation=current_user.organisation,
        role=current_user.role.value,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


@router.put("/me", response_model=UserSummary)
async def update_own_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's own profile.

    Can update full_name and organisation.
    Cannot change role, email, or password through this endpoint.
    """
    try:
        if request.full_name is not None:
            current_user.full_name = request.full_name

        if request.organisation is not None:
            current_user.organisation = request.organisation

        db.commit()
        db.refresh(current_user)

        log_audit(
            db=db,
            user_id=current_user.id,
            action="PROFILE_UPDATED",
            resource="users",
            details="User updated their own profile"
        )

        return UserSummary(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            organisation=current_user.organisation,
            role=current_user.role.value,
            is_active=current_user.is_active,
            created_at=current_user.created_at,
            last_login=current_user.last_login
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )
