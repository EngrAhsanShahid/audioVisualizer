// Show the loader only on the first visit
window.addEventListener('DOMContentLoaded', () => {
    const loaderContainer = document.getElementById('loader-container');
    const mainContent = document.querySelector('.login-container'); // Selects the main content container

    // Check if the user has already visited
    const isFirstVisit = !localStorage.getItem('hasVisited');

    if (isFirstVisit) {
        // Set the flag in localStorage to indicate the user has visited
        localStorage.setItem('hasVisited', 'true');

        // Fetch and inject the loader HTML
        fetch('/public/loader.html')
            .then(response => response.text())
            .then(data => {
                loaderContainer.innerHTML = data;

                // Simulate loading time
                setTimeout(() => {
                    loaderContainer.style.display = 'none'; // Hide the loader

                    if (mainContent) {
                        mainContent.style.display = 'block'; // Show the main content
                    } else {
                        console.error('Main content not found!');
                    }
                }, 3000); // Adjust the duration as needed
            })
            .catch(error => console.error('Error loading the loader:', error));
    } else {
        // If not the first visit, hide the loader and show the main content immediately
        loaderContainer.style.display = 'none';
        if (mainContent) {
            mainContent.style.display = 'block';
        }
    }
});
