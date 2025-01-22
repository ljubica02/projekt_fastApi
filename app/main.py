from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, condecimal
from sqlalchemy import create_engine, Column, Integer, Numeric, String, ForeignKey, func
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

from redis import Redis

import os
#Postavke baze podataka
DB_HOST = os.environ.get("DB_HOST", "mysql")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "my-secret-pw")
DB_NAME = os.environ.get("DB_NAME", "mydatabase")

DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# postavke Redisa
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
redis_client = Redis(host=REDIS_HOST, port=6379, decode_responses=True)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static", html=True), name="static")

templates = Jinja2Templates(directory="templates")

class Donation(Base):
    __tablename__ = 'donacije'
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    user_id = Column(Integer, ForeignKey('korisnici.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('kategorije.id'), nullable=False)

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

class Project(Base):
    __tablename__ = 'projekti'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)

class Transaction(Base):
    __tablename__ = 'transakcije'
    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey('donacije.id'), nullable=False)

Donation.user = relationship("User", back_populates="donations")
Donation.category = relationship("Category", back_populates="donations")

#za validaciju podataka
class DonationSchema(BaseModel):
    amount: condecimal(gt=0, max_digits=10, decimal_places=2)
    user_id: int
    category_id: int


@app.on_event("startup")
def startup_db():
    Base.metadata.create_all(bind=engine)


#funkcija za upravljanje s bazom podataka
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

#dodavanje
@app.post("/api/donacije", response_model=dict)
def create_donation(donation: DonationSchema, db=Depends(get_db)):
    db_donation = Donation(
        amount=donation.amount,
        user_id=donation.user_id,
        category_id=donation.category_id
    )
    db.add(db_donation)
    db.commit()
    db.refresh(db_donation)
    redis_client.delete("donations_list") # Očisti keš
    redis_client.delete("total_donations")  # Očisti keš
    return {"id": db_donation.id, "amount": float(db_donation.amount)}

@app.get("/api/donacije", response_model=list[dict])
def read_donations(db=Depends(get_db)):
    cached_donations = redis_client.get("donations_list")
    if cached_donations:
        return eval(cached_donations)  # Pretvori string natrag u listu

    donations = db.query(Donation).all()
    result = [{"id": d.id, "amount": float(d.amount), "user_id": d.user_id, "category_id": d.category_id} for d in donations]
    redis_client.set("donations_list", str(result), ex=60)  # Keširaj listu na 60 sekundi
    return result

@app.put("/api/donacije/{donation_id}", response_model=dict)
def update_donation(donation_id: int, donation: DonationSchema, db=Depends(get_db)):
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donacija nije nadjena")

    db_donation.amount = donation.amount
    db_donation.user_id = donation.user_id
    db_donation.category_id = donation.category_id
    db.commit()
    db.refresh(db_donation)
    redis_client.delete("donations_list") # Očisti keš
    redis_client.delete("total_donations")  # Očisti keš
    return {"id": db_donation.id, "amount": float(db_donation.amount)}

@app.delete("/api/donacije/{donation_id}", response_model=dict)
def delete_donation(donation_id: int, db=Depends(get_db)):
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donacija nije nadjena")

    db.delete(db_donation)
    db.commit()
    redis_client.delete("donations_list") # Očisti keš
    redis_client.delete("total_donations")  # Očisti keš
    return {"message": "Donacija izbrisana"}

@app.get("/api/donacije/ukupno", response_model=dict)
def get_total_donations(db=Depends(get_db)):
    total = redis_client.get("total_donations")
    if total is None:
        total = db.query(func.sum(Donation.amount)).scalar() or 0.00
        redis_client.set("total_donations", total, ex=60)  # Keširaj na 60 sekundi
    return {"ukupno": float(total)}
