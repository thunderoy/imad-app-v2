var modal = document.getElementById('id01');

 // When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};



function loadLoginForm () {
    
    // Submit username/password to login
    var submit = document.getElementById('login_btn');
    submit.onclick = function () {
        // Create a request object
        var request = new XMLHttpRequest();
        
        // Capture the response and store it in a variable
        request.onreadystatechange = function () {
          if (request.readyState === XMLHttpRequest.DONE) {
              // Take some action
              if (request.status === 200) {
                  submit.innerHTML = 'Sucess!';
              } else if (request.status === 403) {
                  submit.innerHTML = 'Invalid credentials. Try again?';
              } else if (request.status === 500) {
                  alert('Something went wrong on the server');
                  submit.innerHTML = 'Login';
              } else {
                  alert('Something went wrong on the server');
                  submit.innerHTML = 'Login';
              }
              loadLogin();
          }  
          // Not done yet
        };
        
        // Make the request
        var username = document.getElementById('username_login').value;
        var password = document.getElementById('password_login').value;
        console.log(username);
        console.log(password);
        request.open('POST', '/login', true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify({username: username, password: password}));  
        submit.innerHTML = 'Logging in...';
        
    };
    
    var register = document.getElementById('register_btn');
    register.onclick = function () {
        // Create a request object
        var request = new XMLHttpRequest();
        
        // Capture the response and store it in a variable
        request.onreadystatechange = function () {
          if (request.readyState === XMLHttpRequest.DONE) {
              // Take some action
              if (request.status === 200) {
                  alert('User created successfully');
                  register.innerHTML = 'Registered!';
              } else {
                  alert('Could not register the user');
                  register.innerHTML = 'Register';
              }
          }
        };
        
        // Make the request
        var username = document.getElementById('username_register').value;
        var password = document.getElementById('password_register').value;
        var cnf_password = document.getElementById('cnf_password_register').value;
        if (password != cnf_password) {
            alert('Enter same password in both box!!');
        }
        // console.log(username);
        // console.log(password);
        request.open('POST', '/register', true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify({username: username, password: password}));  
        register.innerHTML = 'Registering...';
    
    };
}

function loadLoggedInUser (username) {
    var loginArea = document.getElementById('login_area');
    loginArea.innerHTML = `
        <a href="/logout">Hi ${username}, Logout</a>
    `;
    modal.style.display = "none";
}

function loadLogin () {
    // Check if the user is already logged in
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === XMLHttpRequest.DONE) {
            if (request.status === 200) {
                loadLoggedInUser(this.responseText);
            } else {
                loadLoginForm();
            }
        }
    };
    
    request.open('GET', '/check-login', true);
    request.send(null);
}


loadLogin();