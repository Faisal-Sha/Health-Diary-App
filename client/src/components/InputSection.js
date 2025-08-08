import React, { useState, useRef, useEffect } from 'react';
import './InputSection.css';

function InputSection({diaryText, onTextChange, onSaveEntry, isLoading = false, disabled = false}) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false)
    const [accumulatedText, setAccumulatedText] = useState("");
    const recognitionRef = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
          recognitionRef.current = new window.webkitSpeechRecognition();
          recognitionRef.current.lang = "en-US"; 
    
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.maxAlternatives = 1;
    
          //if it hears something
          recognitionRef.current.onresult = (event) => {
            let finalTranscript = "";
            let interimTranscript = "";
    
            //process all results
            for (let i = 0; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
              } else {
                interimTranscript += transcript;
              }
            }
    
            setAccumulatedText(finalTranscript);
            onTextChange(finalTranscript + interimTranscript);
          };
            
          recognitionRef.current.onend = () => {
    
            if (isRecording) {
              setTimeout(() => {
                if (recognitionRef.current && isRecording) {
                  try {
                    recognitionRef.current.start();
                  } catch (error) {
                  }
                }
              }, 100);
            }
          }
    
          recognitionRef.current.onerror = (event) => {
            if (event.error === 'no-speech' && isRecording) {
              setTimeout(() => {
                if (recognitionRef.current && isRecording) {
                  recognitionRef.current.start();
                }
              }, 100);
            }
          }
    
        } else {
          alert("Your browser does not support speech recognition");
        }
      }, []);

    function startRecording() {
        if (recognitionRef.current && !disabled) {
          setIsProcessing(true);
          setIsRecording(true);
          onTextChange("");
          setAccumulatedText("");
          recognitionRef.current.start();
        }
    }
    
    function stopRecording() {
        setIsRecording(false);
        setIsProcessing(false);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
            
            setTimeout(() => {
              onTextChange(accumulatedText.trim());
            }, 100);
            
          } catch (error) {
          }
        }
    }

    const getRecordingButtonText = () => {
        if (disabled) return '🔌 Backend Disconnected';
        if (isLoading) return '⏳ Saving to AI...';
        if (isProcessing && isRecording) return '🔴 Recording... (Click to stop)';
        if (isProcessing) return '⏳ Processing...';
        return '🎤 Start Voice Entry';
    };

    const getSaveButtonText = () => {
        if (disabled) return '🔌 Disconnected';
        if (isLoading) return '🤖 Processing with AI...';
        return '💾 Save Entry';
    };

    const getRecordingButtonClass = () => {
        if (disabled) return 'record-button disabled';
        if (isLoading) return 'record-button loading';
        if (isRecording) return 'record-button recording';
        if (isProcessing) return 'record-button processing';
        return 'record-button';
    };

    const getSaveButtonClass = () => {
        if (disabled) return 'save-button disabled';
        if (isLoading) return 'save-button loading';
        return 'save-button';
    };


    return (
      <>
        <div className="input-section">
            <h3>How are you feeling today?</h3>
            <textarea
                className="diary-input"
                value={diaryText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder={disabled ? "Please start the backend server first..." : "Tell me about your day... How's your mood? Any pain? What did you eat?"}
                rows={4}
                disabled={disabled || isLoading}
            />
        </div>

        <button 
            className={getRecordingButtonClass()} 
            disabled={disabled || isLoading || (isProcessing && !isRecording)} 
            onClick={isRecording ? stopRecording : startRecording}
        >
            {getRecordingButtonText()}
        </button>
        
        <button 
            className={getSaveButtonClass()} 
            disabled={disabled || isRecording || isLoading || !diaryText.trim()} 
            onClick={onSaveEntry}
        >
            {getSaveButtonText()}
        </button>
    </>
  )
}

export default InputSection;