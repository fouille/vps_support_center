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

# Clients CRUD
@app.get("/api/clients", response_model=List[ClientResponse])
async def get_clients(email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM clients ORDER BY nom_societe, nom, prenom")
            clients = cursor.fetchall()
            return [ClientResponse(**client) for client in clients]
    finally:
        conn.close()

@app.post("/api/clients", response_model=ClientResponse)
async def create_client(client: ClientCreate, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            client_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO clients (id, nom_societe, adresse, nom, prenom) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                (client_id, client.nom_societe, client.adresse, client.nom, client.prenom)
            )
            conn.commit()
            new_client = cursor.fetchone()
            return ClientResponse(**new_client)
    finally:
        conn.close()

@app.put("/api/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, client: ClientCreate, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "UPDATE clients SET nom_societe = %s, adresse = %s, nom = %s, prenom = %s WHERE id = %s RETURNING *",
                (client.nom_societe, client.adresse, client.nom, client.prenom, client_id)
            )
            conn.commit()
            updated_client = cursor.fetchone()
            if not updated_client:
                raise HTTPException(status_code=404, detail="Client not found")
            return ClientResponse(**updated_client)
    finally:
        conn.close()

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM clients WHERE id = %s", (client_id,))
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Client not found")
            return {"message": "Client deleted successfully"}
    finally:
        conn.close()

# Demandeurs CRUD
@app.get("/api/demandeurs", response_model=List[UserResponse])
async def get_demandeurs(email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT id, email, nom, prenom, societe, telephone, 'demandeur' as type_utilisateur FROM demandeurs ORDER BY nom, prenom")
            demandeurs = cursor.fetchall()
            return [UserResponse(**demandeur) for demandeur in demandeurs]
    finally:
        conn.close()

@app.post("/api/demandeurs", response_model=UserResponse)
async def create_demandeur(demandeur: UserCreate, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            demandeur_id = str(uuid.uuid4())
            hashed_password = get_password_hash(demandeur.password)
            cursor.execute(
                "INSERT INTO demandeurs (id, nom, prenom, societe, telephone, email, password) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, email, nom, prenom, societe, telephone",
                (demandeur_id, demandeur.nom, demandeur.prenom, demandeur.societe, demandeur.telephone, demandeur.email, hashed_password)
            )
            conn.commit()
            new_demandeur = cursor.fetchone()
            return UserResponse(**new_demandeur, type_utilisateur="demandeur")
    except psycopg2.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()

@app.put("/api/demandeurs/{demandeur_id}", response_model=UserResponse)
async def update_demandeur(demandeur_id: str, demandeur: UserCreate, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            hashed_password = get_password_hash(demandeur.password)
            cursor.execute(
                "UPDATE demandeurs SET nom = %s, prenom = %s, societe = %s, telephone = %s, email = %s, password = %s WHERE id = %s RETURNING id, email, nom, prenom, societe, telephone",
                (demandeur.nom, demandeur.prenom, demandeur.societe, demandeur.telephone, demandeur.email, hashed_password, demandeur_id)
            )
            conn.commit()
            updated_demandeur = cursor.fetchone()
            if not updated_demandeur:
                raise HTTPException(status_code=404, detail="Demandeur not found")
            return UserResponse(**updated_demandeur, type_utilisateur="demandeur")
    except psycopg2.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()

@app.delete("/api/demandeurs/{demandeur_id}")
async def delete_demandeur(demandeur_id: str, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM demandeurs WHERE id = %s", (demandeur_id,))
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Demandeur not found")
            return {"message": "Demandeur deleted successfully"}
    finally:
        conn.close()

# Agents CRUD
@app.get("/api/agents", response_model=List[UserResponse])
async def get_agents(email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT id, email, nom, prenom, societe, NULL as telephone, 'agent' as type_utilisateur FROM agents ORDER BY nom, prenom")
            agents = cursor.fetchall()
            return [UserResponse(**agent) for agent in agents]
    finally:
        conn.close()

@app.post("/api/agents", response_model=UserResponse)
async def create_agent(agent: UserCreate, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            agent_id = str(uuid.uuid4())
            hashed_password = get_password_hash(agent.password)
            cursor.execute(
                "INSERT INTO agents (id, nom, prenom, societe, email, password) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, email, nom, prenom, societe",
                (agent_id, agent.nom, agent.prenom, agent.societe, agent.email, hashed_password)
            )
            conn.commit()
            new_agent = cursor.fetchone()
            return UserResponse(**new_agent, telephone=None, type_utilisateur="agent")
    except psycopg2.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()

@app.put("/api/agents/{agent_id}", response_model=UserResponse)
async def update_agent(agent_id: str, agent: UserCreate, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            hashed_password = get_password_hash(agent.password)
            cursor.execute(
                "UPDATE agents SET nom = %s, prenom = %s, societe = %s, email = %s, password = %s WHERE id = %s RETURNING id, email, nom, prenom, societe",
                (agent.nom, agent.prenom, agent.societe, agent.email, hashed_password, agent_id)
            )
            conn.commit()
            updated_agent = cursor.fetchone()
            if not updated_agent:
                raise HTTPException(status_code=404, detail="Agent not found")
            return UserResponse(**updated_agent, telephone=None, type_utilisateur="agent")
    except psycopg2.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM agents WHERE id = %s", (agent_id,))
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Agent not found")
            return {"message": "Agent deleted successfully"}
    finally:
        conn.close()

# Tickets CRUD
@app.get("/api/tickets", response_model=List[TicketResponse])
async def get_tickets(email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT t.*, c.nom_societe as client_nom, 
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                ORDER BY t.date_creation DESC
            """)
            tickets = cursor.fetchall()
            
            result = []
            for ticket in tickets:
                ticket_data = dict(ticket)
                # Remove extra fields that aren't in TicketResponse
                for key in ['client_nom', 'demandeur_nom', 'demandeur_prenom', 'agent_nom', 'agent_prenom']:
                    ticket_data.pop(key, None)
                result.append(TicketResponse(**ticket_data))
            return result
    finally:
        conn.close()

@app.post("/api/tickets", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate, email: str = Depends(verify_token)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get demandeur_id from email
            cursor.execute("SELECT id FROM demandeurs WHERE email = %s", (email,))
            demandeur = cursor.fetchone()
            if not demandeur:
                raise HTTPException(status_code=403, detail="Only demandeurs can create tickets")
            
            ticket_id = str(uuid.uuid4())
            cursor.execute(
                """INSERT INTO tickets (id, titre, client_id, demandeur_id, status, date_fin_prevue, requete_initiale) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                (ticket_id, ticket.titre, ticket.client_id, demandeur['id'], ticket.status, ticket.date_fin_prevue, ticket.requete_initiale)
            )
            conn.commit()
            new_ticket = cursor.fetchone()
            return TicketResponse(**new_ticket)
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