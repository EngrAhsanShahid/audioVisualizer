let mediaRecorder;
let chunks = [];
let timer;

window.addEventListener('DOMContentLoaded', () => {
    // Retrieve stored user data from localStorage
    const access_token = localStorage.getItem("access_token");
    // Check if user data exists and contains the correct access_token
    if (!access_token) {
        // Redirect to login page if the access_token is missing or incorrect
        window.location.href = "/";
    }
    const username = localStorage.getItem("username") || "Guest";
    const welcomeText = `Welcome ${username}!`;
    const onboardingText = `To proceed further, we need to onboard you by understanding you. Click start
            when you're ready.`;
    // document.getElementById("username").textContent = username;
    const loaderContainer = document.getElementById('loader-container');
    const welcomeContent = document.querySelector('.welcome-container'); // Selects the welcome content container
    const startButton = document.querySelector(".start-btn"); // Get the button element
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
                    welcomeContent.style.display = 'flex'; // Show the main content
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
                        startButton.style.display = 'block'; // Show the button
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
        timer = setTimeout(() => stopRecordingFile(), 10000); // Stop after 1 minute
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

function pauseRecordingFile() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        clearTimeout(timer);
        console.log('Recording paused');
    }
}

function resumeRecordingFile() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        console.log('Recording resumed');
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
    document.querySelector(".welcome-container").style.display = "flex";
    hideError();
    stopRecordingFile();
    window.location.href = '/public/dashboard.html';
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