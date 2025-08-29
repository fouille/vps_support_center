#!/usr/bin/env python3
"""
Create test data for email diagnostic testing
"""

import requests
import json

# Configuration
BACKEND_URL = "https://supportdesk-5.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
AGENT_CREDENTIALS = {
    "email": "admin@voipservices.fr",
    "password": "admin1234!"
}

def get_agent_token():
    """Get agent authentication token"""
    response = requests.post(f"{API_BASE}/auth", json=AGENT_CREDENTIALS)
    if response.status_code == 200:
        return response.json()['access_token']
    return None

def create_test_data():
    """Create test client data"""
    token = get_agent_token()
    if not token:
        print("❌ Failed to authenticate")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create test client
    client_data = {
        "nom_societe": "Test Company SARL",
        "adresse": "123 Test Street, Test City",
        "nom": "Test",
        "prenom": "User",
        "numero": "TEST001"
    }
    
    response = requests.post(f"{API_BASE}/clients", json=client_data, headers=headers)
    if response.status_code == 201:
        print("✅ Test client created")
        return True
    else:
        print(f"❌ Failed to create test client: {response.status_code}")
        return False

if __name__ == "__main__":
    create_test_data()