document.addEventListener('DOMContentLoaded', function() {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
        window.location.href = "/";
    }
    else {
        document.body.classList.add('fade-in');
        toggleCloneButton(false);
        const downloadBtn = document.getElementById('downloadBtn');
        const uploadSuccessContainer = document.getElementById('uploadSuccessContainer');
        const uploadedAudioPlayer = document.getElementById('uploadedAudioPlayer');
        const uploadTrashBtn = document.getElementById('uploadTrashBtn');
        const divider = document.querySelector('.divider');        
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
        

        // Add this with your other event listeners
        downloadBtn.addEventListener('click', downloadRecordedAudio);

        // Add this function to handle the download
        function downloadRecordedAudio() {
            if (!audioPlayer.src) {
                showNotification('No recording available to download', 'error');
                return;
            }

            // Create a temporary anchor element
            const a = document.createElement('a');
            a.href = audioPlayer.src;
            
            // Set the download filename with timestamp
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
            
            // Use the recorded MIME type for proper file extension
            const extension = 'mp3';            
            a.download = `my-recording-${timestamp}.${extension}`;
            
            // Trigger the download
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
            }, 100);
            
            showNotification('Recording downloaded', 'success');
        }        
        // Switch to record screen with fade effect
        startRecordBtn.addEventListener('click', async () => {
            // Fade out current screen
            document.body.classList.add('fade-out');
            
            // Wait for fade out to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Switch screens
            uploadBox.style.display = 'none';
            recordScreen.style.display = 'block';
            
            // Fade in new screen
            document.body.classList.remove('fade-out');
            
            // Reset UI elements
            recordBtn.textContent = 'Start Recording';
            waveform.style.display = 'block';
            recordingControls.style.display = 'flex';
            audioPlayerContainer.style.display = 'none';
        });
        
        // Back to upload screen with fade effect
        backToUploadBtn.addEventListener('click', async () => {
            // Fade out current screen
            document.body.classList.add('fade-out');
            
            // Wait for fade out to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Switch screens
            recordScreen.style.display = 'none';
            uploadBox.style.display = 'block';
            
            // Fade in new screen
            document.body.classList.remove('fade-out');
            
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
            cloneBtn.disabled = true;
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
                'audio/x-wav',
                'audio/aac',
                'audio/flac',
                'audio/aiff',
                'audio/x-aiff',
                'audio/x-m4a',

            ];
            
            const validExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.aac', '.flac', '.aiff', '.m4a', 'x-aiff'];
            const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            
            if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
                showNotification('Invalid file type. Please upload an audio file (MP3, WAV, OGG, WEBM).', 'error');
                divider.style.display = 'flex';  // Keep divider visible
                startRecordBtn.style.display = 'flex';  // Keep record button visible
                uploadSuccessContainer.style.display = 'none';  // Hide player
                toggleCloneButton(false);  // Hide clone button                
                return;
            }
            
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);
            audio.onloadedmetadata = function() {
                const duration = audio.duration;
                if (duration >= 45 && duration <= 300) {  // Valid duration
                    showNotification('Valid audio file detected', 'success');
                    divider.style.display = 'none';
                    startRecordBtn.style.display = 'none';
                    uploadSuccessContainer.style.display = 'block';
                    uploadedAudioPlayer.src = URL.createObjectURL(file);
                    toggleCloneButton(true);  // Show clone button for valid files
                } else {  // Invalid duration
                    showNotification('Audio must be between 45 seconds and 5 minutes long.', 'error');
                    divider.style.display = 'flex';  // Keep divider visible
                    startRecordBtn.style.display = 'flex';  // Keep record button visible
                    uploadSuccessContainer.style.display = 'none';  // Hide player
                    toggleCloneButton(false);  // Hide clone button
                    audioUpload.value = '';  // Clear the invalid file
                    fileName.textContent = 'No file selected';
                }
            };

            uploadTrashBtn.addEventListener('click', function() {
                // Reset upload state
                audioUpload.value = '';
                fileName.textContent = 'No file selected';
                hasUploadedFile = false;
                
                // Hide player and show original elements
                uploadSuccessContainer.style.display = 'none';
                divider.style.display = 'flex';
                startRecordBtn.style.display = 'flex';
                
                // Reset audio player
                uploadedAudioPlayer.src = '';
                
                // Update clone button
                // updateCloneButton();
                toggleCloneButton(false);
            });
            audio.onerror = function() {
                showNotification('Invalid audio file. Please try again.', 'error');
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
                
                // Update your mediaRecorder.onstop to enable the download button
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
                            downloadBtn.disabled = false; // Enable download button
                            toggleCloneButton(true);
                        }
                    } catch (error) {
                        console.error("Error processing recording:", error);
                        showNotification("Error processing recording", "error");
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
                showNotification('Microphone access denied or error occurred', 'error');
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
        
        downloadBtn.disabled = true;
        // Add trash button handler
        trashBtn.addEventListener('click', function() {
            // Reset everything
            audioChunks = [];
            audioPlayer.src = '';
            downloadBtn.disabled = true;
            
            // Show recording controls
            waveform.style.display = 'block';
            recordingControls.style.display = 'flex';
            audioPlayerContainer.style.display = 'none';
            recordBtn.textContent = 'Start Recording';
            
            // Reset timer
            timer.textContent = '00:00';
            seconds = 0;
            
            // Update clone button state
            toggleCloneButton(false);
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
            
            waveform.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.width = waveform.offsetWidth;
            canvas.height = waveform.offsetHeight;
            waveform.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            
            // For smoothing the wave
            let previousValues = new Array(bufferLength).fill(128);
            const smoothingFactor = 0.8;
            
            function draw() {
                if (!isRecording) return;
                
                requestAnimationFrame(draw);
                analyser.getByteTimeDomainData(dataArray);
                
                // Clear canvas with slight fade
                ctx.fillStyle = 'rgba(246, 246, 229, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Apply smoothing and draw wave
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#2e4f2e';
                
                const sliceWidth = canvas.width / bufferLength;
                const centerY = canvas.height / 2;
                let x = 0;
                
                for (let i = 0; i < bufferLength; i++) {
                    // Smooth the values
                    previousValues[i] = previousValues[i] * smoothingFactor + 
                                      dataArray[i] * (1 - smoothingFactor);
                    
                    const y = centerY + (previousValues[i] - 128) / 128 * (canvas.height * 2.5);
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    
                    x += sliceWidth;
                }
                
                ctx.stroke();
                
                // Draw center reference line
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(46, 79, 46, 0.2)';
                ctx.moveTo(0, centerY);
                ctx.lineTo(canvas.width, centerY);
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
            document.getElementById('processingStatus').style.display = 'block';            
            // status.textContent = 'Processing voice clone...';
            showNotification('Processing voice clone...', 'info');
            cloneBtn.disabled = true;
            // Show processing state
            cloneBtn.innerHTML = `
                <span class="spinner"></span>
                Processing...
            `;
            cloneBtn.classList.add('processing');
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
                showNotification('Voice cloned successfully!', 'success');
                
                // Reset UI after successful clone
                setTimeout(() => {
                    // If coming from upload
                    if (hasUploadedFile) {
                        audioUpload.value = '';
                        fileName.textContent = 'No file selected';
                        uploadSuccessContainer.style.display = 'none';
                        divider.style.display = 'flex';
                        startRecordBtn.style.display = 'flex';
                        uploadedAudioPlayer.src = '';
                    }
                    // If coming from recording
                    else {
                        audioChunks = [];
                        audioPlayer.src = '';
                        waveform.style.display = 'block';
                        recordingControls.style.display = 'flex';
                        audioPlayerContainer.style.display = 'none';
                        timer.textContent = '00:00';
                        seconds = 0;
                    }
                    // On error/success:
                    document.getElementById('processingStatus').style.display = 'none';                    
                    hasUploadedFile = false;
                    window.location.href = 'dashboard.html';
                }, 1500);
            } catch (error) {
                // Reset button on error
                cloneBtn.innerHTML = 'Clone Voice';
                cloneBtn.classList.remove('processing');
                cloneBtn.disabled = false;
                showNotification(error.message, 'error');
            }
        });
        

        function toggleCloneButton(show) {
            const cloneBtn = document.getElementById('cloneBtn');
            cloneBtn.style.display = show ? 'block' : 'none';
        }

        function clearError() {
            error.textContent = '';
        }

        function showNotification(message, type = 'info') {
            // Remove any existing notifications
            const existing = document.querySelector('.notification');
            if (existing) {
                existing.remove();
            }
        
            // Create new notification
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
        
            // Trigger animation
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
        
            // Auto-hide after 5 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 5000);
        }        
    }
});