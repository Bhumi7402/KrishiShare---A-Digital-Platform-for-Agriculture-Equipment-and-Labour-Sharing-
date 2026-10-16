from datetime import date
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AgriShare AI Service", version="0.1.0")


class PriceRequest(BaseModel):
    base_price: float = Field(gt=0)
    demand_multiplier: float = Field(default=1.0, ge=0.0, le=3.0)


class TaskRequest(BaseModel):
    land_area: float = Field(gt=0)
    task_type: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "demo"}


@app.post("/v1/price-recommendation")
def price_recommendation(request: PriceRequest) -> dict[str, float | str]:
    raw = request.base_price * request.demand_multiplier
    recommended = min(request.base_price * 1.4, max(request.base_price * 0.8, raw))
    return {
        "basePrice": request.base_price,
        "recommendedPrice": round(recommended, 2),
        "demandLevel": "HIGH" if request.demand_multiplier > 1.1 else "NORMAL",
    }


@app.post("/v1/task-plan")
def task_plan(request: TaskRequest) -> dict[str, object]:
    workers = max(2, round(request.land_area * 1.6))
    return {
        "taskType": request.task_type,
        "requiredWorkers": workers,
        "requiredEquipment": "Sprayer" if "spray" in request.task_type.lower() else "Tractor",
        "estimatedDays": max(1, round(request.land_area / 3)),
        "generatedFor": date.today().isoformat(),
    }
