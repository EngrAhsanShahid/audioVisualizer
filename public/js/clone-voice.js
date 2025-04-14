document.addEventListener('DOMContentLoaded', function() {
    // Retrieve stored user data from localStorage
    const access_token = localStorage.getItem("access_token");
    // Check if user data exists and contains the correct access_token
    if (!access_token) {
        // Redirect to login page if the access_token is missing or incorrect
        window.location.href = "/";
    }
    else{ 
        document.body.classList.add('fade-in');
        // DOM Elements
        const uploadOption = document.getElementById('uploadOption');
        const recordOption = document.getElementById('recordOption');
        const uploadSection = document.getElementById('uploadSection');
        const recordSection = document.getElementById('recordSection');
        const audioUpload = document.getElementById('audioUpload');
        const fileName = document.getElementById('fileName');
        const recordBtn = document.getElementById('recordBtn');
        const timer = document.getElementById('timer');
        const cloneBtn = document.getElementById('cloneBtn');
        const status = document.getElementById('status');
        const error = document.getElementById('error');
        
        // Variables
        let mediaRecorder;
        let audioChunks = [];
        let recordingInterval;
        let seconds = 0;
        
        // Option Selection
        function selectOption(option) {
            uploadOption.classList.toggle('active', option === 'upload');
            recordOption.classList.toggle('active', option === 'record');
            uploadSection.classList.toggle('active', option === 'upload');
            recordSection.classList.toggle('active', option === 'record');
            cloneBtn.disabled = true;
        }
        
        uploadOption.addEventListener('click', () => selectOption('upload'));
        recordOption.addEventListener('click', () => selectOption('record'));
        
        // File Upload Handling
        audioUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                fileName.textContent = file.name;
                validateAudioFile(file);
            }
        });
        
        function validateAudioFile(file) {
            // Updated valid types including correct MP3 MIME types
            const validTypes = [
                'audio/mpeg', // Standard MP3 MIME type
                'audio/mp3',   // Some browsers might use this
                'audio/wav',
                'audio/ogg',
                'audio/webm',
                'audio/x-wav'  // Some WAV files might use this
            ];
            
            // Also check file extension as fallback
            const validExtensions = ['.mp3', '.wav', '.ogg', '.webm'];
            const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            
            if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
                showError('Invalid file type. Please upload an audio file (MP3, WAV, OGG, WEBM).');
                return;
            }
            
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);
            audio.onloadedmetadata = function() {
                const duration = audio.duration;
                if (duration < 120 || duration > 300) {
                    showError('Audio must be between 2 and 5 minutes long.');
                } else {
                    clearError();
                    cloneBtn.disabled = false;
                }
            };
            
            audio.onerror = function() {
                showError('The selected file is not a valid audio file.');
            };
        }
        
        // Recording Functionality
        recordBtn.addEventListener('click', toggleRecording);
        
        function toggleRecording() {
            if (recordBtn.classList.contains('recording')) {
                stopRecording();
            } else {
                startRecording();
            }
        }
        
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    cloneBtn.disabled = false;
                    clearError();
                };
                
                mediaRecorder.start();
                recordBtn.classList.add('recording');
                recordBtn.textContent = 'Stop Recording';
                startTimer();
            } catch (err) {
                showError('Microphone access denied.');
            }
        }
        
        function stopRecording() {
            mediaRecorder.stop();
            recordBtn.classList.remove('recording');
            recordBtn.textContent = 'Start Recording';
            stopTimer();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        function startTimer() {
            seconds = 0;
            updateTimer();
            recordingInterval = setInterval(updateTimer, 1000);
        }
        
        function stopTimer() {
            clearInterval(recordingInterval);
        }
        
        function updateTimer() {
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            // Auto-stop recording if duration reaches 5 minutes (300 seconds)
            if (seconds >= 300) {
                stopRecording();
            }        
        }
        
        // Clone Button - Send to API
        cloneBtn.addEventListener('click', async function() {
            // Show processing status
            status.textContent = 'Processing voice clone...';
            cloneBtn.disabled = true;
            
            try {
                let audioBlob;
                
                // Check which option is active (upload or record)
                if (uploadOption.classList.contains('active')) {
                    // Handle uploaded file
                    const file = audioUpload.files[0];
                    if (!file) {
                        throw new Error('No audio file selected');
                    }
                    audioBlob = file;
                } else {
                    // Handle recorded audio
                    if (audioChunks.length === 0) {
                        throw new Error('No recording available');
                    }
                    audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                }
                
                // Create FormData and append the audio file
                const formData = new FormData();
                const fileName = `voice_${Date.now()}.webm`; // Dynamic filename with timestamp
                formData.append('audio_file', audioBlob, fileName);
                
                // Get the JWT token - you need to implement how you store/retrieve it
                // For example, if stored in localStorage:
                const token = localStorage.getItem('access_token'); // Change 'authToken' to your actual key
                
                if (!token) {
                    throw new Error('Please log in to perform this action');
                }
                
                // Send to your API endpoint
                const response = await fetch('https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/voice/clone', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || errorData.message || 'Failed to clone voice');
                }
                
                const result = await response.json();
                status.textContent = 'Voice cloned successfully!';
            
                // Redirect to dashboard after 1.5 seconds
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } catch (error) {
                console.error('Clone error:', error);
                status.textContent = '';
                showError(error.message);
                cloneBtn.disabled = false;
            }
        });
        
        // Helper function to show errors
        function showError(message) {
            error.textContent = message;
            error.style.display = 'block';
            setTimeout(() => {
                error.style.display = 'none';
            }, 5000);
        }
        
        function clearError() {
            error.textContent = '';
        }
    }
});

