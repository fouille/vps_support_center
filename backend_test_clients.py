#!/usr/bin/env python3
"""
Backend API Testing for Support Ticket Management System
Testing clients API with new structure (optional nom/prenom, numero field)
"""

import requests
import json
import uuid
import sys
from datetime import datetime

# Configuration - Use localhost for dev server
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
AGENT_CREDENTIALS = {
    "email": "admin@voipservices.fr",
    "password": "admin1234!"
}

class TestResults:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
        
    def add_result(self, test_name, passed, message=""):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            self.tests_failed += 1
            self.failures.append(f"{test_name}: {message}")
            print(f"❌ {test_name}: {message}")
    
    def summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        
        if self.failures:
            print(f"\nFAILURES:")
            for failure in self.failures:
                print(f"- {failure}")
        
        return self.tests_failed == 0

def authenticate_user(credentials, user_type):
    """Authenticate user and return token"""
    try:
        response = requests.post(
            f"{API_BASE}/auth",
            json=credentials,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            user_info = data.get('user', {})
            print(f"✅ {user_type} authentication successful - User: {user_info.get('nom', '')} {user_info.get('prenom', '')}")
            return token, user_info
        else:
            print(f"❌ {user_type} authentication failed: {response.status_code} - {response.text}")
            return None, None
            
    except Exception as e:
        print(f"❌ {user_type} authentication error: {str(e)}")
        return None, None

def test_clients_api():
    """Test the clients API with new structure (optional nom/prenom, numero field)"""
    results = TestResults()
    
    print("🚀 Starting Clients API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print("="*60)
    
    # Step 1: Authenticate agent
    print("\n📋 STEP 1: Authentication")
    agent_token, agent_info = authenticate_user(AGENT_CREDENTIALS, "Agent")
    
    if not agent_token:
        results.add_result("Agent Authentication", False, "Failed to authenticate agent")
        return results.summary()
    else:
        results.add_result("Agent Authentication", True)
    
    # Step 2: Test GET /api/clients
    print("\n📋 STEP 2: GET Clients")
    try:
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{API_BASE}/clients", headers=headers, timeout=10)
        
        if response.status_code == 200:
            clients = response.json()
            results.add_result("GET - Clients list", True)
            print(f"   Found {len(clients)} existing clients")
            
            # Validate response structure
            if isinstance(clients, list):
                results.add_result("GET - Response is array", True)
                
                if len(clients) > 0:
                    client = clients[0]
                    required_fields = ['id', 'nom_societe', 'adresse']
                    optional_fields = ['nom', 'prenom', 'numero']
                    
                    missing_required = [field for field in required_fields if field not in client]
                    has_optional = any(field in client for field in optional_fields)
                    
                    if not missing_required:
                        results.add_result("GET - Required fields present", True)
                    else:
                        results.add_result("GET - Required fields present", False, 
                                         f"Missing required fields: {missing_required}")
                    
                    results.add_result("GET - Optional fields supported", True, 
                                     f"Optional fields found: {[f for f in optional_fields if f in client]}")
                else:
                    results.add_result("GET - Response structure", True, "No clients to validate structure")
            else:
                results.add_result("GET - Response is array", False, "Response is not an array")
        else:
            results.add_result("GET - Clients list", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("GET - Clients list", False, str(e))
    
    # Step 3: Test POST /api/clients - Only required fields (nom_societe, adresse)
    print("\n📋 STEP 3: POST Client - Required Fields Only")
    test_client_minimal = {
        "nom_societe": f"Entreprise Test {datetime.now().strftime('%H%M%S')}",
        "adresse": "123 Rue de Test, 75001 Paris"
    }
    
    created_client_id = None
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/clients", 
            headers=headers,
            json=test_client_minimal,
            timeout=10
        )
        
        if response.status_code == 201:
            client = response.json()
            created_client_id = client.get('id')
            results.add_result("POST - Client with required fields only", True)
            
            # Validate response structure
            if client.get('nom_societe') == test_client_minimal['nom_societe'] and \
               client.get('adresse') == test_client_minimal['adresse']:
                results.add_result("POST - Required fields correct", True)
            else:
                results.add_result("POST - Required fields correct", False, "Field values don't match")
            
            # Check optional fields are null/empty
            if client.get('nom') is None and client.get('prenom') is None and client.get('numero') is None:
                results.add_result("POST - Optional fields null", True)
            else:
                results.add_result("POST - Optional fields null", False, 
                                 f"Expected null optional fields, got: nom={client.get('nom')}, prenom={client.get('prenom')}, numero={client.get('numero')}")
        else:
            results.add_result("POST - Client with required fields only", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("POST - Client with required fields only", False, str(e))
    
    # Step 4: Test POST /api/clients - All fields
    print("\n📋 STEP 4: POST Client - All Fields")
    test_client_full = {
        "nom_societe": f"Société Complète {datetime.now().strftime('%H%M%S')}",
        "adresse": "456 Avenue Complète, 75002 Paris",
        "nom": "Dupont",
        "prenom": "Marie",
        "numero": "0123456789"
    }
    
    created_client_full_id = None
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/clients", 
            headers=headers,
            json=test_client_full,
            timeout=10
        )
        
        if response.status_code == 201:
            client = response.json()
            created_client_full_id = client.get('id')
            results.add_result("POST - Client with all fields", True)
            
            # Validate all fields
            fields_match = all(client.get(key) == value for key, value in test_client_full.items())
            if fields_match:
                results.add_result("POST - All fields correct", True)
            else:
                results.add_result("POST - All fields correct", False, "Some field values don't match")
        else:
            results.add_result("POST - Client with all fields", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("POST - Client with all fields", False, str(e))
    
    # Step 5: Test POST validation - Missing required fields
    print("\n📋 STEP 5: POST Validation Tests")
    
    # Test missing nom_societe
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/clients", 
            headers=headers,
            json={"adresse": "Test address"},
            timeout=10
        )
        
        if response.status_code == 400:
            results.add_result("POST - Missing nom_societe validation", True)
        else:
            results.add_result("POST - Missing nom_societe validation", False, 
                             f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_result("POST - Missing nom_societe validation", False, str(e))
    
    # Test missing adresse
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/clients", 
            headers=headers,
            json={"nom_societe": "Test Company"},
            timeout=10
        )
        
        if response.status_code == 400:
            results.add_result("POST - Missing adresse validation", True)
        else:
            results.add_result("POST - Missing adresse validation", False, 
                             f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_result("POST - Missing adresse validation", False, str(e))
    
    # Step 6: Test PUT /api/clients/{id} - Update client
    print("\n📋 STEP 6: PUT Client Updates")
    
    if created_client_id:
        # Test updating with numero field
        update_data = {
            "nom_societe": "Entreprise Mise à Jour",
            "adresse": "789 Rue Mise à Jour, 75003 Paris",
            "nom": "Martin",
            "prenom": "Pierre",
            "numero": "0987654321"
        }
        
        try:
            headers = {
                "Authorization": f"Bearer {agent_token}",
                "Content-Type": "application/json"
            }
            response = requests.put(
                f"{API_BASE}/clients/{created_client_id}", 
                headers=headers,
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                updated_client = response.json()
                results.add_result("PUT - Client update", True)
                
                # Validate updated fields
                fields_match = all(updated_client.get(key) == value for key, value in update_data.items())
                if fields_match:
                    results.add_result("PUT - Updated fields correct", True)
                else:
                    results.add_result("PUT - Updated fields correct", False, "Some updated field values don't match")
            else:
                results.add_result("PUT - Client update", False, 
                                 f"Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            results.add_result("PUT - Client update", False, str(e))
    else:
        results.add_result("PUT - Client update", False, "No client ID available for update test")
    
    # Step 7: Test PUT with non-existent client
    print("\n📋 STEP 7: PUT Non-existent Client")
    
    fake_client_id = str(uuid.uuid4())
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.put(
            f"{API_BASE}/clients/{fake_client_id}", 
            headers=headers,
            json={"nom_societe": "Test", "adresse": "Test"},
            timeout=10
        )
        
        if response.status_code == 404:
            results.add_result("PUT - Non-existent client", True)
        else:
            results.add_result("PUT - Non-existent client", False, 
                             f"Expected 404, got {response.status_code}")
    except Exception as e:
        results.add_result("PUT - Non-existent client", False, str(e))
    
    # Step 8: Test authentication validation
    print("\n📋 STEP 8: Authentication Validation")
    
    # Test without token
    try:
        response = requests.get(f"{API_BASE}/clients", timeout=10)
        
        if response.status_code == 401:
            results.add_result("GET - No token", True)
        else:
            results.add_result("GET - No token", False, 
                             f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.add_result("GET - No token", False, str(e))
    
    # Test with invalid token
    try:
        headers = {"Authorization": "Bearer invalid_token"}
        response = requests.get(f"{API_BASE}/clients", headers=headers, timeout=10)
        
        if response.status_code == 401:
            results.add_result("GET - Invalid token", True)
        else:
            results.add_result("GET - Invalid token", False, 
                             f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.add_result("GET - Invalid token", False, str(e))
    
    # Step 9: Clean up test data
    print("\n📋 STEP 9: Cleanup Test Data")
    
    # Delete created clients
    for client_id in [created_client_id, created_client_full_id]:
        if client_id:
            try:
                headers = {"Authorization": f"Bearer {agent_token}"}
                response = requests.delete(f"{API_BASE}/clients/{client_id}", headers=headers, timeout=10)
                
                if response.status_code == 200:
                    results.add_result(f"DELETE - Test client {client_id[:8]}", True)
                else:
                    results.add_result(f"DELETE - Test client {client_id[:8]}", False, 
                                     f"Status: {response.status_code}")
            except Exception as e:
                results.add_result(f"DELETE - Test client {client_id[:8]}", False, str(e))
    
    return results.summary()

if __name__ == "__main__":
    print("🧪 Backend API Testing - Clients API with New Structure")
    print("=" * 60)
    
    success = test_clients_api()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)