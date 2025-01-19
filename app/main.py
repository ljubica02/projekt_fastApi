from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, condecimal
from sqlalchemy import create_engine, Column, Integer, Numeric
from sqlalchemy.orm import sessionmaker, declarative_base

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

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


class Donation(Base):
    __tablename__ = 'donacije'
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)  


#za validaciju podataka
class DonationSchema(BaseModel):
    amount: condecimal(gt=0, max_digits=10, decimal_places=2) 



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
    db_donation = Donation(amount=donation.amount)
    db.add(db_donation)
    db.commit()
    db.refresh(db_donation)
    return {"id": db_donation.id, "amount": float(db_donation.amount)}

#pregled
@app.get("/api/donacije", response_model=list[dict])
def read_donations(db=Depends(get_db)):
    donations = db.query(Donation).all()
    return [{"id": d.id, "amount": float(d.amount)} for d in donations]


@app.put("/api/donacije/{donation_id}", response_model=dict)
def update_donation(donation_id: int, donation: DonationSchema, db=Depends(get_db)):
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donacija nije nadjena")

    db_donation.amount = donation.amount
    db.commit()
    db.refresh(db_donation)
    return {"id": db_donation.id, "amount": float(db_donation.amount)}


@app.delete("/api/donacije/{donation_id}", response_model=dict)
def delete_donation(donation_id: int, db=Depends(get_db)):
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donacija nije nadjena")

    db.delete(db_donation)
    db.commit()
    return {"message": "Donacija izbrisana"}


@app.get("/api/donacije/ukupno", response_model=dict)
def get_total_donations(db=Depends(get_db)):
    total = db.query(Donation).with_entities(func.sum(Donation.amount)).scalar() or 0.00
    return {"ukupno": float(total)}
