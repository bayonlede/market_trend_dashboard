import os

# Read backend URL from Railway environment variable
# Set this in Railway dashboard: API_BASE_URL = https://your-backend.railway.app
API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8000")
