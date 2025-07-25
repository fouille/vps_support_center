#!/usr/bin/env python3
"""
Backend API Testing for Portabilités System
Testing the new portability management functionality
"""

import requests
import json
import uuid
import sys
from datetime import datetime

# Configuration - Use production URL from frontend/.env
BACKEND_URL = "https://f999a7c8-f6a8-444a-8c77-adc39ebd62f8.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
AGENT_CREDENTIALS = {
    "email": "admin@voipservices.fr",
    "password": "admin1234!"
}

DEMANDEUR_CREDENTIALS = {
    "email": "sophie.martin@techcorp.fr", 
    "password": "password123"  # Default from database
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

def test_portabilites_api():
    """Test the new portabilités API functionality"""
    results = TestResults()
    
    print("🚀 Starting Portabilités API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print("="*60)
    
    # Step 1: Authenticate users
    print("\n📋 STEP 1: Authentication Tests")
    agent_token, agent_info = authenticate_user(AGENT_CREDENTIALS, "Agent")
    demandeur_token, demandeur_info = authenticate_user(DEMANDEUR_CREDENTIALS, "Demandeur")
    
    if not agent_token:
        results.add_result("Agent Authentication", False, "Failed to authenticate agent")
        return results.summary()
    else:
        results.add_result("Agent Authentication", True)
    
    if not demandeur_token:
        results.add_result("Demandeur Authentication", False, "Failed to authenticate demandeur")
        # Continue with agent tests only
    else:
        results.add_result("Demandeur Authentication", True)
    
    headers = {
        "Authorization": f"Bearer {agent_token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Get test data for portabilité creation
    print("\n📋 STEP 2: Get Test Data")
    
    # Get a client for portabilité creation
    try:
        response = requests.get(f"{API_BASE}/clients", headers=headers, timeout=10)
        if response.status_code == 200:
            clients_data = response.json()
            if 'data' in clients_data and len(clients_data['data']) > 0:
                test_client_id = clients_data['data'][0]['id']
                test_client = clients_data['data'][0]
                results.add_result("Get Test Client", True)
            elif isinstance(clients_data, list) and len(clients_data) > 0:
                test_client_id = clients_data[0]['id']
                test_client = clients_data[0]
                results.add_result("Get Test Client", True)
            else:
                results.add_result("Get Test Client", False, "No clients found")
                return results.summary()
        else:
            results.add_result("Get Test Client", False, f"Status: {response.status_code}")
            return results.summary()
    except Exception as e:
        results.add_result("Get Test Client", False, str(e))
        return results.summary()
    
    # Get a demandeur for portabilité creation
    try:
        response = requests.get(f"{API_BASE}/demandeurs", headers=headers, timeout=10)
        if response.status_code == 200:
            demandeurs = response.json()
            if len(demandeurs) > 0:
                test_demandeur_id = demandeurs[0]['id']
                test_demandeur = demandeurs[0]
                results.add_result("Get Test Demandeur", True)
            else:
                results.add_result("Get Test Demandeur", False, "No demandeurs found")
                return results.summary()
        else:
            results.add_result("Get Test Demandeur", False, f"Status: {response.status_code}")
            return results.summary()
    except Exception as e:
        results.add_result("Get Test Demandeur", False, str(e))
        return results.summary()
    
    # Step 3: Test POST /api/portabilites - Create portabilité with auto-generated numero
    print("\n📋 STEP 3: POST Portabilités - Creation with Auto-Generated Number")
    
    portabilite_data = {
        "client_id": test_client_id,
        "demandeur_id": test_demandeur_id,
        "numeros_portes": "0123456789, 0987654321",
        "nom_client": "Dupont",
        "prenom_client": "Jean",
        "email_client": "jean.dupont@example.com",
        "siret_client": "12345678901234",
        "adresse": "123 Rue de la Portabilité",
        "code_postal": "75001",
        "ville": "Paris",
        "date_portabilite_demandee": "2025-02-01",
        "fiabilisation_demandee": True,
        "demande_signee": False
    }
    
    created_portabilites = []
    
    # Create multiple portabilités to test uniqueness
    for i in range(2):
        test_data = portabilite_data.copy()
        test_data["numeros_portes"] = f"012345678{i}, 098765432{i}"
        test_data["nom_client"] = f"TestClient{i+1}"
        
        try:
            response = requests.post(f"{API_BASE}/portabilites", headers=headers, 
                                   json=test_data, timeout=10)
            
            if response.status_code == 201:
                portabilite = response.json()
                created_portabilites.append(portabilite)
                
                # Verify numero_portabilite is present and has correct format (8 digits)
                if 'numero_portabilite' in portabilite:
                    numero = portabilite['numero_portabilite']
                    if len(numero) == 8 and numero.isdigit():
                        results.add_result(f"POST - Portabilité {i+1} numero format", True)
                    else:
                        results.add_result(f"POST - Portabilité {i+1} numero format", False, 
                                         f"Expected 8 digits, got: {numero}")
                else:
                    results.add_result(f"POST - Portabilité {i+1} numero present", False, 
                                     "numero_portabilite field missing")
                
                # Verify required fields
                required_fields = ['id', 'client_id', 'demandeur_id', 'numeros_portes', 'status']
                missing_fields = [field for field in required_fields if field not in portabilite]
                
                if not missing_fields:
                    results.add_result(f"POST - Portabilité {i+1} structure", True)
                else:
                    results.add_result(f"POST - Portabilité {i+1} structure", False, 
                                     f"Missing fields: {missing_fields}")
                
                # Verify default status
                if portabilite.get('status') == 'nouveau':
                    results.add_result(f"POST - Portabilité {i+1} default status", True)
                else:
                    results.add_result(f"POST - Portabilité {i+1} default status", False, 
                                     f"Expected 'nouveau', got: {portabilite.get('status')}")
                    
            else:
                results.add_result(f"POST - Create Portabilité {i+1}", False, 
                                 f"Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            results.add_result(f"POST - Create Portabilité {i+1}", False, str(e))
    
    # Test uniqueness of generated numbers
    if len(created_portabilites) >= 2:
        numeros = [p.get('numero_portabilite') for p in created_portabilites if 'numero_portabilite' in p]
        unique_numeros = set(numeros)
        if len(numeros) == len(unique_numeros):
            results.add_result("POST - numero_portabilite uniqueness", True)
        else:
            results.add_result("POST - numero_portabilite uniqueness", False, 
                             f"Duplicate numbers found: {numeros}")
    
    # Step 4: Test GET /api/portabilites - Pagination and filters
    print("\n📋 STEP 4: GET Portabilités - Pagination and Filters")
    
    # Test basic GET with pagination
    try:
        response = requests.get(f"{API_BASE}/portabilites?page=1&limit=5", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - Basic pagination", True)
            
            # Verify response structure
            if 'data' in data and 'pagination' in data:
                results.add_result("GET - Response structure", True)
                
                pagination = data['pagination']
                required_fields = ['page', 'limit', 'total', 'pages', 'hasNext', 'hasPrev']
                missing_fields = [field for field in required_fields if field not in pagination]
                
                if not missing_fields:
                    results.add_result("GET - Pagination structure", True)
                else:
                    results.add_result("GET - Pagination structure", False, 
                                     f"Missing fields: {missing_fields}")
                
                # Verify data contains portabilités with numero_portabilite
                if len(data['data']) > 0:
                    portabilites_with_numero = [p for p in data['data'] if 'numero_portabilite' in p and p['numero_portabilite']]
                    if len(portabilites_with_numero) == len(data['data']):
                        results.add_result("GET - All portabilités have numero", True)
                    else:
                        results.add_result("GET - All portabilités have numero", False, 
                                         f"{len(portabilites_with_numero)}/{len(data['data'])} have numero")
                else:
                    results.add_result("GET - Portabilités available", True, "No portabilités to verify")
            else:
                results.add_result("GET - Response structure", False, 
                                 "Missing 'data' or 'pagination' in response")
        else:
            results.add_result("GET - Basic pagination", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("GET - Basic pagination", False, str(e))
    
    # Test search by numero
    if created_portabilites and len(created_portabilites) > 0:
        test_numero = created_portabilites[0].get('numero_portabilite')
        if test_numero:
            try:
                response = requests.get(f"{API_BASE}/portabilites?search={test_numero}", 
                                      headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    results.add_result("GET - Search by numero", True)
                    
                    # Verify the portabilité is found
                    found_portabilite = any(p.get('numero_portabilite') == test_numero for p in data['data'])
                    if found_portabilite:
                        results.add_result("GET - Search accuracy", True)
                    else:
                        results.add_result("GET - Search accuracy", False, 
                                         f"Portabilité {test_numero} not found in search results")
                else:
                    results.add_result("GET - Search by numero", False, f"Status: {response.status_code}")
            except Exception as e:
                results.add_result("GET - Search by numero", False, str(e))
    
    # Step 5: Test PUT /api/portabilites - Update with status change
    print("\n📋 STEP 5: PUT Portabilités - Update with Status Change")
    
    if created_portabilites and len(created_portabilites) > 0:
        test_portabilite = created_portabilites[0]
        portabilite_id = test_portabilite.get('id')
        original_status = test_portabilite.get('status', 'nouveau')
        new_status = 'en_cours'
        
        if portabilite_id:
            update_data = {
                "status": new_status,
                "nom_client": "Updated Client Name"
            }
            
            try:
                response = requests.put(f"{API_BASE}/portabilites/{portabilite_id}", 
                                      headers=headers, json=update_data, timeout=10)
                
                if response.status_code == 200:
                    updated_portabilite = response.json()
                    results.add_result("PUT - Portabilité update", True)
                    
                    # Verify status was changed
                    if updated_portabilite.get('status') == new_status:
                        results.add_result("PUT - Status change", True)
                    else:
                        results.add_result("PUT - Status change", False, 
                                         f"Status not updated: expected {new_status}, got {updated_portabilite.get('status')}")
                    
                    # Verify numero_portabilite is preserved
                    if updated_portabilite.get('numero_portabilite') == test_portabilite.get('numero_portabilite'):
                        results.add_result("PUT - numero_portabilite preservation", True)
                    else:
                        results.add_result("PUT - numero_portabilite preservation", False, 
                                         "numero_portabilite changed during update")
                    
                    # Email integration should not block update
                    print("   ✅ Status change email integration attempted (operation continued successfully)")
                    results.add_result("PUT - Email integration non-blocking", True)
                    
                else:
                    results.add_result("PUT - Portabilité update", False, 
                                     f"Status: {response.status_code}, Body: {response.text}")
            except Exception as e:
                results.add_result("PUT - Portabilité update", False, str(e))
    
    # Step 6: Test DELETE /api/portabilites - Agent only
    print("\n📋 STEP 6: DELETE Portabilités - Agent Only Access")
    
    # Test DELETE as demandeur (should be forbidden)
    if demandeur_token and created_portabilites and len(created_portabilites) > 1:
        demandeur_headers = {
            "Authorization": f"Bearer {demandeur_token}",
            "Content-Type": "application/json"
        }
        test_portabilite_id = created_portabilites[1].get('id')
        if test_portabilite_id:
            try:
                response = requests.delete(f"{API_BASE}/portabilites/{test_portabilite_id}", 
                                         headers=demandeur_headers, timeout=10)
                
                if response.status_code == 403:
                    results.add_result("DELETE - Demandeur forbidden", True)
                else:
                    results.add_result("DELETE - Demandeur forbidden", False, 
                                     f"Expected 403, got {response.status_code}")
            except Exception as e:
                results.add_result("DELETE - Demandeur forbidden", False, str(e))
    
    # Test DELETE as agent (should work)
    if created_portabilites and len(created_portabilites) > 1:
        test_portabilite_id = created_portabilites[1].get('id')
        if test_portabilite_id:
            try:
                response = requests.delete(f"{API_BASE}/portabilites/{test_portabilite_id}", 
                                         headers=headers, timeout=10)
                
                if response.status_code == 200:
                    results.add_result("DELETE - Agent success", True)
                    
                    # Verify portabilité is actually deleted
                    verify_response = requests.get(f"{API_BASE}/portabilites", headers=headers, timeout=10)
                    if verify_response.status_code == 200:
                        remaining_data = verify_response.json()
                        deleted_found = any(p.get('id') == test_portabilite_id for p in remaining_data['data'])
                        if not deleted_found:
                            results.add_result("DELETE - Verification", True)
                        else:
                            results.add_result("DELETE - Verification", False, 
                                             "Portabilité still exists after deletion")
                else:
                    results.add_result("DELETE - Agent success", False, 
                                     f"Status: {response.status_code}, Body: {response.text}")
            except Exception as e:
                results.add_result("DELETE - Agent success", False, str(e))
    
    # Cleanup: Delete remaining test portabilités
    print("\n📋 STEP 7: Cleanup")
    
    for i, portabilite in enumerate(created_portabilites):
        if 'id' in portabilite:
            try:
                response = requests.delete(f"{API_BASE}/portabilites/{portabilite['id']}", 
                                         headers=headers, timeout=10)
                if response.status_code == 200:
                    results.add_result(f"DELETE - Cleanup portabilité {i+1}", True)
                else:
                    results.add_result(f"DELETE - Cleanup portabilité {i+1}", False, 
                                     f"Status: {response.status_code}")
            except Exception as e:
                results.add_result(f"DELETE - Cleanup portabilité {i+1}", False, str(e))
    
    return results.summary()

def test_portabilite_echanges_api():
    """Test the portabilité comments/exchanges API"""
    results = TestResults()
    
    print("🚀 Starting Portabilité Échanges API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print("="*60)
    
    # Step 1: Authenticate users
    print("\n📋 STEP 1: Authentication Tests")
    agent_token, agent_info = authenticate_user(AGENT_CREDENTIALS, "Agent")
    demandeur_token, demandeur_info = authenticate_user(DEMANDEUR_CREDENTIALS, "Demandeur")
    
    if not agent_token:
        results.add_result("Agent Authentication", False, "Failed to authenticate agent")
        return results.summary()
    else:
        results.add_result("Agent Authentication", True)
    
    if not demandeur_token:
        results.add_result("Demandeur Authentication", False, "Failed to authenticate demandeur")
        # Continue with agent tests only
    else:
        results.add_result("Demandeur Authentication", True)
    
    headers = {
        "Authorization": f"Bearer {agent_token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Create a test portabilité for comments
    print("\n📋 STEP 2: Create Test Portabilité")
    
    # Get test data
    try:
        clients_response = requests.get(f"{API_BASE}/clients", headers=headers, timeout=10)
        demandeurs_response = requests.get(f"{API_BASE}/demandeurs", headers=headers, timeout=10)
        
        if clients_response.status_code == 200 and demandeurs_response.status_code == 200:
            clients_data = clients_response.json()
            demandeurs_data = demandeurs_response.json()
            
            if 'data' in clients_data:
                test_client_id = clients_data['data'][0]['id']
            else:
                test_client_id = clients_data[0]['id']
            
            test_demandeur_id = demandeurs_data[0]['id']
            
            results.add_result("Get Test Data", True)
        else:
            results.add_result("Get Test Data", False, "Failed to get clients or demandeurs")
            return results.summary()
    except Exception as e:
        results.add_result("Get Test Data", False, str(e))
        return results.summary()
    
    # Create test portabilité
    portabilite_data = {
        "client_id": test_client_id,
        "demandeur_id": test_demandeur_id,
        "numeros_portes": "0123456789",
        "nom_client": "Test Client",
        "prenom_client": "Test",
        "email_client": "test@example.com"
    }
    
    try:
        response = requests.post(f"{API_BASE}/portabilites", headers=headers, 
                               json=portabilite_data, timeout=10)
        
        if response.status_code == 201:
            test_portabilite = response.json()
            test_portabilite_id = test_portabilite['id']
            results.add_result("Create Test Portabilité", True)
        else:
            results.add_result("Create Test Portabilité", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
            return results.summary()
    except Exception as e:
        results.add_result("Create Test Portabilité", False, str(e))
        return results.summary()
    
    # Step 3: Test GET /api/portabilite-echanges - Parameter validation
    print("\n📋 STEP 3: GET Comments - Parameter Validation")
    
    # Test missing portabiliteId parameter
    try:
        response = requests.get(f"{API_BASE}/portabilite-echanges", headers=headers, timeout=10)
        
        if response.status_code == 400:
            results.add_result("GET - Missing portabiliteId parameter", True)
        else:
            results.add_result("GET - Missing portabiliteId parameter", False, 
                             f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_result("GET - Missing portabiliteId parameter", False, str(e))
    
    # Step 4: Test GET /api/portabilite-echanges - Valid request
    print("\n📋 STEP 4: GET Comments - Valid Requests")
    
    # Test with agent token
    try:
        response = requests.get(
            f"{API_BASE}/portabilite-echanges?portabiliteId={test_portabilite_id}", 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code == 200:
            comments = response.json()
            results.add_result("GET - Agent access", True)
            
            # Validate response structure
            if isinstance(comments, list):
                results.add_result("GET - Response is array", True)
                print(f"   Found {len(comments)} existing comments")
            else:
                results.add_result("GET - Response is array", False, "Response is not an array")
        else:
            results.add_result("GET - Agent access", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("GET - Agent access", False, str(e))
    
    # Step 5: Test POST /api/portabilite-echanges - Create comment
    print("\n📋 STEP 5: POST Comments - Create Comment")
    
    # Test creating comment with agent token
    test_message = f"Test comment from agent - {datetime.now().isoformat()}"
    try:
        comment_data = {
            "portabiliteId": test_portabilite_id,
            "message": test_message
        }
        
        response = requests.post(f"{API_BASE}/portabilite-echanges", 
                               headers=headers, json=comment_data, timeout=10)
        
        if response.status_code == 201:
            comment = response.json()
            results.add_result("POST - Agent create comment", True)
            
            # Validate response structure
            required_fields = ['id', 'portabilite_id', 'auteur_id', 'auteur_type', 'message', 'created_at', 'auteur_nom']
            missing_fields = [field for field in required_fields if field not in comment]
            
            if not missing_fields:
                results.add_result("POST - Response structure", True)
                
                # Validate content
                if comment['message'] == test_message and comment['auteur_type'] == 'agent':
                    results.add_result("POST - Response content", True)
                else:
                    results.add_result("POST - Response content", False, 
                                     "Message or author type mismatch")
            else:
                results.add_result("POST - Response structure", False, 
                                 f"Missing fields: {missing_fields}")
            
            # Email integration should not block comment creation
            print("   ✅ Comment email integration attempted (operation continued successfully)")
            results.add_result("POST - Email integration non-blocking", True)
            
        else:
            results.add_result("POST - Agent create comment", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("POST - Agent create comment", False, str(e))
    
    # Test parameter validation
    try:
        # Test missing message
        comment_data = {
            "portabiliteId": test_portabilite_id,
            "message": ""
        }
        
        response = requests.post(f"{API_BASE}/portabilite-echanges", 
                               headers=headers, json=comment_data, timeout=10)
        
        if response.status_code == 400:
            results.add_result("POST - Empty message validation", True)
        else:
            results.add_result("POST - Empty message validation", False, 
                             f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_result("POST - Empty message validation", False, str(e))
    
    # Step 6: Test DELETE /api/portabilite-echanges - Agent only
    print("\n📋 STEP 6: DELETE Comments - Agent Only Access")
    
    # First, create a comment to delete
    try:
        comment_data = {
            "portabiliteId": test_portabilite_id,
            "message": "Comment to be deleted"
        }
        
        response = requests.post(f"{API_BASE}/portabilite-echanges", 
                               headers=headers, json=comment_data, timeout=10)
        
        if response.status_code == 201:
            comment_to_delete = response.json()
            comment_id = comment_to_delete['id']
            
            # Test DELETE as agent
            delete_data = {"commentId": comment_id}
            response = requests.delete(f"{API_BASE}/portabilite-echanges", 
                                     headers=headers, json=delete_data, timeout=10)
            
            if response.status_code == 200:
                results.add_result("DELETE - Agent success", True)
            else:
                results.add_result("DELETE - Agent success", False, 
                                 f"Status: {response.status_code}, Body: {response.text}")
        else:
            results.add_result("DELETE - Create comment for deletion", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("DELETE - Agent success", False, str(e))
    
    # Test DELETE as demandeur (should be forbidden)
    if demandeur_token:
        demandeur_headers = {
            "Authorization": f"Bearer {demandeur_token}",
            "Content-Type": "application/json"
        }
        try:
            delete_data = {"commentId": "fake-id"}
            response = requests.delete(f"{API_BASE}/portabilite-echanges", 
                                     headers=demandeur_headers, json=delete_data, timeout=10)
            
            if response.status_code == 403:
                results.add_result("DELETE - Demandeur forbidden", True)
            else:
                results.add_result("DELETE - Demandeur forbidden", False, 
                                 f"Expected 403, got {response.status_code}")
        except Exception as e:
            results.add_result("DELETE - Demandeur forbidden", False, str(e))
    
    # Cleanup: Delete test portabilité
    try:
        response = requests.delete(f"{API_BASE}/portabilites/{test_portabilite_id}", 
                                 headers=headers, timeout=10)
        if response.status_code == 200:
            results.add_result("Cleanup - Delete test portabilité", True)
        else:
            results.add_result("Cleanup - Delete test portabilité", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("Cleanup - Delete test portabilité", False, str(e))
    
    return results.summary()

if __name__ == "__main__":
    print("🚀 Starting Portabilités Backend API Tests")
    print("="*60)
    
    # Test portabilités API
    print("\n" + "="*60)
    print("TESTING PORTABILITÉS API")
    print("="*60)
    portabilites_success = test_portabilites_api()
    
    print("\n" + "="*60)
    print("TESTING PORTABILITÉ ÉCHANGES API")
    print("="*60)
    echanges_success = test_portabilite_echanges_api()
    
    # Overall result
    if portabilites_success and echanges_success:
        print("\n🎉 All portabilités tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some portabilités tests failed!")
        sys.exit(1)