window.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem("username") || "Guest";
    const welcomeText = `Welcome, ${username}!`;
    // document.getElementById("username").textContent = username;
    const loaderContainer = document.getElementById('loader-container');
    const welcomeContent = document.querySelector('.welcome-container'); // Selects the welcome content container
    const startButton = document.querySelector(".start-btn"); // Get the button element
    // Fetch and inject the loader HTML
    fetch('loader.html')
        .then(response => response.text())
        .then(data => {
            loaderContainer.innerHTML = data;

            // Simulate loading time
            setTimeout(() => {
                loaderContainer.style.display = 'none'; // Hide the loader

                if (welcomeContent) {
                    welcomeContent.style.display = 'block'; // Show the main content
                    // Type the welcome text one letter at a time
                    let index = 0;
                    const welcomeElement = document.getElementById("welcome-text");

                    function typeText() {
                        if (index < welcomeText.length) {
                            welcomeElement.textContent += welcomeText.charAt(index);
                            index++;
                            setTimeout(typeText, 100); // Adjust typing speed here
                        }
                        else {
                            showButton()
                        }
                    }
                    function showButton() {
                        startButton.style.display = 'block'; // Show the button
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
