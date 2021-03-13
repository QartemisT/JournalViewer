const password = document.getElementById('login-password')

function login() {
	fetch(sha1(document.getElementById('login-password').value) + "/index.html")
		.then(response => {
			if(response.ok) {
				return response;
			}
		})
		.then(response => response.blob())
		.then(blob => blob.text())
		.then(text => document.body.innerHTML = text)
		.catch(() => {
			document.getElementById('login-alert').style.display = 'block'
			password.setAttribute('placeholder', 'Incorrect password')
			password.value = ''
		});
}

document.getElementById('login-button').addEventListener("click", () => login());
document.onkeydown = e => {
	if((e || window.event).keyCode === 13) {
		login();
	}
}