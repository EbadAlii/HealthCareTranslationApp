from flask import Flask, request, jsonify
import os
from flask_cors import CORS
from openai import Client, OpenAI
from dotenv import load_dotenv

import base64
app = Flask(__name__)
CORS(app)  # Enable CORS to allow communication with React frontend
load_dotenv()
# Define upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Define a simple route to verify the server is running
@app.route('/')
def home():
    return "Welcome to the Healthcare Translation Web App!"

# Define a route for speech-to-text (placeholder for future functionality)
@app.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    print("GOT THE CALL")
    data = request.json
    print("data", data)
    
    # Check if required fields are present
    if 'audio' not in data:
        return jsonify({"error": "No audio file provided"}), 400
    if 'inputLanguage' not in data:
        return jsonify({"error": "No inputLanguage provided"}), 400
    if 'outputLanguage' not in data:
        return jsonify({"error": "No outputLanguage provided"}), 400

    audio_base64 = data['audio']
    inputLanguage = data['inputLanguage']
    outputLanguage = data['outputLanguage']

    # Decode the Base64 audio
    audio_data = base64.b64decode(audio_base64.split(",")[1])  # Strip the data URL prefix if present
    file_path = os.path.join("uploads", 'temp_audio.wav')

    # Save audio data to a file
    with open(file_path, 'wb') as f:
        f.write(audio_data)

    # Use SpeechRecognition to transcribe the audio
    audio_file_open= open(file_path, "rb")
    OPENAI_API_KEY = "your-api-key"
    client = OpenAI(api_key=OPENAI_API_KEY)
    transcript = client.audio.transcriptions.create(model="whisper-1", 
                                                        file=audio_file_open,
                                                        response_format = "verbose_json"
                                                        )
    print("transcript",transcript)
    translated = transcript.text
    if transcript.language != outputLanguage.lower():
        messages = [ 
                        {"role": "system", "content": "translate this text to "+outputLanguage},
                        {"role": "user", "content":transcript.text }
                        ]
        responseTemp = client.chat.completions.create(model="gpt-4", messages=messages)
        translated = responseTemp.choices[0].message.content
        print("translated",translated)
    
    audio_response = client.audio.speech.create(
    model="tts-1",
    voice="alloy",
    input= translated #"This is to test Open AI text to speech service before DC session!"
    )
    audio_response.stream_to_file("uploads"+"/"+"translated_audio"+".mp3")
    with open("uploads/translated_audio.mp3", 'rb') as audio_file:
        audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
    mp3_base64_with_prefix = f"data:audio/mp3;base64,{audio_base64}"
    # print(mp3_base64_with_prefix)
    return jsonify({"transcript": transcript.text, 
                    "translation": translated, 
                    "original_audio_base64": "", 
                    "translated_audio_base64": mp3_base64_with_prefix})


# Run the application
if __name__ == '__main__':
    app.run(debug=True)