document.addEventListener('DOMContentLoaded', function() {
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
    }
    
    // Clone Button - Simple Version
    cloneBtn.addEventListener('click', function() {
        // Show processing status
        status.textContent = 'Processing voice clone...';
        cloneBtn.disabled = true;
        
        // Simulate processing delay (1.5 seconds)
        setTimeout(function() {
            // Redirect to dashboard page
            window.location.href = 'dashboard.html';
        }, 1500);
    });
    
    // Helper Functions
    function showError(message) {
        error.textContent = message;
        cloneBtn.disabled = true;
    }
    
    function clearError() {
        error.textContent = '';
    }
    
});

