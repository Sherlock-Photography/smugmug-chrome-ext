// Make sure we don't re-inject
if (!window.ssSmugmugForChromeAtStart) {
	window.ssSmugmugForChromeAtStart = true;
	
	/**
	 * Inject our tweak JS into the DOM, along with any information it needs from us to get started (since it can't call chrome extension APIs).
	 * Note that the DOM is completely empty at this point, so we can't read any info from the page. 
	 */
	var 
		tweakJSData = document.createElement('script'),
		tweakJS = document.createElement('script'),
		
		parent = (document.head || document.documentElement);
	
	var 
		data = {
			config: {
				path: chrome.extension.getURL("tweaks/")
			},
			settings: {} 
		};
		
	tweakJSData.text = "window.sherlockPhotographySMForChrome = " + JSON.stringify(data) + ";";
	
	var startPoint = parent.firstChild;
	
	parent.insertBefore(tweakJSData, startPoint);
	
	tweakJS.type = 'text/javascript';
	tweakJS.src = chrome.extension.getURL('tweaks/inject.js');
	
	parent.insertBefore(tweakJS, startPoint);
	
	var tweakCSS = document.createElement('link');
	
	tweakCSS.type = 'text/css';
	tweakCSS.rel = 'stylesheet';
	tweakCSS.href = chrome.extension.getURL('tweaks/inject.css');
	
	parent.insertBefore(tweakCSS, startPoint);
	
	// User storage can only be read asynchronously :(, we just have to hope that the settings are loaded before they are read, there is no better alternative.
	chrome.storage.local.get('tweaks.settings', function(localData) {
		// Need to pass the settings to the document by adding a DOM node (since we can't access JS properties) 
		var tweakJSSettings = document.createElement('script');
		
		tweakJSSettings.text = "window.sherlockPhotographySMForChrome.settings = " + JSON.stringify(localData['tweaks.settings'] || {}) + ";";
			
		parent.appendChild(tweakJSSettings);
	});
}