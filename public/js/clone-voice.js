document.addEventListener('DOMContentLoaded', function() {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
        window.location.href = "/";
    }
    else { 
        document.body.classList.add('fade-in');
        
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
        });
        
        // Back to upload screen
        backToUploadBtn.addEventListener('click', () => {
            recordScreen.style.display = 'none';
            uploadBox.style.display = 'block';
            cloneBtn.disabled = true;
            // Stop recording if active
            if (isRecording) {
                stopRecording();
            }
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
                if (duration < 120 || duration > 300) {
                    showError('Audio must be between 2 and 5 minutes long.');
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
        
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Set up audio context and analyzer for waveform
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 256;
                
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    clearError();
                    stopWaveform();
                    updateCloneButton();
                };
                
                mediaRecorder.start();
                recordBtn.classList.add('recording');
                recordBtn.textContent = 'Stop Recording';
                isRecording = true;
                startTimer();
                startWaveform();
                
                // Clear any uploaded file
                if (hasUploadedFile) {
                    audioUpload.value = '';
                    fileName.textContent = 'No file selected';
                    hasUploadedFile = false;
                }
                
                updateCloneButton();
            } catch (err) {
                showError('Microphone access denied.');
            }
        }
        
        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            recordBtn.classList.remove('recording');
            recordBtn.textContent = 'Start Recording';
            isRecording = false;
            stopTimer();
            if (mediaRecorder && mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
        }
        
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
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            function drawWaveform() {
                if (!analyser) return;
                
                analyser.getByteTimeDomainData(dataArray);
                
                waveform.innerHTML = '';
                const canvas = document.createElement('canvas');
                canvas.width = waveform.offsetWidth;
                canvas.height = waveform.offsetHeight;
                const ctx = canvas.getContext('2d');
                
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
                
                waveform.appendChild(canvas);
                
                if (isRecording) {
                    requestAnimationFrame(drawWaveform);
                }
            }
            
            drawWaveform();
        }
        
        function stopWaveform() {
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