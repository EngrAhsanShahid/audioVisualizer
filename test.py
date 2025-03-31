api_key = "sk_3577dd2abdf5df9a988fd850ed89247d23edc95aa54c8dbb"


import requests

# Replace with your actual ElevenLabs API key
# api_key = "<your_api_key>"

# Replace with the path to your .mp3 file
mp3_file_path = "myvoice.mp3"

# Endpoint for adding a voice
url = "https://api.elevenlabs.io/v1/voices/add"

# Data to send with the request
data = {
    "name": "My Cloned Voice 2"  # Set a name for your cloned voice
}

# Open the MP3 file
files = {
    "files[]": open(mp3_file_path, "rb")
}

# Headers for the request
headers = {
    "xi-api-key": api_key
}

# Send the POST request
response = requests.post(url, headers=headers, data=data, files=files)

# Print the response
if response.status_code == 200:
    print("Voice cloned successfully!")
    print(response.json())  # Print the response JSON for additional details
else:
    print(f"Error: {response.status_code}")
    print(response.text)
