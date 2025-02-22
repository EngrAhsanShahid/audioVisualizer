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
        // document.getElementById("waveform").style.display = "none";
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
}

async function startTheMic() {
    // startButton.disabled = true;
    try {
        updateStatus('Initializing...');

        const tokenResponse = await fetch("https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/session/");
        const data = await tokenResponse.json();
        const EPHEMERAL_KEY = data.client_secret.value;

        peerConnection = new RTCPeerConnection();
        await setupAudio();
        setupDataChannel();

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

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

        const answer = {
            type: "answer",
            sdp: await sdpResponse.text(),
        };
        await peerConnection.setRemoteDescription(answer);

        updateStatus('Connected');
        // document.querySelector(".welcome-container").style.display = "none";
        startMic();


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