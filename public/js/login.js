function redirectToWelcome(e) {
    e.preventDefault();  // Prevent the form from submitting

    let username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    localStorage.setItem("username", username);
    // Example: Perform login validation (you can customize this part)
    if (password === 'admin') {
        // Wait for 2 seconds and then redirect
        window.location.href = 'welcome.html';  // Adjust the URL as needed
    } else {
        // If login fails, alert the user (you can show a message in the UI)
        alert('Invalid username or password');
    }
}
