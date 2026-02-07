
import google.generativeai as genai
import os

# Configure the API key
API_KEY = "AIzaSyCH0wcNsowUkSM_QmSRb1yVFHkGu2_q0yA"
genai.configure(api_key=API_KEY)

print("Listing available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
            
    # Test generation with Flash
    print("\nTesting gemini-2.0-flash...")
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("Explain what a P&ID is in one sentence.")
    print(f"Response: {response.text}")
    
except Exception as e:
    print(f"Error: {e}")
