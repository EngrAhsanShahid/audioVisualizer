let mediaRecorder;
let chunks = [];
let timer;
let startTime;
let remainingTime = 10000; // 10 seconds
let isPaused = false;
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');

window.addEventListener('DOMContentLoaded', async () => {    
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
        document.getElementById("dropdown").disabled = true;
    }
    else if(r_q_a > 0 && r_q_a < t_r_q){
        onboardingText = `To access the conversational module, please complete your onboarding by answering the remaining '${remaining_required_questions}' required questions.`;
        document.getElementById("start_onboarding").textContent = "Continue Onboarding";
        document.getElementById("start_conversation").disabled = true;
        document.getElementById("dropdown").disabled = true;
    }
    else if(r_q_a >= t_r_q){
        onboardingText = `You can continue onboarding anytime to answer optional questions and further enhance personalization in the conversational module.`;
        document.getElementById("start_onboarding").textContent = "Continue Onboarding";
        document.getElementById("start_conversation").disabled = false;
        document.getElementById("dropdown").disabled = false;
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
    // const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');

    // if (!startButton || !stopButton) {
    //     console.error('Start or Stop button not found in the DOM.');
    //     return;
    // }

    // startButton.disabled = true;
    // stopButton.disabled = true;

    try {
        updateStatus('Initializing...');

        const accessToken = localStorage.getItem('access_token');
        const tokenResponse = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/session/", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });

        const data = await tokenResponse.json();
        const EPHEMERAL_KEY = data.client_secret.value;

        // Initialize WebRTC connection
        peerConnection = new RTCPeerConnection();

        // Set up audio and data channel
        await setupAudio(); // Ensure setupAudio is defined or imported
        setupDataChannel();

        // Create and set local offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send offer to server
        const baseUrl = "https://api.openai.com/v1/realtime";
        const model = "gpt-4o-realtime-preview-2024-12-17";
        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
            method: "POST",
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${EPHEMERAL_KEY}`,
                "Content-Type": "application/sdp"
            },
        });

        // Set server's answer
        const answer = {
            type: "answer",
            sdp: await sdpResponse.text(),
        };
        await peerConnection.setRemoteDescription(answer);

        // Update status and redirect to onboarding page
        updateStatus('Connected');

        if(urlValue == "start_onboarding"){
            window.location.href = '/onboarding.html'; // Redirect to onboarding page
        }
        else if(urlValue == "start_conversation"){
            window.location.href = '/conversation.html'; // Redirect to onboarding page
        }
        else if(urlValue == "OnBoarding"){
            window.location.href = '/onboarding.html'; // Redirect to onboarding page
        }
        // Start microphone and enable stop button
        startTheMic();
        stopButton.disabled = false;
        hideError();
    } catch (error) {
        // startButton.disabled = false;
        stopButton.disabled = true;
        showError('Error: ' + error.message);
        console.error('Initialization error:', error);
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


document.querySelectorAll(".btn").forEach(button => {
    if (button.textContent.length >= 16) {
        button.classList.add("long-text");
    }
});
