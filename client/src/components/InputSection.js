import React, { useState, useRef, useEffect } from 'react';
import './InputSection.css';

function InputSection({diaryText, onTextChange, onSaveEntry}) {
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
              console.log("🎤 Recognition ended. isRecording:", isRecording);
    
              if (isRecording) {
                console.log("🔄 Restarting recognition...");
                setTimeout(() => {
                  if (recognitionRef.current && isRecording) {
                    try {
                      recognitionRef.current.start();
                    } catch (error) {
                      console.log("❌ Failed to restart:", error);
                    }
                  }
                }, 100);
              } else {
                console.log("✅ Not restarting - recording is stopped");
              }
            }
    
            recognitionRef.current.onerror = (event) => {
              console.log('Speech recognition error:', event.error);
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
            console.log("🎬 Starting recording...");
            if (recognitionRef.current) {
              setIsProcessing(true);
              setIsRecording(true);
              onTextChange("");
              setAccumulatedText("");
        
              recognitionRef.current.start();
            }
        
          }
        
          function stopRecording() {
            console.log("🛑 Stopping recording...");
            setIsRecording(false);
            setIsProcessing(false);
            if (recognitionRef.current) {
              
              try {
                // FIXED: Use stop() instead of abort(), and DON'T destroy the object
                recognitionRef.current.stop();
                console.log("✅ Recording stopped successfully");
                
                // Set final response after a brief delay to ensure state is updated
                setTimeout(() => {
                  onTextChange(accumulatedText.trim());
                }, 100);
                
              } catch (error) {
                console.log("❌ Error stopping recording:", error);
              }
              
            }
        
          }

    const getRecordingButtonText = () => {
        if (isProcessing && isRecording) return '🔴 Recording... (Click to stop)';
        if (isProcessing) return '⏳ Processing...';
        return '🎤 Start Voice Entry';
    };

    const getRecordingButtonClass = () => {
        if (isRecording) return 'record-button recording';
        if (isProcessing) return 'record-button processing';
        return 'record-button';
    };

    return (
        <>
            <div className = "input-section">
            <h3>How are you feeling today?</h3>
            <textarea
                className="diary-input"
                value={diaryText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Tell me about your day... How's your mood? Any pain? What did you eat?"
                rows={4}
            />
            </div>

            <button className={getRecordingButtonClass()} disabled={isProcessing && !isRecording} onClick={isRecording ? stopRecording : startRecording}>{getRecordingButtonText()}</button>
            <button className="save-button" disabled ={isRecording} onClick={onSaveEntry}>💾 Save Entry</button>
        </>
        
    )
}

export default InputSection;