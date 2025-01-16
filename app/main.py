# app/main.py
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, condecimal
from sqlalchemy import create_engine, Column, Integer, Numeric
from sqlalchemy.orm import sessionmaker, declarative_base

import os

DB_HOST = os.environ.get("DB_HOST", "mysql")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "my-secret-pw")
DB_NAME = os.environ.get("DB_NAME", "mydatabase")

DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

app = FastAPI()

# Povezivanje statičkih fajlova
app.mount("/static", StaticFiles(directory="static"), name="static")

# Povezivanje Jinja2 template-a
templates = Jinja2Templates(directory="templates")


class Donation(Base):
    __tablename__ = 'donations'
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)  # Numerička vrijednost donacije


# Pydantic schema
class DonationSchema(BaseModel):
    amount: condecimal(gt=0, max_digits=10, decimal_places=2)  # Donacija mora biti veća od 0


# Kreiraj tablicu pri pokretanju (samo za demo)
@app.on_event("startup")
def startup_db():
    Base.metadata.create_all(bind=engine)


# Dependency za dobivanje DB sesije
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ruta za frontend
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# API Endpoints

# CREATE
@app.post("/api/donations", response_model=dict)
def create_donation(donation: DonationSchema, db=Depends(get_db)):
    db_donation = Donation(amount=donation.amount)
    db.add(db_donation)
    db.commit()
    db.refresh(db_donation)
    return {"id": db_donation.id, "amount": float(db_donation.amount)}


# READ (all)
@app.get("/api/donations", response_model=list[dict])
def read_donations(db=Depends(get_db)):
    donations = db.query(Donation).all()
    return [{"id": d.id, "amount": float(d.amount)} for d in donations]


# UPDATE
@app.put("/api/donations/{donation_id}", response_model=dict)
def update_donation(donation_id: int, donation: DonationSchema, db=Depends(get_db)):
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    db_donation.amount = donation.amount
    db.commit()
    db.refresh(db_donation)
    return {"id": db_donation.id, "amount": float(db_donation.amount)}


# DELETE
@app.delete("/api/donations/{donation_id}", response_model=dict)
def delete_donation(donation_id: int, db=Depends(get_db)):
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    db.delete(db_donation)
    db.commit()
    return {"message": "Donation deleted successfully"}


# GET Total Donations
@app.get("/api/donations/total", response_model=dict)
def get_total_donations(db=Depends(get_db)):
    total = db.query(Donation).with_entities(func.sum(Donation.amount)).scalar() or 0.00
    return {"total": float(total)}
