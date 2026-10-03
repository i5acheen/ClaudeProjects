import os

# Test values only: set before app modules read the environment.
os.environ.update({
    "WHATSAPP_TOKEN": "test-token",
    "PHONE_NUMBER_ID": "123",
    "VERIFY_TOKEN": "verify-me",
    "APP_SECRET": "test-secret",
    "GEMINI_API_KEY": "test-key",
    "GOOGLE_SHEET_ID": "",
})
