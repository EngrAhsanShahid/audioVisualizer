let mediaRecorder;
let chunks = [];
let timer;
let startTime;
let remainingTime = 10000; // 10 seconds
let isPaused = false;
let SelectedClonedVoice = ""
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');

// Replace the existing voiceData declaration with this
let voiceData = {
    default: null, // Will be populated from API
    available_voices: [] // Will be populated from API
};
const select = document.getElementById("voiceSelect");
// const defaultText = document.getElementById("defaultVoiceText");
// Function to fetch available voices from API
async function fetchAvailableVoices() {
    try {
        const response = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/voice/get_available_voices", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch available voices");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching voices:", error);
        showError('Error fetching available voices');
        return null;
    }
}

// Function to set default voice via API
async function setDefaultVoice(voiceId) {
    try {
        const response = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/voice/set_default_voice", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ voice_id: voiceId })
        });

        if (!response.ok) {
            throw new Error("Failed to set default voice");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error setting default voice:", error);
        showError('Error setting default voice');
        return null;
    }
}


async function renderOptions() {
    const voicesResponse = await fetchAvailableVoices();
    if (!voicesResponse || !voicesResponse.success) {
        showError('Failed to load voice options');
        return;
    }

    // Update voiceData with API response
    voiceData.available_voices = voicesResponse.voices.map(voice => ({
        name: voice.name,
        id: voice.id,
        type: voice.type,
        isDefault: voice.default || false
    }));

    // 1. Find default voice, 2. Fallback to Alloy, 3. Fallback to first voice
    const defaultVoice = voicesResponse.voices.find(v => v.default) || 
                        voicesResponse.voices.find(v => v.id === "alloy") || 
                        voicesResponse.voices[0];
    
    // Force Alloy if no voices exist (shouldn't happen but safe fallback)
    voiceData.default = defaultVoice ? defaultVoice.name : "Alloy";

    // Create UI elements
    const customSelect = document.querySelector('.custom-select');
    customSelect.innerHTML = `
        <label for="voiceSelect">Selected Voice: </label>
        <div class="select-box">
            <div class="select-selected" id="selected-voice">
                ${voiceData.default}
            </div>
            <div class="select-items" id="voice-options"></div>
        </div>
        <select id="voiceSelect" style="display: none;"></select>
    `;

    // Create hidden select options
    const select = document.getElementById("voiceSelect");
    select.innerHTML = "";
    
    // Create custom dropdown options
    const voiceOptions = document.getElementById("voice-options");
    voiceOptions.innerHTML = "";
    
    voiceData.available_voices.forEach(voice => {
        // Add to hidden select
        const option = document.createElement("option");
        option.value = voice.id;
        option.textContent = voice.name;
        if (voice.id === defaultVoice?.id) {
            option.selected = true;
        }
        select.appendChild(option);
        
        // Add to custom dropdown
        const voiceItem = document.createElement("div");
        voiceItem.className = "select-item";
        voiceItem.dataset.value = voice.id;
        
        if (voice.id === defaultVoice?.id) {
            voiceItem.innerHTML = `
                <span>${voice.name}</span>
                <span class="default-text">Default</span>
            `;
        } else {
            voiceItem.innerHTML = `
                <span>${voice.name}</span>
                <button class="make-default-btn" data-id="${voice.id}">Make Default</button>
            `;
        }
        voiceOptions.appendChild(voiceItem);
    });

    // Update the displayed default voice text
    // defaultText.textContent = `Default Voice: ${voiceData.default}`;

    // Add event listeners
    const selectedVoiceElement = document.getElementById("selected-voice");
    selectedVoiceElement.addEventListener("click", function(e) {
        e.stopPropagation();
        voiceOptions.classList.toggle("show");
        selectedVoiceElement.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function(e) {
        if (!e.target.closest('.select-box')) {
            voiceOptions.classList.remove("show");
            selectedVoiceElement.classList.remove("active");
        }
    });

    // Handle make default button clicks
    document.querySelectorAll(".make-default-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const voiceId = btn.dataset.id;
            const selectedVoice = voiceData.available_voices.find(v => v.id === voiceId);
            
            if (!selectedVoice) return;

            // Call API to set default voice
            const result = await setDefaultVoice(voiceId);
            
            if (result && result.success) {
                // Update UI
                renderOptions();
            }
        });
    });

    // Handle selecting a voice (without making it default)
    document.querySelectorAll(".select-item").forEach(item => {
        item.addEventListener("click", function(e) {
            if (!e.target.classList.contains('make-default-btn')) {
                const voiceId = item.dataset.value;
                const voice = voiceData.available_voices.find(v => v.id === voiceId);
                if (voice) {
                    selectedVoiceElement.textContent = voice.name;
                    document.getElementById("voiceSelect").value = voiceId;
                    voiceOptions.classList.remove("show");
                    selectedVoiceElement.classList.remove("active");
                }
            }
        });
    });
}
  

window.addEventListener('DOMContentLoaded', async () => {    
    // After authentication succeeds, render the voice options
    await renderOptions();
    // Retrieve stored user data from localStorage
    const access_token = localStorage.getItem("access_token");
    // Check if user data exists and contains the correct access_token
    if (!access_token) {
        // Redirect to login page if the access_token is missing or incorrect
        window.location.href = "/";
    }
    // Usage example:

    const response = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/auth/refresh-token", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Token refresh failed");
    }

    const data = await response.json();
    localStorage.setItem("access_token", data.access_token);


    const identity = getJwtIdentity();
    console.log("identity=>",identity);
    let r_q_a = identity.userIdentity.r_q_a;
    let t_r_q = identity.userIdentity.t_r_q;
    let remaining_required_questions = t_r_q - r_q_a;



    const username = localStorage.getItem("username") || "Guest";
    const welcomeText = `Hello ${username}!`;
    let onboardingText = "";
    if(r_q_a == 0){
        onboardingText = `Let's get you onboarded! Answer a few quick questions to personalize your experience and unlock the conversational module.`
        document.getElementById("start_conversation").disabled = true;
        // document.getElementById("voiceSelect").disabled = true;
        document.querySelectorAll('.select-selected').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.6';
        });        
    }
    else if(r_q_a > 0 && r_q_a < t_r_q){
        onboardingText = `To access the conversational module, please complete your onboarding by answering the remaining '${remaining_required_questions}' required questions.`;
        document.getElementById("start_onboarding").textContent = "Continue Onboarding";
        document.getElementById("start_conversation").disabled = true;
        // document.getElementById("voiceSelect").disabled = true;
        document.querySelectorAll('.select-selected').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.6';
        });         
    }
    else if(r_q_a >= t_r_q){
        onboardingText = `You can continue onboarding anytime to answer optional questions and further enhance personalization in the conversational module.`;
        document.getElementById("start_onboarding").textContent = "Continue Onboarding";
        document.getElementById("start_conversation").disabled = false;
        document.getElementById("voiceSelect").disabled = false;
    }

    // document.getElementById("username").textContent = username;
    const loaderContainer = document.getElementById('loader-container');
    const welcomeContent = document.querySelector('.welcome-container'); // Selects the welcome content container
    // const startButton = document.querySelector(".start-btn"); // Get the button element
    const onboardingInstruction = document.querySelector(".onboarding-instruction");
    // Fetch and inject the loader HTML
    fetch('loader.html')
        .then(response => response.text())
        .then(data => {
            loaderContainer.innerHTML = data;

            // Simulate loading time
            setTimeout(() => {
                loaderContainer.style.display = 'none'; // Hide the loader
                document.getElementById("welcome-text").textContent = welcomeText;

                if (welcomeContent) {
                    document.getElementById("hamburger").hidden = false;

                    welcomeContent.style.display = 'flex'; // Show the main content
                    // document.querySelector(".top-line").style.display = "inline";
                    // Type the welcome text one letter at a time
                    let index = 0;
                    const welcomeElement = document.getElementsByClassName("onboarding-instruction")[0]; // Access the first element

                    function typeText() {
                        if (index < onboardingText.length) {
                            welcomeElement.textContent += onboardingText.charAt(index);
                            index++;
                            setTimeout(typeText, 10); // Adjust typing speed here
                        }
                        else {
                            showButtonAndText()
                        }
                    }
                    function showButtonAndText() {
                        // startButton.style.display = 'block'; // Show the button
                        onboardingInstruction.style.display = 'block';
                    }
                    // Start typing effect
                    typeText();
                } else {
                    console.error('Main content not found!');
                }
            }, 3000); // Adjust the duration as needed
        })
        .catch(error => console.error('Error loading the loader:', error));
});

// Define required variables
const CLONING_REQUIRED = true; // Set to `true` if cloning is required, otherwise `false`
let AUDIO_RECORDING_FOR_CLONING = []; // Store meaningful audio chunks
let totalRecordedTime = 0; // Track total speech time in seconds
const CHUNK_DURATION = 4096 / 44100; // Duration of each audio chunk (4096 samples at 44.1kHz)

// setupAudio function
async function setupAudio(recordForCloning = true) {
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;

    peerConnection.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]; // Plays system audio
        processAudioForVisualization(e.streams[0]); // Process system audio
    };

    // Capture microphone audio
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection.addTrack(audioStream.getTracks()[0]);

    if (recordForCloning && CLONING_REQUIRED) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(audioStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0); // Extract raw audio samples
            if (isSpeechDetected(audioData)) {
                AUDIO_RECORDING_FOR_CLONING.push(...audioData);
                totalRecordedTime += CHUNK_DURATION;
                if (totalRecordedTime >= 60) {
                    console.log("10-second audio grabbed.");
                    downloadAudioAsWAV([...AUDIO_RECORDING_FOR_CLONING]);
                    sendAudioToCloneAPI([...AUDIO_RECORDING_FOR_CLONING]);
                    totalRecordedTime = 0;
                    AUDIO_RECORDING_FOR_CLONING = [];
                }
            }
        };
    }
}

// isSpeechDetected function
function isSpeechDetected(audioBuffer) {
    const THRESHOLD = 0.03; // Adjust this threshold as needed
    return audioBuffer.some(sample => Math.abs(sample) > THRESHOLD);
}

// setupDataChannel function
function setupDataChannel() {
    dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannel.onopen = onDataChannelOpen;
    dataChannel.addEventListener("message", handleMessage);
}

function onDataChannelOpen() {
    console.log("Data channel opened.");
    sendInitialMessage(); // Send initial message to the server
    sendResponseCreate(); // Request a response from the server
}

function handleMessage(event) {
    try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);

        switch (message.type) {
            case "response.function_call_arguments.done":
                handleFunctionCall(message);
                break;

            case "response.done":
                handleTranscript(message);
                break;

            case "response.text.delta":
                console.log("Text response:", message.delta);
                break;

            default:
                console.log('Unhandled message type:', message.type);
        }
    } catch (error) {
        showError('Error processing message: ' + error.message);
        console.error('Message handling error:', error);
    }
}

// init function
async function init(e) {
    let urlValue = e.id;


        if(urlValue == "start_onboarding"){
            window.location.href = '/onboarding.html'; // Redirect to onboarding page
        }
        else if(urlValue == "start_conversation"){
            // Get selected voice
            const voiceSelected = document.querySelector("#voiceSelect").value;
            const selectedVoice = voiceData.available_voices.find(v => v.id === voiceSelected);
            
            // Only add query parameter if voice type is 'clone'
            const queryParam = selectedVoice && selectedVoice.type === "clone" ? "?voice=clone" : "";
            window.location.href = `/conversation.html${queryParam}`;
        }
        else if(urlValue == "OnBoarding"){
            window.location.href = '/onboarding.html'; // Redirect to onboarding page
        }
       
    
}

async function startTheMic() {
    // startButton.disabled = true;
    try {
        if (!peerConnection) {
            console.warn("WebRTC connection is not initialized.");
            return;
        }

        // Request a new audio stream
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Replace the old audio tracks with new ones in WebRTC
        audioStream.getTracks().forEach(track => {
            const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === "audio");
            if (sender) {
                sender.replaceTrack(track); // Replace existing track without breaking WebRTC
            } else {
                peerConnection.addTrack(track, audioStream); // Add if no track exists
            }
        });

        // updateStatus('Connected');
        // document.querySelector(".welcome-container").style.display = "none";
        startMic();
        resumeRecordingFile();

        // window.location.href = '/public/audioVisualizer.html';
        // stopButton.disabled = false;
        hideError();

    } catch (error) {
        // startButton.disabled = false;
        // stopButton.disabled = true;
        showError('Error: ' + error.message);
        // console.error('Initialization error:', error);
        updateStatus('Failed to connect');
    }
}

// 🎤 Start Microphone Visualization
function startMic() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            analyserMic = audioContext.createAnalyser();
            analyserMic.fftSize = 512;

            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyserMic);

            const bufferLength = analyserMic.frequencyBinCount;
            dataArrayMic = new Uint8Array(bufferLength);

            canvasMic = document.getElementById("waveform");
            canvasCtxMic = canvasMic.getContext("2d");

            setupCanvas(canvasMic);
            drawWaveMic();
            // startRecording('https://httpbin.org/post');
        })
        .catch(error => console.error("Microphone access denied:", error));
}

function stopRecording() {
    document.getElementById("audioVisualizer").style.display = "none";
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (audioStream) {
        audioStream.getTracks().forEach(track => {
            track.stop();
        });
        audioStream = null;
    }
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }

    // startButton.disabled = false;
    stopButton.disabled = true;
    updateStatus('');
    document.querySelector(".welcome-container").style.display = "flex";
    document.querySelector(".top-line").style.display = "flex";
    showWelcomeScreen()
    hideError();
    // stopRecordingFile();
}


// UI helper functions
function updateStatus(message) {
    statusDiv.textContent = message;
}

function showError(message) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = message;
}

function hideError() {
    errorDiv.style.display = 'none';
}


function getJwtIdentity() {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
        console.error("No token found in localStorage.");
        return null;
    }

    try {
        const base64Url = token.split('.')[1]; // Extract the payload part
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedData = JSON.parse(atob(base64)); // Decode Base64 payload

        return decodedData;
    } catch (error) {
        console.error("Invalid JWT token:", error);
        return null;
    }
}

function userclicked(element){
    // Get selected voiceSelect value
    let voiceSelected = document.querySelector("#voiceSelect").value;

    // Get clicked button ID
    let buttonClicked = element.id;

    // Create the required output object
    let output = {
        voiceSelected: voiceSelected,
        buttonClicked: buttonClicked
    };

    console.log("Selected Voice is:", voiceSelected);
    
    // Find the selected voice to check its type
    const selectedVoice = voiceData.available_voices.find(v => v.id === voiceSelected);
    if (selectedVoice && selectedVoice.type === "clone") {
        SelectedClonedVoice = "?voice=clone";
    } else {
        SelectedClonedVoice = ""
    }
    
    console.log("selected configuration", output);
    return output;
}


document.querySelectorAll(".btn").forEach(button => {
    if (button.textContent.length >= 16) {
        button.classList.add("long-text");
    }
});

function redirectToCloneVoice() {
    // Get the main container
    const container = document.querySelector('body');
    
    // Add fade-out class
    container.classList.add('fade-out');
    
    // Redirect after animation completes
    setTimeout(() => {
        window.location.href = 'clone-voice.html';
    }, 500); // Match this duration with the animation time
}