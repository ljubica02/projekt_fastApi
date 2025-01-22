from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, condecimal
from sqlalchemy import create_engine, Column, Integer, Numeric, String, ForeignKey, func
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from redis import Redis
import os

# Postavke baze podataka
DB_HOST = os.environ.get("DB_HOST", "mysql")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "my-secret-pw")
DB_NAME = os.environ.get("DB_NAME", "mydatabase")

DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# Postavke Redisa
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
redis_client = Redis(host=REDIS_HOST, port=6379, decode_responses=True)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static", html=True), name="static")

templates = Jinja2Templates(directory="templates")


# Modeli baze podataka
class Donation(Base):
    __tablename__ = 'donacije'
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    user_id = Column(Integer, ForeignKey('korisnici.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('kategorije.id'), nullable=False)
    organization = Column(String(100), nullable=True) 

class User(Base):
    __tablename__ = 'korisnici'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    donations = relationship("Donation", back_populates="user")

class Category(Base):
    __tablename__ = 'kategorije'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    donations = relationship("Donation", back_populates="category")

class Organization(Base):
    __tablename__ = 'organizacije'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    donations = relationship("Donation", back_populates="organization")


Donation.user = relationship("User", back_populates="donations")
Donation.category = relationship("Category", back_populates="donations")
Donation.organization = relationship("Organization", back_populates="donations")


# Validacija podataka
class DonationSchema(BaseModel):
    amount: condecimal(gt=0, max_digits=10, decimal_places=2)
    user_id: int
    category_id: int
    organization: str | None = None

class OrganizationSchema(BaseModel):
    name: str


# Inicijalizacija baze podataka
@app.on_event("startup")
def startup_db():
    Base.metadata.create_all(bind=engine)


# Funkcija za upravljanje s bazom podataka
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Rute za organizacije
@app.post("/api/organizations", response_model=dict)
def create_organization(org: OrganizationSchema, db=Depends(get_db)):
    db_org = Organization(name=org.name)
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return {"id": db_org.id, "name": db_org.name}

@app.get("/api/organizations", response_model=list[dict])
def read_organizations(db=Depends(get_db)):
    organizations = db.query(Organization).all()
    return [{"id": o.id, "name": o.name} for o in organizations]


# Rute za donacije
@app.post("/api/donacije", response_model=dict)
def create_donation(donation: DonationSchema, db=Depends(get_db)):
    db_donation = Donation(
        amount=donation.amount,
        user_id=donation.user_id,
        category_id=donation.category_id,
        organization=donation.organization
    )
    db.add(db_donation)
    db.commit()
    db.refresh(db_donation)
    redis_client.delete("donations_list")  # Očisti keš
    redis_client.delete("total_donations")  # Očisti keš
    return {
        "id": db_donation.id,
        "amount": float(db_donation.amount),
        "organization": db_donation.organization
    }

@app.get("/api/donacije", response_model=list[dict])
def read_donations(db=Depends(get_db)):
    cached_donations = redis_client.get("donations_list")
    if cached_donations:
        return eval(cached_donations)

    donations = db.query(Donation).all()
    result = [
        {
            "id": d.id,
            "amount": float(d.amount),
            "user_id": d.user_id,
            "category_id": d.category_id,
            "organization": d.organization
        }
        for d in donations
    ]
    redis_client.set("donations_list", str(result), ex=60)
    return result
    
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
