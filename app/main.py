from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, condecimal
from sqlalchemy import create_engine, Column, Integer, Numeric, String, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from redis import Redis
import os
#povezivanje na bazu
DB_HOST = os.environ.get("DB_HOST", "mysql")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "my-secret-pw")
DB_NAME = os.environ.get("DB_NAME", "mydatabase")

DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# redis
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
redis_client = Redis(host=REDIS_HOST, port=6379, decode_responses=True)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static", html=True), name="static")
templates = Jinja2Templates(directory="templates")

class User(Base):
    __tablename__ = "korisnici"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)

    donations = relationship("Donation", back_populates="user")

class Category(Base):
    __tablename__ = "kategorije"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)

    donations = relationship("Donation", back_populates="category")

class Organization(Base):
    __tablename__ = "organizacije"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)


class PaymentMethod(Base):
    __tablename__ = "metode_placanja"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)

    donations = relationship("Donation", back_populates="payment_method")

class Donation(Base):
    __tablename__ = "donacije"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    user_id = Column(Integer, ForeignKey('korisnici.id'), nullable=False)
    user = relationship("User", back_populates="donations")

    category_id = Column(Integer, ForeignKey('kategorije.id'), nullable=False)
    category = relationship("Category", back_populates="donations")

    organization = Column(String(100), nullable=True)
    time = Column(DateTime, default=datetime.utcnow, nullable=False)

    payment_method_id = Column(Integer, ForeignKey('metode_placanja.id'), nullable=False)
    payment_method = relationship("PaymentMethod", back_populates="donations")

class OrganizationSchema(BaseModel):
    name: str

class PaymentMethodSchema(BaseModel):
    name: str

class DonationSchema(BaseModel):
    amount: condecimal(gt=0, max_digits=10, decimal_places=2)
    user_id: int
    category_id: int
    organization: str | None = None
    payment_method_id: int

@app.on_event("startup")
def startup_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

@app.post("/api/payment_methods", response_model=dict)
def create_payment_method(pm: PaymentMethodSchema, db=Depends(get_db)):
    new_pm = PaymentMethod(name=pm.name)
    db.add(new_pm)
    db.commit()
    db.refresh(new_pm)
    return {"id": new_pm.id, "name": new_pm.name}

@app.get("/api/payment_methods", response_model=list[dict])
def read_payment_methods(db=Depends(get_db)):
    methods = db.query(PaymentMethod).all()
    return [{"id": m.id, "name": m.name} for m in methods]

@app.post("/api/donacije", response_model=dict)
def create_donation(donation: DonationSchema, db=Depends(get_db)):
    db_donation = Donation(
        amount=donation.amount,
        user_id=donation.user_id,
        category_id=donation.category_id,
        organization=donation.organization,
        payment_method_id=donation.payment_method_id
    )
    db.add(db_donation)
    db.commit()
    db.refresh(db_donation)

    # ocisti cache
    redis_client.delete("donations_list")
    redis_client.delete("total_donations")

    return {
        "id": db_donation.id,
        "amount": float(db_donation.amount),
        "organization": db_donation.organization,
        "payment_method_id": db_donation.payment_method_id,
        "time": db_donation.time.isoformat() if db_donation.time else None
    }

@app.get("/api/donacije", response_model=list[dict])
def read_donations(db=Depends(get_db)):
    cached_donations = redis_client.get("donations_list")
    if cached_donations:
        return eval(cached_donations)

    donations = db.query(Donation).all()
    result = []
    for d in donations:
        result.append({
            "id": d.id,
            "amount": float(d.amount),
            "user_id": d.user_id,
            "category_id": d.category_id,
            "organization": d.organization,
            "payment_method_id": d.payment_method_id,
            "time": d.time.strftime("%Y-%m-%d %H:%M:%S") if d.time else None
        })
    redis_client.set("donations_list", str(result), ex=60)
    return result


@app.put("/api/donacije/{donation_id}", response_model=dict)
def update_donation(donation_id: int, donation: DonationSchema, db=Depends(get_db)):
    """
    U ovom primjeru radimo full update => klijent mora poslati sve atribute (DonationSchema).
    Ako želite partial update, napravite poseban schema ili sve polja optional.
    """
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    # Ažuriraj polja
    db_donation.amount = donation.amount
    db_donation.user_id = donation.user_id
    db_donation.category_id = donation.category_id
    db_donation.organization = donation.organization
    db_donation.payment_method_id = donation.payment_method_id

    db.commit()
    db.refresh(db_donation)

    # obriši keš
    redis_client.delete("donations_list")
    redis_client.delete("total_donations")

    return {
        "id": db_donation.id,
        "amount": float(db_donation.amount),
        "organization": db_donation.organization,
        "payment_method_id": db_donation.payment_method_id,
        "time": db_donation.time.isoformat() if db_donation.time else None
    }

@app.delete("/api/donacije/{donation_id}", response_model=dict)
def delete_donation(donation_id: int, db=Depends(get_db)):
    db_donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not db_donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    db.delete(db_donation)
    db.commit()

    # obriši keš
    redis_client.delete("donations_list")
    redis_client.delete("total_donations")

    return {"message": "Donation deleted successfully", "id": donation_id}

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
