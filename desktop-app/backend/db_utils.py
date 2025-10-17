import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Any


class AudioDatabase:
    """Database utility class for audio monitoring"""

    def __init__(self, db_path: str = "audio_monitor.db"):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)

    def init_db(self):
        """Initialize database with required tables"""
        conn = self.get_connection()
        c = conn.cursor()

        # Calibration table
        c.execute("""CREATE TABLE IF NOT EXISTS calibration
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      dbfs_value REAL NOT NULL,
                      spl_value REAL NOT NULL,
                      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)""")

        # Hourly readings table
        c.execute("""CREATE TABLE IF NOT EXISTS hourly_readings
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      timestamp DATETIME NOT NULL,
                      hour TEXT NOT NULL,
                      avg_level REAL NOT NULL,
                      max_level REAL NOT NULL,
                      duration REAL NOT NULL,
                      date TEXT NOT NULL)""")

        # Daily summary table
        c.execute("""CREATE TABLE IF NOT EXISTS daily_summary
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      date TEXT NOT NULL UNIQUE,
                      avg_level REAL NOT NULL,
                      max_level REAL NOT NULL,
                      total_exposure REAL NOT NULL)""")

        # Time by decibel range table
        c.execute("""CREATE TABLE IF NOT EXISTS time_by_range
                     (date TEXT NOT NULL,
                      range TEXT NOT NULL,
                      time_hours REAL NOT NULL,
                      avg_level REAL NOT NULL,
                      PRIMARY KEY (date, range))""")

        # Create indexes for better query performance
        c.execute("""CREATE INDEX IF NOT EXISTS idx_hourly_date 
                     ON hourly_readings(date)""")
        c.execute("""CREATE INDEX IF NOT EXISTS idx_time_range_date 
                     ON time_by_range(date)""")

        conn.commit()
        conn.close()

    def save_calibration(self, dbfs: float, spl: float) -> float:
        """Save calibration and return offset"""
        conn = self.get_connection()
        c = conn.cursor()
        c.execute(
            "INSERT INTO calibration (dbfs_value, spl_value) VALUES (?, ?)", (dbfs, spl)
        )
        conn.commit()
        conn.close()
        return spl - dbfs

    def get_latest_calibration(self) -> Dict[str, Any]:
        """Get the most recent calibration"""
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("""SELECT spl_value, dbfs_value, timestamp 
                     FROM calibration 
                     ORDER BY timestamp DESC 
                     LIMIT 1""")
        result = c.fetchone()
        conn.close()

        if result:
            spl, dbfs, timestamp = result
            return {
                "spl_value": spl,
                "dbfs_value": dbfs,
                "offset": spl - dbfs,
                "timestamp": timestamp,
            }
        return {"offset": 0.0}

    def save_reading(self, spl: float, timestamp: str = None) -> None:
        """Save an audio reading"""
        if timestamp is None:
            timestamp = datetime.now().isoformat()

        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        date_str = dt.strftime("%Y-%m-%d")
        hour_str = dt.strftime("%I%p")

        conn = self.get_connection()
        c = conn.cursor()

        # Update or insert hourly reading
        c.execute(
            """SELECT id, avg_level, duration, max_level 
                     FROM hourly_readings 
                     WHERE date = ? AND hour = ?""",
            (date_str, hour_str),
        )
        existing = c.fetchone()

        duration_increment = 1 / 3600  # 1 second in hours

        if existing:
            reading_id, current_avg, current_duration, current_max = existing
            new_duration = current_duration + duration_increment
            new_avg = (
                (current_avg * current_duration) + (spl * duration_increment)
            ) / new_duration
            new_max = max(current_max, spl)

            c.execute(
                """UPDATE hourly_readings 
                        SET avg_level = ?, duration = ?, max_level = ? 
                        WHERE id = ?""",
                (new_avg, new_duration, new_max, reading_id),
            )
        else:
            c.execute(
                """INSERT INTO hourly_readings 
                        (timestamp, hour, avg_level, max_level, duration, date) 
                        VALUES (?, ?, ?, ?, ?, ?)""",
                (timestamp, hour_str, spl, spl, duration_increment, date_str),
            )

        # Update time by range
        db_range = self._get_decibel_range(spl)
        c.execute(
            """SELECT time_hours, avg_level 
                     FROM time_by_range 
                     WHERE date = ? AND range = ?""",
            (date_str, db_range),
        )
        range_data = c.fetchone()

        if range_data:
            current_time, current_avg = range_data
            new_time = current_time + duration_increment
            new_avg = (
                (current_avg * current_time) + (spl * duration_increment)
            ) / new_time
            c.execute(
                """UPDATE time_by_range 
                        SET time_hours = ?, avg_level = ? 
                        WHERE date = ? AND range = ?""",
                (new_time, new_avg, date_str, db_range),
            )
        else:
            c.execute(
                """INSERT INTO time_by_range 
                        (date, range, time_hours, avg_level) 
                        VALUES (?, ?, ?, ?)""",
                (date_str, db_range, duration_increment, spl),
            )

        conn.commit()
        conn.close()

    def get_daily_data(self, date: str = None) -> List[Dict[str, Any]]:
        """Get hourly data for a specific day"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        conn = self.get_connection()
        c = conn.cursor()
        c.execute(
            """SELECT hour, avg_level, duration 
                     FROM hourly_readings 
                     WHERE date = ? 
                     ORDER BY timestamp""",
            (date,),
        )
        results = c.fetchall()
        conn.close()

        # Create 24-hour structure
        hours = [
            f"{i % 12 if i % 12 else 12}{'AM' if i < 12 else 'PM'}" for i in range(24)
        ]
        data = []

        for hour in hours:
            matching = [r for r in results if r[0] == hour]
            if matching:
                _, level, duration = matching[0]
                data.append(
                    {
                        "hour": hour,
                        "level": round(level, 1),
                        "duration": round(duration, 2),
                    }
                )
            else:
                data.append({"hour": hour, "level": 0, "duration": 0})

        return data

    def get_weekly_data(self) -> List[Dict[str, Any]]:
        """Get summary data for the past week"""
        conn = self.get_connection()
        c = conn.cursor()

        end_date = datetime.now()
        start_date = end_date - timedelta(days=6)

        weekly_data = []
        for i in range(7):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime("%Y-%m-%d")
            day_name = current_date.strftime("%a")

            c.execute(
                """SELECT AVG(avg_level), SUM(duration) 
                        FROM hourly_readings 
                        WHERE date = ?""",
                (date_str,),
            )
            result = c.fetchone()

            if result and result[0]:
                avg_level = round(result[0], 1)
                total_exposure = round(result[1] or 0, 1)
            else:
                avg_level = 0
                total_exposure = 0

            weekly_data.append(
                {
                    "day": day_name,
                    "level": avg_level,
                    "totalExposure": total_exposure,
                    "date": date_str,
                }
            )

        conn.close()
        return weekly_data

    def get_time_by_range(
        self, date: str = None, period: str = "day"
    ) -> List[Dict[str, Any]]:
        """Get time spent in each decibel range"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        conn = self.get_connection()
        c = conn.cursor()

        if period == "week":
            end_date = datetime.now()
            start_date = end_date - timedelta(days=6)
            start_str = start_date.strftime("%Y-%m-%d")
            end_str = end_date.strftime("%Y-%m-%d")

            c.execute(
                """SELECT range, SUM(time_hours), AVG(avg_level) 
                        FROM time_by_range 
                        WHERE date BETWEEN ? AND ? 
                        GROUP BY range""",
                (start_str, end_str),
            )
        else:
            c.execute(
                """SELECT range, time_hours, avg_level 
                        FROM time_by_range 
                        WHERE date = ?""",
                (date,),
            )

        results = c.fetchall()
        conn.close()

        # Ensure all ranges are represented
        ranges = ["20-40dB", "40-60dB", "60-80dB", "80-90dB", "90-100dB", "100+dB"]
        data = []

        for range_name in ranges:
            matching = [r for r in results if r[0] == range_name]
            if matching:
                _, time_hours, avg_level = matching[0]
                data.append(
                    {
                        "range": range_name,
                        "time": round(time_hours, 1),
                        "avgLevel": round(avg_level, 1),
                    }
                )
            else:
                data.append({"range": range_name, "time": 0, "avgLevel": 0})

        return data

    def _get_decibel_range(self, level: float) -> str:
        """Categorize decibel level into range"""
        if level < 40:
            return "20-40dB"
        elif level < 60:
            return "40-60dB"
        elif level < 80:
            return "60-80dB"
        elif level < 90:
            return "80-90dB"
        elif level < 100:
            return "90-100dB"
        else:
            return "100+dB"

    def clear_old_data(self, days_to_keep: int = 90):
        """Clear data older than specified days"""
        cutoff_date = (datetime.now() - timedelta(days=days_to_keep)).strftime(
            "%Y-%m-%d"
        )

        conn = self.get_connection()
        c = conn.cursor()

        c.execute("DELETE FROM hourly_readings WHERE date < ?", (cutoff_date,))
        c.execute("DELETE FROM time_by_range WHERE date < ?", (cutoff_date,))
        c.execute("DELETE FROM daily_summary WHERE date < ?", (cutoff_date,))

        conn.commit()
        conn.close()

        print(f"Cleared data older than {cutoff_date}")
