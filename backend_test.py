#!/usr/bin/env python3
"""
Backend API Testing for Support Ticket Management System
Testing clients API with new structure and ticket-echanges functionality
"""

import requests
import json
import uuid
import sys
from datetime import datetime

# Configuration - Use production URL from frontend/.env
BACKEND_URL = "https://27432197-1a2e-4d0e-9186-abc2be5bb2cc.preview.emergentagent.com"
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

def get_test_ticket_id(token):
    """Get a test ticket ID from the database"""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(f"{API_BASE}/tickets", headers=headers, timeout=10)
        
        if response.status_code == 200:
            tickets = response.json()
            if tickets and len(tickets) > 0:
                ticket_id = tickets[0]['id']
                print(f"✅ Found test ticket: {ticket_id}")
                return ticket_id
            else:
                print("⚠️  No tickets found in database")
                return None
        else:
            print(f"❌ Failed to get tickets: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting test ticket: {str(e)}")
        return None

def test_ticket_echanges_api():
    """Main test function for ticket-echanges API"""
    results = TestResults()
    
    print("🚀 Starting Ticket Comments API Tests")
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
    
    # Step 2: Get test ticket
    print("\n📋 STEP 2: Get Test Ticket")
    test_ticket_id = get_test_ticket_id(agent_token)
    
    if not test_ticket_id:
        results.add_result("Get Test Ticket", False, "No test ticket available")
        return results.summary()
    else:
        results.add_result("Get Test Ticket", True)
    
    # Step 3: Test GET endpoint - Parameter validation
    print("\n📋 STEP 3: GET Endpoint Parameter Validation")
    
    # Test missing ticketId parameter
    try:
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(f"{API_BASE}/ticket-echanges", headers=headers, timeout=10)
        
        if response.status_code == 400:
            results.add_result("GET - Missing ticketId parameter", True)
        else:
            results.add_result("GET - Missing ticketId parameter", False, 
                             f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_result("GET - Missing ticketId parameter", False, str(e))
    
    # Step 4: Test GET endpoint - Valid request
    print("\n📋 STEP 4: GET Endpoint - Valid Requests")
    
    # Test with agent token
    try:
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(
            f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code == 200:
            comments = response.json()
            results.add_result("GET - Agent access", True)
            print(f"   Found {len(comments)} existing comments")
            
            # Validate response structure
            if isinstance(comments, list):
                results.add_result("GET - Response is array", True)
                
                if len(comments) > 0:
                    comment = comments[0]
                    required_fields = ['id', 'ticket_id', 'auteur_id', 'auteur_type', 'message', 'created_at', 'auteur_nom']
                    missing_fields = [field for field in required_fields if field not in comment]
                    
                    if not missing_fields:
                        results.add_result("GET - Response structure", True)
                    else:
                        results.add_result("GET - Response structure", False, 
                                         f"Missing fields: {missing_fields}")
                else:
                    results.add_result("GET - Response structure", True, "No comments to validate structure")
            else:
                results.add_result("GET - Response is array", False, "Response is not an array")
        else:
            results.add_result("GET - Agent access", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("GET - Agent access", False, str(e))
    
    # Test with demandeur token (if available)
    if demandeur_token:
        try:
            headers = {"Authorization": f"Bearer {demandeur_token}"}
            response = requests.get(
                f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
                headers=headers, 
                timeout=10
            )
            
            if response.status_code in [200, 403]:  # 403 is acceptable if no access
                results.add_result("GET - Demandeur access", True)
            else:
                results.add_result("GET - Demandeur access", False, 
                                 f"Status: {response.status_code}")
        except Exception as e:
            results.add_result("GET - Demandeur access", False, str(e))
    
    # Step 5: Test authentication validation
    print("\n📋 STEP 5: Authentication Validation")
    
    # Test without token
    try:
        response = requests.get(
            f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
            timeout=10
        )
        
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
        response = requests.get(
            f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code == 401:
            results.add_result("GET - Invalid token", True)
        else:
            results.add_result("GET - Invalid token", False, 
                             f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.add_result("GET - Invalid token", False, str(e))
    
    # Step 6: Test POST endpoint - Parameter validation
    print("\n📋 STEP 6: POST Endpoint Parameter Validation")
    
    # Test missing ticketId parameter
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/ticket-echanges", 
            headers=headers,
            json={"message": "Test comment"},
            timeout=10
        )
        
        if response.status_code == 400:
            results.add_result("POST - Missing ticketId parameter", True)
        else:
            results.add_result("POST - Missing ticketId parameter", False, 
                             f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_result("POST - Missing ticketId parameter", False, str(e))
    
    # Test empty message
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
            headers=headers,
            json={"message": ""},
            timeout=10
        )
        
        if response.status_code == 400:
            results.add_result("POST - Empty message", True)
        else:
            results.add_result("POST - Empty message", False, 
                             f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_result("POST - Empty message", False, str(e))
    
    # Step 7: Test POST endpoint - Valid requests
    print("\n📋 STEP 7: POST Endpoint - Valid Requests")
    
    # Test creating comment with agent token
    test_message = f"Test comment from agent - {datetime.now().isoformat()}"
    try:
        headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
            headers=headers,
            json={"message": test_message},
            timeout=10
        )
        
        if response.status_code == 201:
            comment = response.json()
            results.add_result("POST - Agent create comment", True)
            
            # Validate response structure
            required_fields = ['id', 'ticket_id', 'auteur_id', 'auteur_type', 'message', 'created_at', 'auteur_nom']
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
        else:
            results.add_result("POST - Agent create comment", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("POST - Agent create comment", False, str(e))
    
    # Test creating comment with demandeur token (if available)
    if demandeur_token:
        test_message_demandeur = f"Test comment from demandeur - {datetime.now().isoformat()}"
        try:
            headers = {
                "Authorization": f"Bearer {demandeur_token}",
                "Content-Type": "application/json"
            }
            response = requests.post(
                f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
                headers=headers,
                json={"message": test_message_demandeur},
                timeout=10
            )
            
            if response.status_code in [201, 403]:  # 403 acceptable if no access
                results.add_result("POST - Demandeur create comment", True)
            else:
                results.add_result("POST - Demandeur create comment", False, 
                                 f"Status: {response.status_code}")
        except Exception as e:
            results.add_result("POST - Demandeur create comment", False, str(e))
    
    # Step 8: Test invalid ticket ID
    print("\n📋 STEP 8: Invalid Ticket ID Tests")
    
    fake_ticket_id = str(uuid.uuid4())
    try:
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(
            f"{API_BASE}/ticket-echanges?ticketId={fake_ticket_id}", 
            headers=headers, 
            timeout=10
        )
        
        # Should return empty array for non-existent ticket
        if response.status_code == 200:
            comments = response.json()
            if isinstance(comments, list) and len(comments) == 0:
                results.add_result("GET - Invalid ticket ID", True)
            else:
                results.add_result("GET - Invalid ticket ID", False, 
                                 "Should return empty array for non-existent ticket")
        else:
            results.add_result("GET - Invalid ticket ID", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Invalid ticket ID", False, str(e))
    
    # Step 9: Test database connectivity and JOIN queries
    print("\n📋 STEP 9: Database Connectivity and JOIN Queries")
    
    # Get comments again to verify JOIN queries work
    try:
        headers = {"Authorization": f"Bearer {agent_token}"}
        response = requests.get(
            f"{API_BASE}/ticket-echanges?ticketId={test_ticket_id}", 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code == 200:
            comments = response.json()
            results.add_result("Database - Connectivity", True)
            
            # Check if JOIN queries work (auteur_nom should be populated)
            if len(comments) > 0:
                has_author_names = all(comment.get('auteur_nom') for comment in comments)
                if has_author_names:
                    results.add_result("Database - JOIN queries", True)
                else:
                    results.add_result("Database - JOIN queries", False, 
                                     "Some comments missing author names")
            else:
                results.add_result("Database - JOIN queries", True, "No comments to verify JOIN")
        else:
            results.add_result("Database - Connectivity", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("Database - Connectivity", False, str(e))
    
    return results.summary()

def test_clients_pagination_search_api():
    """Test the new pagination and search functionality for clients API"""
    results = TestResults()
    
    print("🚀 Starting Clients API Pagination & Search Tests")
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
    
    headers = {
        "Authorization": f"Bearer {agent_token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Test basic GET without parameters (default pagination)
    print("\n📋 STEP 2: Default Pagination (page=1, limit=10)")
    try:
        response = requests.get(f"{API_BASE}/clients", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - Default pagination", True)
            
            # Validate response structure
            if 'data' in data and 'pagination' in data:
                results.add_result("GET - Response structure", True)
                
                pagination = data['pagination']
                required_fields = ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev']
                missing_fields = [field for field in required_fields if field not in pagination]
                
                if not missing_fields:
                    results.add_result("GET - Pagination structure", True)
                    
                    # Validate default values
                    if pagination['page'] == 1 and pagination['limit'] == 10:
                        results.add_result("GET - Default values", True)
                    else:
                        results.add_result("GET - Default values", False, 
                                         f"Expected page=1, limit=10, got page={pagination['page']}, limit={pagination['limit']}")
                else:
                    results.add_result("GET - Pagination structure", False, 
                                     f"Missing fields: {missing_fields}")
            else:
                results.add_result("GET - Response structure", False, 
                                 "Missing 'data' or 'pagination' in response")
        else:
            results.add_result("GET - Default pagination", False, 
                             f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        results.add_result("GET - Default pagination", False, str(e))
    
    # Step 3: Test pagination with specific parameters
    print("\n📋 STEP 3: Custom Pagination (page=2, limit=5)")
    try:
        response = requests.get(f"{API_BASE}/clients?page=2&limit=5", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - Custom pagination", True)
            
            pagination = data['pagination']
            if pagination['page'] == 2 and pagination['limit'] == 5:
                results.add_result("GET - Custom pagination values", True)
            else:
                results.add_result("GET - Custom pagination values", False, 
                                 f"Expected page=2, limit=5, got page={pagination['page']}, limit={pagination['limit']}")
            
            # Validate data length doesn't exceed limit
            if len(data['data']) <= 5:
                results.add_result("GET - Pagination limit respected", True)
            else:
                results.add_result("GET - Pagination limit respected", False, 
                                 f"Expected max 5 items, got {len(data['data'])}")
        else:
            results.add_result("GET - Custom pagination", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Custom pagination", False, str(e))
    
    # Step 4: Test search functionality
    print("\n📋 STEP 4: Search Functionality")
    
    # First, create a test client to ensure we have data to search
    test_client_data = {
        "nom_societe": "TestSociete Corp",
        "adresse": "123 Test Street",
        "nom": "TestNom",
        "prenom": "TestPrenom", 
        "numero": "TEST123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/clients", headers=headers, 
                               json=test_client_data, timeout=10)
        if response.status_code == 201:
            results.add_result("POST - Create test client", True)
            test_client = response.json()
            test_client_id = test_client['id']
        else:
            results.add_result("POST - Create test client", False, 
                             f"Status: {response.status_code}")
            test_client_id = None
    except Exception as e:
        results.add_result("POST - Create test client", False, str(e))
        test_client_id = None
    
    # Test search by company name
    try:
        response = requests.get(f"{API_BASE}/clients?search=TestSociete", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - Search by company name", True)
            
            # Check if our test client is in results
            found_test_client = any(client['nom_societe'] == 'TestSociete Corp' for client in data['data'])
            if found_test_client:
                results.add_result("GET - Search results accuracy", True)
            else:
                results.add_result("GET - Search results accuracy", False, 
                                 "Test client not found in search results")
        else:
            results.add_result("GET - Search by company name", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Search by company name", False, str(e))
    
    # Test case-insensitive search
    try:
        response = requests.get(f"{API_BASE}/clients?search=testsociete", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - Case-insensitive search", True)
            
            # Check if our test client is still found with lowercase search
            found_test_client = any(client['nom_societe'] == 'TestSociete Corp' for client in data['data'])
            if found_test_client:
                results.add_result("GET - Case-insensitive results", True)
            else:
                results.add_result("GET - Case-insensitive results", False, 
                                 "Case-insensitive search not working")
        else:
            results.add_result("GET - Case-insensitive search", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Case-insensitive search", False, str(e))
    
    # Step 5: Test combined pagination and search
    print("\n📋 STEP 5: Combined Pagination and Search")
    try:
        response = requests.get(f"{API_BASE}/clients?page=1&limit=3&search=Test", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - Pagination + Search", True)
            
            pagination = data['pagination']
            if pagination['page'] == 1 and pagination['limit'] == 3:
                results.add_result("GET - Combined parameters", True)
            else:
                results.add_result("GET - Combined parameters", False, 
                                 f"Expected page=1, limit=3, got page={pagination['page']}, limit={pagination['limit']}")
            
            # Validate data length doesn't exceed limit
            if len(data['data']) <= 3:
                results.add_result("GET - Combined limit respected", True)
            else:
                results.add_result("GET - Combined limit respected", False, 
                                 f"Expected max 3 items, got {len(data['data'])}")
        else:
            results.add_result("GET - Pagination + Search", False, 
                             f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Pagination + Search", False, str(e))
    
    # Step 6: Test search across different fields
    print("\n📋 STEP 6: Multi-field Search")
    
    # Search by nom
    try:
        response = requests.get(f"{API_BASE}/clients?search=TestNom", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            found_test_client = any(client.get('nom') == 'TestNom' for client in data['data'])
            if found_test_client:
                results.add_result("GET - Search by nom", True)
            else:
                results.add_result("GET - Search by nom", False, "Test client not found by nom")
        else:
            results.add_result("GET - Search by nom", False, f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Search by nom", False, str(e))
    
    # Search by prenom
    try:
        response = requests.get(f"{API_BASE}/clients?search=TestPrenom", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            found_test_client = any(client.get('prenom') == 'TestPrenom' for client in data['data'])
            if found_test_client:
                results.add_result("GET - Search by prenom", True)
            else:
                results.add_result("GET - Search by prenom", False, "Test client not found by prenom")
        else:
            results.add_result("GET - Search by prenom", False, f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Search by prenom", False, str(e))
    
    # Search by numero
    try:
        response = requests.get(f"{API_BASE}/clients?search=TEST123", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            found_test_client = any(client.get('numero') == 'TEST123' for client in data['data'])
            if found_test_client:
                results.add_result("GET - Search by numero", True)
            else:
                results.add_result("GET - Search by numero", False, "Test client not found by numero")
        else:
            results.add_result("GET - Search by numero", False, f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Search by numero", False, str(e))
    
    # Step 7: Test edge cases
    print("\n📋 STEP 7: Edge Cases")
    
    # Test with non-existent page
    try:
        response = requests.get(f"{API_BASE}/clients?page=999&limit=10", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - Non-existent page", True)
            
            # Should return empty data array
            if len(data['data']) == 0:
                results.add_result("GET - Empty page handling", True)
            else:
                results.add_result("GET - Empty page handling", False, 
                                 f"Expected empty array, got {len(data['data'])} items")
        else:
            results.add_result("GET - Non-existent page", False, f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Non-existent page", False, str(e))
    
    # Test with search that returns no results
    try:
        response = requests.get(f"{API_BASE}/clients?search=NonExistentSearchTerm12345", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET - No results search", True)
            
            if len(data['data']) == 0 and data['pagination']['total'] == 0:
                results.add_result("GET - No results handling", True)
            else:
                results.add_result("GET - No results handling", False, 
                                 f"Expected empty results, got {len(data['data'])} items, total: {data['pagination']['total']}")
        else:
            results.add_result("GET - No results search", False, f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - No results search", False, str(e))
    
    # Test with special characters in search
    try:
        response = requests.get(f"{API_BASE}/clients?search=@#$%", headers=headers, timeout=10)
        if response.status_code == 200:
            results.add_result("GET - Special characters search", True)
        else:
            results.add_result("GET - Special characters search", False, f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Special characters search", False, str(e))
    
    # Step 8: Test pagination consistency
    print("\n📋 STEP 8: Pagination Consistency")
    
    # Get total count first
    try:
        response = requests.get(f"{API_BASE}/clients?page=1&limit=1", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            total_items = data['pagination']['total']
            total_pages = data['pagination']['totalPages']
            
            # Verify totalPages calculation
            expected_pages = (total_items + 1 - 1) // 1  # Math.ceil equivalent
            if total_pages == expected_pages:
                results.add_result("GET - TotalPages calculation", True)
            else:
                results.add_result("GET - TotalPages calculation", False, 
                                 f"Expected {expected_pages} pages, got {total_pages}")
            
            # Test hasNext and hasPrev flags
            if data['pagination']['hasPrev'] == False and (data['pagination']['hasNext'] == (total_pages > 1)):
                results.add_result("GET - Navigation flags", True)
            else:
                results.add_result("GET - Navigation flags", False, 
                                 f"Incorrect hasNext/hasPrev values")
        else:
            results.add_result("GET - Pagination consistency", False, f"Status: {response.status_code}")
    except Exception as e:
        results.add_result("GET - Pagination consistency", False, str(e))
    
    # Cleanup: Delete test client
    if test_client_id:
        try:
            response = requests.delete(f"{API_BASE}/clients/{test_client_id}", headers=headers, timeout=10)
            if response.status_code == 200:
                results.add_result("DELETE - Cleanup test client", True)
            else:
                results.add_result("DELETE - Cleanup test client", False, f"Status: {response.status_code}")
        except Exception as e:
            results.add_result("DELETE - Cleanup test client", False, str(e))
    
    return results.summary()

if __name__ == "__main__":
    print("🧪 Backend API Testing - Support Ticket Management System")
    print("=" * 60)
    
    # Test clients pagination and search functionality
    print("\n" + "="*60)
    print("TESTING: Clients API Pagination & Search")
    print("="*60)
    clients_success = test_clients_pagination_search_api()
    
    if clients_success:
        print("\n🎉 All clients API tests passed!")
    else:
        print("\n💥 Some clients API tests failed!")
    
    # Overall result
    if clients_success:
        print("\n🎉 All backend tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some backend tests failed!")
        sys.exit(1)