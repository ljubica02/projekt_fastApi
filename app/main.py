# app/main.py
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base

import os

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "my-secret-pw")
DB_NAME = os.environ.get("DB_NAME", "mydatabase")

DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{
    DB_PASSWORD}@{DB_HOST}:3306/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

app = FastAPI()


class Item(Base):
    __tablename__ = 'items'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)

# Pydantic schema


class ItemSchema(BaseModel):
    name: str

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

# CREATE


@app.post("/items", response_model=dict)
def create_item(item: ItemSchema, db=Depends(get_db)):
    db_item = Item(name=item.name)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id, "name": db_item.name}

# READ (all)


@app.get("/items", response_model=list[dict])
def read_items(db=Depends(get_db)):
    items = db.query(Item).all()
    return [{"id": i.id, "name": i.name} for i in items]

# UPDATE


@app.put("/items/{item_id}", response_model=dict)
def update_item(item_id: int, item: ItemSchema, db=Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        return {"error": "Item not found"}

    db_item.name = item.name
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id, "name": db_item.name}

# DELETE


@app.delete("/items/{item_id}", response_model=dict)
def delete_item(item_id: int, db=Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        return {"error": "Item not found"}

    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted successfully"}
