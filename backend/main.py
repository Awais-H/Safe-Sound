from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import json

# Import database utilities
from db_utils import AudioDatabase

app = FastAPI()

# CORS middleware for Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = AudioDatabase("audio_monitor.db")


# Pydantic models
class CalibrationData(BaseModel):
    spl_reading: float
    dbfs_reading: float


class AudioReading(BaseModel):
    dbfs: float
    timestamp: Optional[str] = None


class CalibrationResponse(BaseModel):
    offset: float
    message: str


# Helper function
def dbfs_to_spl(dbfs: float) -> float:
    """Convert dBFS to SPL using calibration offset"""
    calibration = db.get_latest_calibration()
    offset = calibration.get("offset", 0.0)
    return dbfs + offset


# API Endpoints
@app.post("/api/calibration", response_model=CalibrationResponse)
async def save_calibration(data: CalibrationData):
    """Save calibration data"""
    try:
        offset = db.save_calibration(data.dbfs_reading, data.spl_reading)
        return CalibrationResponse(
            offset=offset,
            message=f"Calibration saved successfully. Offset: {offset:.2f} dB",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/calibration")
async def get_calibration():
    """Get current calibration data"""
    try:
        calibration = db.get_latest_calibration()
        if calibration.get("offset") == 0.0 and "timestamp" not in calibration:
            return {"message": "No calibration data found", "offset": 0.0}
        return calibration
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/audio-reading")
async def save_audio_reading(reading: AudioReading):
    """Save an audio reading"""
    try:
        spl = dbfs_to_spl(reading.dbfs)
        timestamp = reading.timestamp or datetime.now().isoformat()

        db.save_reading(spl, timestamp)

        return {"spl": round(spl, 1), "timestamp": timestamp, "status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/daily-data")
async def get_daily_data(date: Optional[str] = None):
    """Get hourly data for a specific day"""
    try:
        data = db.get_daily_data(date)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/weekly-data")
async def get_weekly_data():
    """Get summary data for the past week"""
    try:
        data = db.get_weekly_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/time-by-range")
async def get_time_by_range(date: Optional[str] = None, period: str = "day"):
    """Get time spent in each decibel range"""
    try:
        data = db.get_time_by_range(date, period)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/clear-old-data")
async def clear_old_data(days: int = 90):
    """Clear data older than specified days"""
    try:
        db.clear_old_data(days)
        return {"message": f"Cleared data older than {days} days"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/audio-stream")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time audio monitoring"""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            reading_data = json.loads(data)

            # Convert dBFS to SPL
            spl = dbfs_to_spl(reading_data["dbfs"])

            # Send back the SPL value
            await websocket.send_json(
                {"spl": round(spl, 1), "timestamp": datetime.now().isoformat()}
            )

            # Save to database
            db.save_reading(spl, datetime.now().isoformat())

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")


@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected",
    }


@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print("Starting Safe Sound Monitor Backend")
    print("Database initialized successfully")
    print("Server running on http://127.0.0.1:8000")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    print("Shutting down Safe Sound Monitor Backend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
