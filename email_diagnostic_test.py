#!/usr/bin/env python3
"""
Email Diagnostic Testing for Support Ticket Management System
Testing Mailjet email integration diagnostic functions
"""

import requests
import json
import sys
from datetime import datetime

# Configuration - Use production URL from frontend/.env
BACKEND_URL = "https://04456061-60b2-4daf-9fde-66131ec004e5.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
AGENT_CREDENTIALS = {
    "email": "admin@voipservices.fr",
    "password": "admin1234!"
}

class EmailDiagnosticTests:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
        self.agent_token = None
        
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
        print(f"\n{'='*80}")
        print(f"EMAIL DIAGNOSTIC TEST SUMMARY")
        print(f"{'='*80}")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        
        if self.failures:
            print(f"\nFAILURES:")
            for failure in self.failures:
                print(f"  - {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\nSuccess rate: {success_rate:.1f}%")
        return self.tests_failed == 0

    def authenticate_agent(self):
        """Authenticate as agent to get token for protected endpoints"""
        try:
            response = requests.post(f"{API_BASE}/auth", json=AGENT_CREDENTIALS)
            if response.status_code == 200:
                data = response.json()
                self.agent_token = data.get('access_token')
                self.add_result("Agent authentication", True)
                return True
            else:
                self.add_result("Agent authentication", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.add_result("Agent authentication", False, str(e))
            return False

    def test_email_diagnostic_endpoint(self):
        """Test GET /api/email-diagnostic endpoint"""
        print(f"\n🔍 Testing Email Diagnostic Endpoint...")
        
        try:
            response = requests.get(f"{API_BASE}/email-diagnostic")
            
            if response.status_code != 200:
                self.add_result("Email diagnostic endpoint accessibility", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            self.add_result("Email diagnostic endpoint accessibility", True)
            
            # Parse response
            try:
                data = response.json()
                self.add_result("Email diagnostic response parsing", True)
            except json.JSONDecodeError as e:
                self.add_result("Email diagnostic response parsing", False, str(e))
                return False
            
            # Check response structure
            required_fields = ['message', 'timestamp', 'diagnostics']
            for field in required_fields:
                if field in data:
                    self.add_result(f"Email diagnostic response has '{field}' field", True)
                else:
                    self.add_result(f"Email diagnostic response has '{field}' field", False, 
                                  f"Missing field: {field}")
            
            # Check diagnostics structure
            diagnostics = data.get('diagnostics', {})
            diagnostic_sections = ['environment', 'mailjetTest', 'emailServiceTest', 'database']
            
            for section in diagnostic_sections:
                if section in diagnostics:
                    self.add_result(f"Diagnostics has '{section}' section", True)
                    
                    # Print diagnostic details for analysis
                    print(f"  📋 {section}: {json.dumps(diagnostics[section], indent=2)}")
                else:
                    self.add_result(f"Diagnostics has '{section}' section", False, 
                                  f"Missing section: {section}")
            
            # Analyze environment variables
            env = diagnostics.get('environment', {})
            if env:
                mj_public = env.get('MJ_APIKEY_PUBLIC', 'NOT SET')
                mj_private = env.get('MJ_APIKEY_PRIVATE', 'NOT SET')
                
                print(f"  🔑 Mailjet Public Key: {mj_public}")
                print(f"  🔑 Mailjet Private Key: {mj_private}")
                
                if mj_public == 'SET' and mj_private == 'SET':
                    self.add_result("Mailjet API keys configured", True)
                else:
                    self.add_result("Mailjet API keys configured", False, 
                                  f"Public: {mj_public}, Private: {mj_private}")
            
            # Analyze Mailjet test results
            mailjet_test = diagnostics.get('mailjetTest', {})
            if mailjet_test:
                status = mailjet_test.get('status', 'UNKNOWN')
                message = mailjet_test.get('message', 'No message')
                
                print(f"  📧 Mailjet Test Status: {status}")
                print(f"  📧 Mailjet Test Message: {message}")
                
                if status == 'SUCCESS':
                    self.add_result("Mailjet initialization", True)
                    
                    # Check API test if available
                    api_test = mailjet_test.get('apiTest', {})
                    if api_test:
                        api_status = api_test.get('status', 'UNKNOWN')
                        api_message = api_test.get('message', 'No message')
                        
                        print(f"  🌐 Mailjet API Test Status: {api_status}")
                        print(f"  🌐 Mailjet API Test Message: {api_message}")
                        
                        if api_status == 'SUCCESS':
                            self.add_result("Mailjet API connection", True)
                        else:
                            self.add_result("Mailjet API connection", False, api_message)
                elif status == 'WARNING':
                    self.add_result("Mailjet initialization", False, f"Warning: {message}")
                else:
                    self.add_result("Mailjet initialization", False, message)
            
            # Analyze email service test
            email_service_test = diagnostics.get('emailServiceTest', {})
            if email_service_test:
                status = email_service_test.get('status', 'UNKNOWN')
                message = email_service_test.get('message', 'No message')
                methods = email_service_test.get('methods', [])
                
                print(f"  📨 Email Service Status: {status}")
                print(f"  📨 Email Service Message: {message}")
                print(f"  📨 Available Methods: {methods}")
                
                if status == 'SUCCESS':
                    self.add_result("Email service loading", True)
                    
                    # Check for expected methods
                    expected_methods = ['sendTicketCreatedEmail', 'sendCommentEmail', 'sendStatusChangeEmail']
                    for method in expected_methods:
                        if method in methods:
                            self.add_result(f"Email service has '{method}' method", True)
                        else:
                            self.add_result(f"Email service has '{method}' method", False, 
                                          f"Method not found: {method}")
                else:
                    self.add_result("Email service loading", False, message)
            
            # Analyze database test
            database_test = diagnostics.get('database', {})
            if database_test:
                status = database_test.get('status', 'UNKNOWN')
                message = database_test.get('message', 'No message')
                
                print(f"  🗄️ Database Status: {status}")
                print(f"  🗄️ Database Message: {message}")
                
                if status == 'SUCCESS':
                    self.add_result("Database connection", True)
                else:
                    self.add_result("Database connection", False, message)
            
            return True
            
        except Exception as e:
            self.add_result("Email diagnostic endpoint test", False, str(e))
            return False

    def test_email_test_endpoint_authentication(self):
        """Test authentication requirements for email test endpoint"""
        print(f"\n🔐 Testing Email Test Endpoint Authentication...")
        
        # Test without authentication
        try:
            response = requests.post(f"{API_BASE}/email-test", json={"testType": "simple"})
            
            if response.status_code == 401:
                self.add_result("Email test endpoint requires authentication", True)
            else:
                self.add_result("Email test endpoint requires authentication", False, 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.add_result("Email test endpoint authentication test", False, str(e))
        
        # Test with invalid token
        try:
            headers = {"Authorization": "Bearer invalid_token"}
            response = requests.post(f"{API_BASE}/email-test", 
                                   json={"testType": "simple"}, 
                                   headers=headers)
            
            if response.status_code == 401:
                self.add_result("Email test endpoint rejects invalid token", True)
            else:
                self.add_result("Email test endpoint rejects invalid token", False, 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.add_result("Email test endpoint invalid token test", False, str(e))

    def test_email_test_simple(self):
        """Test simple email sending via email test endpoint"""
        print(f"\n📧 Testing Simple Email Test...")
        
        if not self.agent_token:
            self.add_result("Simple email test", False, "No agent token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.agent_token}"}
            payload = {
                "testType": "simple",
                "recipient": "contact@voipservices.fr"
            }
            
            response = requests.post(f"{API_BASE}/email-test", 
                                   json=payload, 
                                   headers=headers)
            
            print(f"  📤 Response Status: {response.status_code}")
            print(f"  📤 Response: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    result = data.get('result', {})
                    status = result.get('status', 'UNKNOWN')
                    message = result.get('message', 'No message')
                    
                    print(f"  📧 Email Test Result: {status}")
                    print(f"  📧 Email Test Message: {message}")
                    
                    if status == 'SUCCESS':
                        self.add_result("Simple email test - sending", True)
                    else:
                        self.add_result("Simple email test - sending", False, 
                                      f"Status: {status}, Message: {message}")
                        
                        # Check for specific error details
                        error = result.get('error', '')
                        if 'Mailjet not configured' in error or 'API keys not found' in error:
                            print(f"  ⚠️ Configuration Issue: {error}")
                            self.add_result("Email configuration diagnosis", True, 
                                          "Identified: Mailjet API keys not configured")
                        elif 'Mailjet API connection failed' in error:
                            print(f"  ⚠️ API Connection Issue: {error}")
                            self.add_result("Email API diagnosis", True, 
                                          "Identified: Mailjet API connection problem")
                        
                except json.JSONDecodeError:
                    self.add_result("Simple email test response parsing", False, 
                                  "Invalid JSON response")
            elif response.status_code == 400:
                # Check if it's a configuration error
                try:
                    data = response.json()
                    error = data.get('error', '')
                    detail = data.get('detail', '')
                    
                    if 'Mailjet not configured' in error:
                        self.add_result("Simple email test - configuration check", True, 
                                      "Correctly identified missing Mailjet configuration")
                        print(f"  ✅ Configuration Issue Detected: {error}")
                        print(f"  📋 Details: {detail}")
                        
                        # Check key status
                        keys = data.get('keys', {})
                        if keys:
                            print(f"  🔑 Key Status: {keys}")
                    else:
                        self.add_result("Simple email test", False, 
                                      f"Status: {response.status_code}, Error: {error}")
                except json.JSONDecodeError:
                    self.add_result("Simple email test", False, 
                                  f"Status: {response.status_code}, Response: {response.text}")
            else:
                self.add_result("Simple email test", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.add_result("Simple email test", False, str(e))

    def test_email_test_ticket(self):
        """Test ticket email sending via email test endpoint"""
        print(f"\n🎫 Testing Ticket Email Test...")
        
        if not self.agent_token:
            self.add_result("Ticket email test", False, "No agent token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.agent_token}"}
            payload = {
                "testType": "ticket"
            }
            
            response = requests.post(f"{API_BASE}/email-test", 
                                   json=payload, 
                                   headers=headers)
            
            print(f"  📤 Response Status: {response.status_code}")
            print(f"  📤 Response: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    result = data.get('result', {})
                    status = result.get('status', 'UNKNOWN')
                    message = result.get('message', 'No message')
                    
                    print(f"  🎫 Ticket Email Test Result: {status}")
                    print(f"  🎫 Ticket Email Test Message: {message}")
                    
                    if status == 'SUCCESS':
                        self.add_result("Ticket email test - sending", True)
                    else:
                        self.add_result("Ticket email test - sending", False, 
                                      f"Status: {status}, Message: {message}")
                        
                except json.JSONDecodeError:
                    self.add_result("Ticket email test response parsing", False, 
                                  "Invalid JSON response")
            elif response.status_code == 400:
                try:
                    data = response.json()
                    error = data.get('error', '')
                    detail = data.get('detail', '')
                    
                    if 'Test data not available' in error:
                        self.add_result("Ticket email test - data check", True, 
                                      "Correctly identified missing test data")
                        print(f"  ⚠️ Test Data Issue: {error}")
                    else:
                        self.add_result("Ticket email test", False, 
                                      f"Status: {response.status_code}, Error: {error}")
                except json.JSONDecodeError:
                    self.add_result("Ticket email test", False, 
                                  f"Status: {response.status_code}, Response: {response.text}")
            else:
                self.add_result("Ticket email test", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.add_result("Ticket email test", False, str(e))

    def test_email_test_invalid_type(self):
        """Test email test endpoint with invalid test type"""
        print(f"\n❌ Testing Invalid Email Test Type...")
        
        if not self.agent_token:
            self.add_result("Invalid email test type", False, "No agent token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.agent_token}"}
            payload = {
                "testType": "invalid_type"
            }
            
            response = requests.post(f"{API_BASE}/email-test", 
                                   json=payload, 
                                   headers=headers)
            
            if response.status_code == 400:
                try:
                    data = response.json()
                    error = data.get('error', '')
                    valid_types = data.get('validTypes', [])
                    
                    if 'Invalid test type' in error:
                        self.add_result("Email test endpoint validates test type", True)
                        print(f"  ✅ Valid Types: {valid_types}")
                    else:
                        self.add_result("Email test endpoint validates test type", False, 
                                      f"Unexpected error: {error}")
                except json.JSONDecodeError:
                    self.add_result("Email test endpoint validates test type", False, 
                                  "Invalid JSON response")
            else:
                self.add_result("Email test endpoint validates test type", False, 
                              f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.add_result("Invalid email test type", False, str(e))

    def run_all_tests(self):
        """Run all email diagnostic tests"""
        print(f"🚀 Starting Email Diagnostic Tests...")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        
        # Authenticate first
        if not self.authenticate_agent():
            print("❌ Cannot proceed without agent authentication")
            return False
        
        # Run diagnostic tests
        self.test_email_diagnostic_endpoint()
        self.test_email_test_endpoint_authentication()
        self.test_email_test_simple()
        self.test_email_test_ticket()
        self.test_email_test_invalid_type()
        
        return self.summary()

def main():
    """Main test execution"""
    tester = EmailDiagnosticTests()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n🎉 All email diagnostic tests passed!")
        sys.exit(0)
    else:
        print(f"\n💥 Some email diagnostic tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()