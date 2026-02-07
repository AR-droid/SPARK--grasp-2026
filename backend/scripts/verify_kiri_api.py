import requests
import sys

# The token we found/used in the service
TOKEN = "kiri_I3MAVDXYa7gXuy8S7S2-NSEPBjOCbFTAAd2mt-1y-0Y" # Likely invalid/mock
BASE_URL = "https://api.kiriengine.app/api"

def test_connection():
    print(f"Testing KIRI Engine API Connection...")
    print(f"URL: {BASE_URL}")
    print(f"Token: {TOKEN[:8]}********")
    
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    
    # Try to fetch balance
    try:
        response = requests.get(f"{BASE_URL}/balance", headers=headers)
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ API Connection Verified! Token is valid.")
            return True
        elif response.status_code == 401:
            print("\n❌ Unauthorized. The API Token is invalid or expired.")
            return False
        else:
            print(f"\n⚠️ Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n❌ Connection Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
