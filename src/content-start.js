/* Inject our JS into the page content, along with any information it needs from us to get started (since it can't call chrome extension APIs). */
var 
	tweakJSData = document.createElement('script'),
	tweakJS = document.createElement('script'),
	tweakCSS = document.createElement('link'),
	
	parent = (document.head || document.documentElement);

tweakCSS.type = 'text/css';
tweakCSS.rel = 'stylesheet';
tweakCSS.href = chrome.extension.getURL('tweaks/inject.css');

parent.appendChild(tweakCSS, null);

tweakJS.type = 'text/javascript';
tweakJS.src = chrome.extension.getURL('tweaks/inject.js');

parent.appendChild(tweakJS, null);

var 
	data = {
		config: {
			path: chrome.extension.getURL("tweaks/")
		}
	};

tweakJSData.text = "window.sherlockSoftwareSMForChrome = " + JSON.stringify(data) + ";";

parent.appendChild(tweakJSData, null);