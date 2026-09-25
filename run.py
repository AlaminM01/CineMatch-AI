"""
CineMatch AI - Main Application Runner & Server Launcher
========================================================
Launches the FastAPI backend serving the CineMatch AI REST API
and mounts the glassmorphism frontend at http://localhost:8000.
"""

import sys
import os
import time
import threading
import webbrowser
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

BANNER = r"""
   _____ _            __  __       _       _         _    ___ 
  / ____(_)          |  \/  |     | |     | |       / \  |_ _|
 | |     _ _ __   ___| \  / | __ _| |_ ___| |__    / _ \  | | 
 | |    | | '_ \ / _ \ |\/| |/ _` | __/ __| '_ \  / ___ \ | | 
 | |____| | | | |  __/ |  | | (_| | || (__| | | |/ /   \ \| | 
  \_____|_|_| |_|\___|_|  |_|\__,_|\__\___|_| |_/_/     \_\___|
  
   Discover your next favorite story | CineMatch AI Platform
   Running on: http://localhost:8000
   API Docs:   http://localhost:8000/docs
================================================================
"""


def verify_environment():
    """Verify that required datasets and directories are present."""
    movies_csv = PROJECT_ROOT / "movies.csv"
    ratings_csv = PROJECT_ROOT / "ratings.csv"
    
    if not movies_csv.exists() or not ratings_csv.exists():
        print("[WARNING] MovieLens dataset CSVs (movies.csv / ratings.csv) not found in project root.")
        print(f"Looked in: {PROJECT_ROOT}")
        print("Please ensure movies.csv and ratings.csv are present for ML recommendations.\n")
    else:
        print(f"[OK] Found movies.csv ({movies_csv.stat().st_size:,} bytes)")
        print(f"[OK] Found ratings.csv ({ratings_csv.stat().st_size:,} bytes)")


def open_browser_after_delay(url: str = "http://localhost:8000", delay: float = 1.5):
    """Opens the application in the user's default browser after the server initializes."""
    def _open():
        time.sleep(delay)
        print(f"\n[LAUNCHER] Opening {url} in your default browser...")
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"[LAUNCHER] Could not open browser automatically: {e}")
            print(f"Please open your browser manually and visit {url}")

    thread = threading.Thread(target=_open, daemon=True)
    thread.start()


def main():
    print(BANNER)
    verify_environment()

    # Pre-launch browser
    open_browser_after_delay()

    try:
        import uvicorn
        print("\n[SERVER] Starting Uvicorn ASGI server...")
        uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
    except ImportError:
        print("[ERROR] uvicorn is not installed. Please install requirements:")
        print("    pip install -r backend/requirements.txt")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n[SERVER] CineMatch AI server stopped by user. Goodbye!")
        sys.exit(0)


if __name__ == "__main__":
    main()
