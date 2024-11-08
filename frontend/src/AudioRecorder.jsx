import React, { useState, useRef , useEffect} from 'react';
import './AudioRecorder.css';
const languages = [
    'Auto', 'English', 'Spanish', 'French', 'German',
    'Chinese', 'Japanese', 'Russian', 'Hindi', 'Arabic'
  ];
const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [inputLanguage, setInputLanguage] = useState('Auto');
    const [outputLanguage, setOutputLanguage] = useState('English');
    const [translation, setTranslation] = useState('');
    const [originalAudioUrl, setOriginalAudioUrl] = useState(null);
    const [translatedAudioUrl, setTranslatedAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);
    
    useEffect(() => {
      if(isRecording){
        setTranscript('')
        setTranslation('')
        setOriginalAudioUrl(null)
        setTranslatedAudioUrl(null)
      }
    }, [isRecording])
    
    const startRecording = async () => {
        setTranscript('');
        setIsRecording(true);
        audioChunks.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                sendAudio(audioBlob);
            };

            mediaRecorderRef.current.start();
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        mediaRecorderRef.current.stop();
    };

    const sendAudio = async (audioBlob) => {
        const audioBase64 = await convertBlobToBase64(audioBlob);

        const payload = {
            audio: audioBase64,
            inputLanguage,
            outputLanguage,
        };
        setLoading(true)
        try {
            const response = await fetch('http://127.0.0.1:5000/speech-to-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            setLoading(false)
            setTranscript(result.transcript || "Transcription failed");
            setTranslation(result.translation || "Translation failed");

            if (result.original_audio_base64) {
                setOriginalAudioUrl(base64ToUrl(result.original_audio_base64));
            }
            if (result.translated_audio_base64) {
                console.log("translated_audio_base64")
                setTranslatedAudioUrl(base64ToUrl(result.translated_audio_base64));
            }
        } catch (error) {
            console.error('Error sending audio file:', error);
        }
    };

    const convertBlobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const base64ToUrl = (base64) => {
        const byteString = atob(base64.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([uint8Array], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    };

    return (
        <div className="recorder">
            <h1>Healthcare Translation</h1>
            <div className="language-bars">
            <select value={inputLanguage} onChange={(e) => setInputLanguage(e.target.value)}>
          {languages.map(lang => (
            <option value={lang} key={lang}>{lang}</option>
          ))}
        </select>
        <select value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value)}>
          {languages.map(lang => (
            <option value={lang} key={lang}>{lang}</option>
          ))}
        </select>
            </div>
            <div className="recording-area">
                <button onClick={isRecording ? stopRecording : startRecording}>
                    {isRecording ? "Stop" : "Speak"}
                </button>
            </div>
            {
                loading && <div>Processing</div>
            }
            <div className="transcripts">
                <div className="script-box">
                    <p>Original Script</p>
                    <p>{transcript}</p>
                    {originalAudioUrl && (
                        <audio controls>
                            <source src={originalAudioUrl} type="audio/wav" />
                            Your browser does not support the audio element.
                        </audio>
                    )}
                </div>
                <div className="script-box">
                    <p>Translated Script</p>
                    <p>{translation}</p>
                    {translatedAudioUrl && (
                        <audio controls>
                            <source src={translatedAudioUrl} type="audio/wav" />
                            Your browser does not support the audio element.
                        </audio>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioRecorder;