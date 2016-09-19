// Import ES6/TypeScript modules
require("./initModules");

// // Load plain JavaScript 'script files'
// require("./initScripts");


function bootstrapAngular() {
	// Bootstrap Angular
	var domElement = document.querySelector('html');
	angular.bootstrap(domElement, ["trelloCal"], {strictDi: true});

}
if (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1) {
	// URL: Running in Cordova/PhoneGap
	document.addEventListener("deviceready", bootstrapAngular, false);

	//start with week when running as app first time

	if (localStorage.getItem('w11ktrello.startMonth') === null) {
		localStorage.setItem('w11ktrello.startMonth', false)

	}
} else {
	//URL: Running in browser
	bootstrapAngular();
}
