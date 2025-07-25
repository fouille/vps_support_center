#!/usr/bin/env python3
"""
Production API Testing for ticket-echanges endpoint
Testing against the actual Netlify Functions deployment
"""

import requests
import json
import uuid
import sys
from datetime import datetime

# Configuration - Production URL
BACKEND_URL = "https://50e93936-6a41-4e42-98c9-7dde2d98d8eb.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
AGENT_CREDENTIALS = {
    "email": "admin@voipservices.fr",
    "password": "admin1234!"
}

def test_production_api():
    """Test the production ticket-echanges API"""
    print("🚀 Testing Production Ticket-echanges API")
    print(f"Backend URL: {BACKEND_URL}")
    print("="*60)
    
    # Step 1: Try to authenticate
    print("\n📋 STEP 1: Authentication Test")
    try:
        response = requests.post(
            f"{API_BASE}/auth",
            json=AGENT_CREDENTIALS,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Auth response status: {response.status_code}")
        print(f"Auth response: {response.text[:200]}...")
        
        if response.status_code != 200:
            print("❌ Authentication failed - cannot proceed with API tests")
            return False
            
        token = response.json().get('access_token')
        if not token:
            print("❌ No access token received")
            return False
            
        print("✅ Authentication successful")
        
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        return False
    
    # Step 2: Test ticket-echanges endpoint
    print("\n📋 STEP 2: Ticket-echanges API Test")
    
    # Test missing ticketId parameter
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/ticket-echanges", headers=headers, timeout=10)
        
        print(f"Missing ticketId test - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print("✅ Missing ticketId parameter validation works")
        else:
            print("❌ Missing ticketId parameter validation failed")
            
    except Exception as e:
        print(f"❌ Missing ticketId test error: {str(e)}")
    
    # Test with fake ticket ID
    fake_ticket_id = str(uuid.uuid4())
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE}/ticket-echanges?ticketId={fake_ticket_id}", 
            headers=headers, 
            timeout=10
        )
        
        print(f"\nFake ticket ID test - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            comments = response.json()
            if isinstance(comments, list) and len(comments) == 0:
                print("✅ Fake ticket ID returns empty array (expected)")
            else:
                print("❌ Fake ticket ID should return empty array")
        else:
            print(f"❌ Unexpected status code for fake ticket ID: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Fake ticket ID test error: {str(e)}")
    
    # Test POST without ticketId
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/ticket-echanges", 
            headers=headers,
            json={"message": "Test comment"},
            timeout=10
        )
        
        print(f"\nPOST missing ticketId test - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print("✅ POST missing ticketId parameter validation works")
        else:
            print("❌ POST missing ticketId parameter validation failed")
            
    except Exception as e:
        print(f"❌ POST missing ticketId test error: {str(e)}")
    
    print("\n📋 STEP 3: Database Connection Test")
    
    # Try to get tickets to see if database is accessible
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/tickets", headers=headers, timeout=10)
        
        print(f"Tickets endpoint - Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("✅ Database connection appears to be working")
        else:
            print("❌ Database connection issues detected")
            
    except Exception as e:
        print(f"❌ Database connection test error: {str(e)}")
    
    return True

if __name__ == "__main__":
    print("🧪 Production API Testing - Ticket Comments System")
    print("=" * 60)
    
    success = test_production_api()
    
    if success:
        print("\n🎉 Production API tests completed!")
    else:
        print("\n💥 Production API tests failed!")