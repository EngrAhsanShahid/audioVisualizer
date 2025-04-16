document.addEventListener('DOMContentLoaded', function() {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
        window.location.href = "/";
    }
    else { 
        document.body.classList.add('fade-in');
        // Add these variables at the top with your other variables
        const audioPlayerContainer = document.getElementById('audioPlayerContainer');
        const audioPlayer = document.getElementById('audioPlayer');
        const recordingControls = document.getElementById('recordingControls');
        const trashBtn = document.getElementById('trashBtn');

        // DOM Elements
        const uploadBox = document.getElementById('uploadBox');
        const recordScreen = document.getElementById('recordScreen');
        const startRecordBtn = document.getElementById('startRecordBtn');
        const backToUploadBtn = document.getElementById('backToUploadBtn');
        const audioUpload = document.getElementById('audioUpload');
        const fileName = document.getElementById('fileName');
        const recordBtn = document.getElementById('recordBtn');
        const timer = document.getElementById('timer');
        const cloneBtn = document.getElementById('cloneBtn');
        const status = document.getElementById('status');
        const error = document.getElementById('error');
        const waveform = document.getElementById('waveform');
        
        // Variables
        let mediaRecorder;
        let audioChunks = [];
        let recordingInterval;
        let seconds = 0;
        let audioContext;
        let analyser;
        let dataArray;
        let hasUploadedFile = false;
        let isRecording = false;
        
        // Switch to record screen
        startRecordBtn.addEventListener('click', () => {
            uploadBox.style.display = 'none';
            recordScreen.style.display = 'block';
            recordBtn.textContent = 'Start Recording';
            waveform.style.display = 'block';
            recordingControls.style.display = 'flex';
            audioPlayerContainer.style.display = 'none';
        });
        
        // Update the backToUploadBtn handler to reset everything
        backToUploadBtn.addEventListener('click', () => {
            recordScreen.style.display = 'none';
            uploadBox.style.display = 'block';
            cloneBtn.disabled = true;
            
            // Reset recording state
            if (isRecording) {
                stopRecording();
            }
            
            // Reset player UI
            waveform.style.display = 'block';
            recordingControls.style.display = 'flex';
            audioPlayerContainer.style.display = 'none';
            audioChunks = [];
            audioPlayer.src = '';
            timer.textContent = '00:00';
            seconds = 0;
        });
        
        backToDashboardBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
        // File Upload Handling
        audioUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                fileName.textContent = file.name;
                validateAudioFile(file);
                hasUploadedFile = true;
                // updateCloneButton();
            }
        });
        
        function validateAudioFile(file) {
            const validTypes = [
                'audio/mpeg',
                'audio/mp3',
                'audio/wav',
                'audio/ogg',
                'audio/webm',
                'audio/x-wav'
            ];
            
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
                if (duration < 45 || duration > 300) {  // Changed from 120 to 45
                    showError('Audio must be between 45 seconds and 5 minutes long.');
                    cloneBtn.disabled = true;
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
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
        
        // In your startRecording() function:
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
                // Initialize audio context and analyser FIRST
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 256;
                
                // Then initialize media recorder
                const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
                    ? 'audio/webm' 
                    : 'audio/mp4';
                mediaRecorder = new MediaRecorder(stream, { mimeType });
                audioChunks = [];
                
                // Set up event handlers
                mediaRecorder.ondataavailable = e => {
                    console.log("Data available:", e.data.size);
                    audioChunks.push(e.data);
                };
                
                mediaRecorder.onstop = () => {
                    console.log("Recording stopped");
                    try {
                        if (audioChunks.length > 0) {
                            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                            const audioUrl = URL.createObjectURL(audioBlob);
                            audioPlayer.src = audioUrl;
                            
                            // Update UI
                            waveform.style.display = 'none';
                            recordingControls.style.display = 'none';
                            audioPlayerContainer.style.display = 'flex';
                            audioPlayerContainer.style.alignItems = 'self-start';
                            cloneBtn.disabled = false;
                            console.log("Audio player updated");
                        }
                    } catch (error) {
                        console.error("Error processing recording:", error);
                        showError("Could not process recording");
                    }
                };
                
                mediaRecorder.start(100); // Collect data every 100ms
                console.log("Recording started");
                
                // Update UI
                recordBtn.classList.add('recording');
                recordBtn.textContent = 'Stop Recording';
                isRecording = true;
                startTimer();
                startWaveform();
                
            } catch (err) {
                console.error("Recording error:", err);
                showError('Microphone access denied or error occurred');
            }
        }
        
        // Modify the stopRecording function
        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            recordBtn.classList.remove('recording');
            isRecording = false;
            stopTimer();
            
            if (mediaRecorder && mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            // Show audio player and hide waveform/controls
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioUrl;
                
                waveform.style.display = 'none';
                recordingControls.style.display = 'none';
                audioPlayerContainer.style.display = 'flex';
                audioPlayerContainer.style.alignContent = 'self-start';
            }
            stopWaveform();
        }
        
        // Add trash button handler
        trashBtn.addEventListener('click', function() {
            // Reset everything
            audioChunks = [];
            audioPlayer.src = '';
            
            // Show recording controls
            waveform.style.display = 'block';
            recordingControls.style.display = 'flex';
            audioPlayerContainer.style.display = 'none';
            recordBtn.textContent = 'Start Recording';
            // Reset timer
            timer.textContent = '00:00';
            seconds = 0;
            
            // Update clone button state
            updateCloneButton();
        });        
        function startTimer() {
            seconds = 0;
            updateTimer();
            recordingInterval = setInterval(updateTimer, 1000);
        }
        
        function stopTimer() {
            clearInterval(recordingInterval);
            timer.textContent = '00:00';
        }
        
        function updateTimer() {
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            if (seconds >= 300) {
                stopRecording();
            }        
        }
        
        function startWaveform() {
            if (!analyser) {
                console.error("Analyser not initialized!");
                return;
            }
        
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            // Clear previous canvas if any
            waveform.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.width = waveform.offsetWidth;
            canvas.height = waveform.offsetHeight;
            waveform.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            
            function draw() {
                if (!isRecording) return;
                
                requestAnimationFrame(draw);
                analyser.getByteTimeDomainData(dataArray);
                
                ctx.fillStyle = 'transparent';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#2e4f2e';
                ctx.beginPath();
                
                const sliceWidth = canvas.width / bufferLength;
                let x = 0;
                
                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * canvas.height / 2;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    
                    x += sliceWidth;
                }
                
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            }
            
            draw();
        }
        
        function stopWaveform() {
            isRecording = false;
            waveform.innerHTML = '';
        }
        
        function updateCloneButton() {
            cloneBtn.disabled = !(hasUploadedFile || (audioChunks.length > 0 && !isRecording));
        }
        
        // Clone Button - Send to API
        cloneBtn.addEventListener('click', async function() {
            status.textContent = 'Processing voice clone...';
            cloneBtn.disabled = true;
            
            try {
                let audioBlob;
                
                if (hasUploadedFile) {
                    const file = audioUpload.files[0];
                    if (!file) {
                        throw new Error('No audio file selected');
                    }
                    audioBlob = file;
                } else {
                    if (audioChunks.length === 0) {
                        throw new Error('No recording available');
                    }
                    audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                }
                
                const formData = new FormData();
                const fileName = `voice_${Date.now()}.webm`;
                formData.append('audio_file', audioBlob, fileName);
                
                const token = localStorage.getItem('access_token');
                
                if (!token) {
                    throw new Error('Please log in to perform this action');
                }
                
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