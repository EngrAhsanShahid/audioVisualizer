let peerConnection = null;
let mediaRecorder;
let audioStream = null;
let dataChannel = null;
let audioContext, analyserMic, analyserServer;
let microphone, serverAudio;
let dataArrayMic, dataArrayServer;
let canvasMic, canvasServer, canvasCtxMic, canvasCtxServer;
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const transcriptDiv = document.getElementById('transcript');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error');
// WebRTC setup functions
let AUDIO_RECORDING_FOR_CLONING = []; // Store meaningful audio chunks
let totalRecordedTime = 0; // Track total speech time in seconds
const SAMPLE_RATE = 44100; // Default WebRTC sample rate (might vary)
const CHUNK_DURATION = 4096 / SAMPLE_RATE; // Duration of each audio chunk
let CLONING_REQUIRED = true;
// onboarding.js
async function initConversation() {
    try {
        updateStatus('Initializing WebRTC...');

        const accessToken = localStorage.getItem('access_token');
        const tokenResponse = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/session/conversation", {
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

        // Log WebRTC events
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate:', event.candidate);
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
        };

        peerConnection.onsignalingstatechange = () => {
            console.log('Signaling state:', peerConnection.signalingState);
        };

        // Set up audio and data channel
        await setupAudio();
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

        // Update status
        updateStatus('Connected');
        // Start microphone
        startTheMic();
    } catch (error) {
        showError('Error: ' + error.message);
        console.error('Initialization error:', error);
    }
}

// // Call initConversation when the page loads
window.addEventListener('DOMContentLoaded', () => {
    // Retrieve stored user data from localStorage
    const access_token = localStorage.getItem("access_token");
    // Check if user data exists and contains the correct access_token
    if (!access_token) {
        // Redirect to login page if the access_token is missing or incorrect
        window.location.href = "/";
    }
    else{
        initConversation();
    }    
});
function stopRecording() {
    // document.getElementById("audioVisualizer").style.display = "none";
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
    // updateStatus('');
    // document.querySelector(".welcome-container").style.display = "flex";
    window.location.href = "/dashboard.html";
    // showWelcomeScreen()
    hideError();
    // stopRecordingFile();
}

const micButton = document.getElementById("micButton");
const micIcon = document.getElementById("micIcon");

micButton.addEventListener("click", () => {
    micButton.classList.toggle("mic-on");
    micButton.classList.toggle("mic-off");
    // toggleMic();
    if (micIcon.classList.contains("fa-microphone")) {
        micIcon.classList.replace("fa-microphone", "fa-microphone-slash");
        stopMic()
    } else {
        micIcon.classList.replace("fa-microphone-slash", "fa-microphone");
        startTheMic();
    }
});

function stopMic() {
    if (audioStream) {
        audioStream.getTracks().forEach(track => {
            if (track.kind === "audio") track.stop(); // Stop only audio tracks
        });
        audioStream = null;
        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }
    }

    pauseRecordingFile(); // Pause recording
    // updateStatus("Microphone disabled");
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


function logout(){
    localStorage.removeItem("access_token");
    window.location.href = "/";
}

async function startRecording(apiUrl) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = event => {
            chunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/mp3' });
            const file = new File([blob], 'audio.mp3', { type: 'audio/mp3' });
            
            // Create a download link for the recorded file
            // const downloadLink = document.createElement('a');
            // downloadLink.href = URL.createObjectURL(blob);
            // downloadLink.download = 'audio.mp3';
            // document.body.appendChild(downloadLink);
            // downloadLink.click();
            // document.body.removeChild(downloadLink);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('https://httpbin.org/post', {
                    method: 'POST',
                    body: formData,
                });
                console.log('File sent:', await response.json());
            } catch (error) {
                console.error('Error sending file:', error);
            }
        };

        mediaRecorder.start();
        startTime = Date.now();
        isPaused = false;
        timer = setTimeout(stopRecordingFile, remainingTime); // Start countdown
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

function pauseRecordingFile() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        clearTimeout(timer); // Stop the countdown
        remainingTime -= (Date.now() - startTime); // Calculate remaining time
        isPaused = true;
        console.log(`Paused. Remaining time: ${remainingTime / 1000} seconds`);
    }
}

function resumeRecordingFile() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        startTime = Date.now();
        isPaused = false;
        timer = setTimeout(stopRecordingFile, remainingTime); // Resume countdown
        console.log('Resumed recording');
    }
}

function stopRecordingFile() {
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
        mediaRecorder.stop();
        clearTimeout(timer);
        startRecording('https://httpbin.org/post');
        console.log('Recording stopped');
    }
}

function testingFunction() {
    // document.getElementById("audioVisualizer").style.display = "none";
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

    startButton.disabled = false;
    stopButton.disabled = true;
    updateStatus('');
    // document.querySelector(".welcome-container").style.display = "flex";
    // hideError();
    // stopRecordingFile();
    window.location.href = '/public/dashboard.html';
}

function micOnFunction(){
    if (micIcon.classList.contains("fa-microphone-slash")) {
        micButton.classList.remove("mic-off");
        micIcon.classList.replace("fa-microphone-slash", "fa-microphone");
        micButton.classList.toggle("mic-on");
    } 
}

// function showWelcomeScreen() {
//     document.querySelector(".welcome-container").style.display = "flex";
//     document.getElementById("audioVisualizer").hidden = true;
//     document.body.classList.remove("bg-audio"); // Remove background image
// }

// function showAudioVisualizer() {
//     document.querySelector(".welcome-container").style.display = "none";
//     document.getElementById("audioVisualizer").hidden = false;
//     document.body.classList.add("bg-audio"); // Add background image
// }


// Message handling functions
function handleTranscript(message) {
    if (message.response?.output?.[0]?.content?.[0]?.transcript) {
        transcriptDiv.textContent += message.response.output[0].content[0].transcript + ' ';
    }
}

async function handleWeatherFunction(output) {
    try {
        const args = JSON.parse(output.arguments);
        const location = args.location;

        const response = await fetch(`http://localhost:8888/weather/${encodeURIComponent(location)}`);
        const data = await response.json();

        // Send function output
        sendFunctionOutput(output.call_id, {
            temperature: data.temperature,
            unit: data.unit,
            location: location
        });

        // Request new response
        sendResponseCreate();
    } catch (error) {
        showError('Error handling weather function: ' + error.message);
    }
}


async function handleUpdateProgressFunction(output) {
    try {
        const args = JSON.parse(output.arguments);


        let headersList = {
            "Accept": "*/*",
            "User-Agent": "Thunder Client (https://www.thunderclient.com)",
            "Authorization": "Bearer " + localStorage.getItem('access_token'),
            "Content-Type": "application/json"
        }

        let bodyContent = JSON.stringify({
            "question_id": args.question_id,
            "summary_of_user_response": args.summary_of_user_response
        });

        let response = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/session/onboarding/update_progress", {
            method: "POST",
            body: bodyContent,
            headers: headersList
        });

        const data = await response.json();
        // Send function output
        console.log("submitting this response: ", data)
        sendFunctionOutput(output.call_id, data);


        // Request new response
        sendResponseCreate();
    } catch (error) {
        showError('Error handling weather function: ' + error.message);
    }
}


async function handleSkipOnboardingFunction(output) {
try {
    const args = JSON.parse(output.arguments);

    let headersList = {
        "Accept": "*/*",
        "User-Agent": "Thunder Client (https://www.thunderclient.com)",
        "Authorization": "Bearer " + localStorage.getItem('access_token'),
        "Content-Type": "application/json"
    };

    let bodyContent = JSON.stringify({});

    let response = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/session/onboarding/skip_onboarding", {
        method: "POST",
        body: bodyContent,
        headers: headersList
    });

    const data = await response.json();

    if (data.success) {
        console.log("All required questions answered, Skipping Onboarding");
        testingFunction()
    } else {
        console.log("Some question requires asnwer, can not skip onboarding");
        sendFunctionOutput(output.call_id, data);
        sendResponseCreate();
    }
} catch (error) {
    console.error('Error handling skip onboarding: ' + error.message);
}
}

function handleFunctionCall(output) {
    // console.log("function name is: ", output?.name)
    // console.log("function_args is:", JSON.parse(output.arguments))
    // output = JSON.parse(output.arguments)

    if ((output?.type === "response.function_call_arguments.done" || output?.type === "function_call") &&
        output?.name === "update_user_progress" &&
        output?.call_id) {
        console.log("calling update_user_progress..")
        handleUpdateProgressFunction(output);
    }
    if ((output?.type === "response.function_call_arguments.done" || output?.type === "function_call") &&
        output?.name === "skip_onboarding" &&
        output?.call_id) {
        console.log("calling skip onboarding")
        handleSkipOnboardingFunction(output);
       
        // testingFunction()
        // if (peerConnection) {
        //     console.log("closing connection...")
        //     peerConnection.close();
        //     peerConnection = null;
        // }
    }
}


function handleMessage(event) {
    try {
        const message = JSON.parse(event.data);
        // console.log('Received message:', message);
        console.log("message type is: ", message.type)
        switch (message.type) {

            case "response.function_call_arguments.done":
                // console.log("the_message_obj_is: ", message)
                let fx_details = message
                console.log("fx_details: ", fx_details)
                handleFunctionCall(fx_details)



            case "response.done":
                handleTranscript(message);

                const output = message.response?.output?.[0];

                // This is called when AI wants Fx mostly
                // if (output) {

                //     handleFunctionCall(output)
                // };
                // break;

                break;


            // If text only then this prints the text
            case "response.text.delta":
                console.log("the message is: ", message)
                console.log(message.delta)
                break;
            // This code gives you entire response at once if only text modality.
            // if (message.response?.output?.[0]?.content?.[0]?.text) {
            //         // Log the text response
            //         const textResponse = message.response.output[0].content[0].text;
            //         console.log("OpenAI Text Response:", textResponse);
            //     }
            default:
            // console.log('Unhandled message type:', message.type);
        }
    } catch (error) {
        showError('Error processing message: ' + error.message);
    }
}



async function sendAudioToCloneAPI(audioBuffer) {
try {


    if (audioBuffer.length === 0) {
        console.error("No audio data available to save.");
        return;
    }

    // Convert Float32Array to Int16Array for WAV format
    let int16AudioData = float32ToInt16(audioBuffer);

    // Create WAV file
    const wavBlob = createWAVFile(int16AudioData, 48000);
    
    // Create FormData and append the WAV file
    let formData = new FormData();
    formData.append("audio_file", wavBlob, "recorded_audio.wav");

    // Retrieve authentication token
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
        console.error("No access token found.");
        return;
    }

    // API endpoint
    let apiUrl = "https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/voice/clone";

    // Send audio file to API
    let response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
        headers: {
            "Authorization": "Bearer " + accessToken
        }
    });

    const data = await response.json();
    console.log("Audio sent to cloning API:", data);
    return data;
} catch (error) {
    console.error("Error sending audio to cloning API:", error.message);
}
}




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

    console.log("audioStream=>", audioStream);



    // ❌ If Cloning is required then this code will run.
    if (recordForCloning && CLONING_REQUIRED) {

        // Extract audio directly from the WebRTC stream
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(audioStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0); // Extract raw audio samples

            // Check if this chunk has meaningful (non-silent) data
            if (isSpeechDetected(audioData)) {
                console.log("Speech detected.");
                AUDIO_RECORDING_FOR_CLONING.push(...audioData);
                totalRecordedTime += CHUNK_DURATION; // Add only speech duration

                // If accumulated speech reaches 10 seconds, log message and reset
                if (totalRecordedTime >= 60) {
                    console.log("10-second audio grabbed.");
                    downloadAudioAsWAV([...AUDIO_RECORDING_FOR_CLONING]);
                    sendAudioToCloneAPI([...AUDIO_RECORDING_FOR_CLONING]);
                    totalRecordedTime = 0; // Reset the timer
                    AUDIO_RECORDING_FOR_CLONING = []; // Clear stored audio
                }
            }
        };
    }
}



// Function to detect if meaningful speech exists in the audio chunk
function isSpeechDetected(audioBuffer) {
    const THRESHOLD = 0.03;
    let speechDetected = audioBuffer.some(sample => Math.abs(sample) > THRESHOLD);

    // if (!speechDetected) {
    //     AUDIO_RECORDING_FOR_CLONING.push(...new Float32Array(4800)); // Add 0.1s silence
    // }

    return speechDetected;
}

async function downloadAudioAsWAV(audioBuffer) {
    if (audioBuffer.length === 0) {
        console.error("No audio data available to save.");
        return;
    }

    // Convert Float32Array to Int16Array for WAV format
    let int16AudioData = float32ToInt16(audioBuffer);

    // Create WAV file
    const wavBlob = createWAVFile(int16AudioData, 48000); // 48kHz is default for WebRTC


    // Download WAV file
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recorded_audio.wav";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Convert Float32Array to Int16Array
function float32ToInt16(buffer) {
    let int16Buffer = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        int16Buffer[i] = Math.max(-1, Math.min(1, buffer[i])) * 32767;
    }
    return int16Buffer;
}

// Create a WAV file from Int16 PCM audio
function createWAVFile(audioData, sampleRate = 48000) {
    const buffer = new ArrayBuffer(44 + audioData.length * 2);
    const view = new DataView(buffer);

    // WAV file header
    function writeString(offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    function writeUint32(offset, value) {
        view.setUint32(offset, value, true);
    }

    function writeUint16(offset, value) {
        view.setUint16(offset, value, true);
    }

    writeString(0, "RIFF");
    writeUint32(4, 36 + audioData.length * 2);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    writeUint32(16, 16);
    writeUint16(20, 1);
    writeUint16(22, 1);
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate * 2);
    writeUint16(32, 2);
    writeUint16(34, 16);
    writeString(36, "data");
    writeUint32(40, audioData.length * 2);

    // Write PCM data
    for (let i = 0; i < audioData.length; i++) {
        view.setInt16(44 + i * 2, audioData[i], true);
    }

    return new Blob([view], { type: "audio/wav" });
}


function setupDataChannel() {
    dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannel.onopen = onDataChannelOpen;
    dataChannel.addEventListener("message", handleMessage);
}

// Message sending functions
// function sendSessionUpdate() {

//     const sessionUpdateEvent = {
//         "type": "session.update",
//         "session": {
//             "tools": [{
//                 "type": "function",
//                 "name": "get_weather",
//                 "description": "Get the current weather. Works only for Earth",
//                 "parameters": {
//                     "type": "object",
//                     "properties": {
//                         "location": { "type": "string" }
//                     },
//                     "required": ["location"]
//                 }
//             },
//             {
//                 "type": "function",
//                 "name": "update_user_progress",
//                 "description": "Always use this tool to updates & store user progress in database during onboarding when specific cataogory is completed",
//                 "parameters": {
//                     "type": "object",
//                     "properties": {
//                         "catagory_id": { "type": "string" },
//                         "user_response_summary": { "type": "string" }
//                     },
//                     "required": ["catagory_id", "user_response_summary"]
//                 }
//             }
//             ],
//             "tool_choice": "auto",
//             "modalities": ["audio", "text"]
//             // "modalities": ["text"]
//         }
//     };
//     sendMessage(sessionUpdateEvent);
// }

function sendInitialMessage() {
    const conversationMessage = {
        "type": "conversation.item.create",
        "previous_item_id": null,
        "item": {
            "id": "msg_" + Date.now(),
            "type": "message",
            "role": "user",
            "content": [{
                "type": "input_text",
                "text": "Hello."
            }]
        }
    };
    sendMessage(conversationMessage);
}

function sendFunctionOutput(callId, data) {
    const responseMessage = {
        "type": "conversation.item.create",
        "item": {
            "type": "function_call_output",
            "call_id": callId,
            "output": JSON.stringify(data)
        }
    };
    sendMessage(responseMessage);
}

function sendResponseCreate() {
    sendMessage({ "type": "response.create" });
}

function sendMessage(message) {
    if (dataChannel?.readyState === "open") {
        dataChannel.send(JSON.stringify(message));
        console.log('Sent message:', message);

        // document.getElementById("audioVisualizer").style.display = "block";
        // showAudioVisualizer();
    }
}

function onDataChannelOpen() {
    // sendSessionUpdate();
    sendInitialMessage();
    //Have AI start the conversation after initial message is sent..
    sendResponseCreate()
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

let ripples = [];

function createRipple(x, y, size) {
    let ripple = document.createElement("div");
    ripple.classList.add("ripple");
    document.body.appendChild(ripple);

    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.borderWidth = "2px"; // Ring effect

    // Remove ripple after animation ends
    setTimeout(() => {
        ripple.style.opacity = "0"; // Smooth fade-out
        setTimeout(() => ripple.remove(), 500); // Ensure removal after fade
    }, 500);
}



function drawWaveMic() {
    requestAnimationFrame(drawWaveMic);
    analyserMic.getByteTimeDomainData(dataArrayMic);

    // Get the peak value from the waveform (instantaneous amplitude)
    let maxAmplitude = 0;
    for (let i = 0; i < dataArrayMic.length; i++) {
        let amplitude = Math.abs(dataArrayMic[i] - 128); // Centered around 128
        if (amplitude > maxAmplitude) {
            maxAmplitude = amplitude;
        }
    }

    // Normalize amplitude and set threshold
    let threshold = 10; // Adjust for sensitivity
    if (maxAmplitude > threshold) {
        let scaledSize = Math.min(maxAmplitude * 2, 100); // Scale for visual effect
        createRipple(window.innerWidth / 2.07, window.innerHeight / 4.3, scaledSize);
    }
}



// 🎶 Replace Canvas with SVG Waveform
function drawWaveServer() {
    requestAnimationFrame(drawWaveServer);
    analyserServer.getByteTimeDomainData(dataArrayServer);

    let pathData = "M0 500"; // Baseline
    let step = 2000 / dataArrayServer.length;
    let amplitude = 300; // Increased amplitude for higher waves

    for (let i = 0; i < dataArrayServer.length; i += 8) {
        let x = i * step;
        let y = 100 + ((dataArrayServer[i] - 128) / 128) * amplitude;
        pathData += ` L${x} ${y}`;
    }

    pathData += " V500 H0 Z";

    gsap.to("#wavePath", {
        attr: { d: pathData },
        duration: 0.08,
        ease: "power2.out",
        fill: "#90a489",
        opacity: 0.7
    });
}


function drawWave() {
    requestAnimationFrame(drawWave);
    analyser.getByteTimeDomainData(dataArray);

    // canvasCtx.fillStyle = "#f4f4f4";
    // canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // canvasCtx.lineWidth = 1;
    // canvasCtx.strokeStyle = "limegreen";
    // canvasCtx.beginPath();

    // let sliceWidth = canvas.width / dataArray.length;
    // let x = 0;

    // for (let i = 0; i < dataArray.length; i++) {
    //     let v = dataArray[i] / 128.0;
    //     let y = v * canvas.height / 2;

    //     if (i === 0) {
    //         canvasCtx.moveTo(x, y);
    //     } else {
    //         canvasCtx.lineTo(x, y);
    //     }
    //     x += sliceWidth;
    // }

    // canvasCtx.lineTo(canvas.width, canvas.height / 2);
    // canvasCtx.stroke();
}

// 📡 Process Server Audio Stream (WebRTC)
function processAudioForVisualization(stream) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    analyserServer = audioContext.createAnalyser();
    analyserServer.fftSize = 1024; // More detailed wave

    serverAudio = audioContext.createMediaStreamSource(stream);
    serverAudio.connect(analyserServer);

    const bufferLength = analyserServer.fftSize;
    dataArrayServer = new Uint8Array(bufferLength);

    drawWaveServer(); // Start SVG wave animation
}


function setupCanvas() {
    const container = document.getElementById("audioVisualizer");
    container.style.display = "block"; // Ensure it's visible
    // showAudioVisualizer();
    // setTimeout(() => {
    //     canvas.width = canvas.clientWidth || 800;
    //     canvas.height = canvas.clientHeight || 300;
    // }, 100);
}
// function startButton() {
//     const statusElement = document.getElementById("status");
//     statusElement.textContent = "Processing...";
//     console.log("Inside startBUtton")
//     // window.location.href = '/public/audioVisualizer.html';  // Adjust the URL as needed
//     // fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/session/")
//     //     .then(response => {
//     //         // statusElement.textContent = "Processing...";
//     //         return response.text();
//     //         // return new Promise(resolve => setTimeout(() => resolve(response.text()), 5000));
//     //     })
//     //     .then(data => {
//     //         // statusElement.textContent = "Server Response: " + data;
//     //         window.location.href = '/public/audioVisualizer.html';  // Adjust the URL as needed
//     //     })
//     //     .catch(error => {
//     //         statusElement.textContent = "Error connecting!";
//     //         console.error("Error:", error);
//     //     });
//     // Main control functions


// }



// Event listeners
// startButton.addEventListener('click', init);
// stopButton.addEventListener('click', stopRecording);
// document.addEventListener('DOMContentLoaded', () => {
//     updateStatus('Ready to start')
//     const startButton = document.getElementById('startButton');
//     if (startButton) {
//         startButton.click(); // Auto-clicks the button
//     }
// });