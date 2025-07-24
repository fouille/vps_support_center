from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import uuid
import base64

load_dotenv()

app = FastAPI(title="Ticket Support System API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Database configuration
DATABASE_URL = os.getenv("NETLIFY_DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    nom: str
    prenom: str
    societe: Optional[str] = None

class UserCreate(UserBase):
    password: str
    telephone: Optional[str] = None

class UserResponse(UserBase):
    id: str
    type_utilisateur: str
    telephone: Optional[str] = None

class ClientBase(BaseModel):
    nom_societe: str
    adresse: str
    nom: str
    prenom: str

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: str

class TicketBase(BaseModel):
    titre: str
    client_id: str
    status: str = "nouveau"
    date_fin_prevue: Optional[datetime] = None
    requete_initiale: str

class TicketCreate(TicketBase):
    pass

class TicketResponse(TicketBase):
    id: str
    demandeur_id: str
    agent_id: Optional[str] = None
    date_creation: datetime
    date_modification: datetime
    date_cloture: Optional[datetime] = None
    fichiers: List[Dict[str, Any]] = []
    echanges: List[Dict[str, Any]] = []

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Database connection
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return email
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# API Endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Check in demandeurs table
            cursor.execute(
                "SELECT id, email, password, nom, prenom, societe, telephone, 'demandeur' as type_utilisateur FROM demandeurs WHERE email = %s",
                (login_data.email,)
            )
            user = cursor.fetchone()
            
            # If not found in demandeurs, check in agents table
            if not user:
                cursor.execute(
                    "SELECT id, email, password, nom, prenom, societe, NULL as telephone, 'agent' as type_utilisateur FROM agents WHERE email = %s",
                    (login_data.email,)
                )
                user = cursor.fetchone()
            
            if not user or not verify_password(login_data.password, user['password']):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password"
                )
            
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user['email'], "type": user['type_utilisateur']},
                expires_delta=access_token_expires
            )
            
            user_response = UserResponse(
                id=user['id'],
                email=user['email'],
                nom=user['nom'],
                prenom=user['prenom'],
                societe=user['societe'],
                telephone=user['telephone'],
                type_utilisateur=user['type_utilisateur']
            )
            
            return Token(
                access_token=access_token,
                token_type="bearer",
                user=user_response
            )
    finally:
        conn.close()

# Initialize database and create default admin user
@app.on_event("startup")
async def startup_event():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if admin user exists
            cursor.execute("SELECT email FROM agents WHERE email = 'admin@voipservices.fr'")
            if not cursor.fetchone():
                # Create default admin user
                admin_id = str(uuid.uuid4())
                hashed_password = get_password_hash("admin1234!")
                cursor.execute(
                    "INSERT INTO agents (id, email, password, nom, prenom, societe) VALUES (%s, %s, %s, %s, %s, %s)",
                    (admin_id, "admin@voipservices.fr", hashed_password, "Admin", "System", "VoIP Services")
                )
                conn.commit()
                print("Default admin user created")
    except Exception as e:
        print(f"Startup error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)