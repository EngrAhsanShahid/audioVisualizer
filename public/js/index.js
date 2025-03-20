async function redirectToWelcome(e) {
    e.preventDefault(); // Prevent the default form submission

    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
    console.log("username=>",username)
    console.log("password=>",password)
    try {
        const response = await fetch('https://aef9dd6d-fb52-456e-9e21-f5e2f54be901-00-2e96ef993fwys.kirk.replit.dev/auth/login', {  // Change URL to your Replit API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        console.log("response=>",response)
        const data = await response.json();
        console.log("data=>",data)
        if (!response.ok) {
            throw new Error(data.detail || "Login failed");
        }

        // Store token in localStorage
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("username", username);

        // Redirect to the welcome page
        window.location.href = './public/dashboard.html';
    } catch (error) {
        alert(error.message); // Show error message if login fails
    }
}

function userclicked(element){
    // Get selected dropdown value
    let voiceSelected = document.querySelector(".dropdown").value;

    // Get clicked button ID
    let buttonClicked = element.id;

    // Create the required output object
    let output = {
        voiceSelected: voiceSelected,
        buttonClicked: buttonClicked
    };

    console.log(output); // Log the output or use it as needed
    return output;
    
}

function logout(){
    localStorage.removeItem("access_token");
    window.location.href = "/";
}