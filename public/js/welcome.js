window.addEventListener('DOMContentLoaded', () => {
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
                    welcomeContent.style.display = 'block'; // Show the main content
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