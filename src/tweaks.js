YUI().use(['node'], function(Y) {
	Y.on('domready', function () {
		chrome.storage.local.get('tweaks.settings', function(localData) {
			var 
				settings = localData["tweaks.settings"] || {},
				controls = Y.all('.settings input');
			
			controls.on('change', function() {
				Y.one("#save-alert").setStyle('display', 'block');
			});
			
			controls.each(function() {
				if (settings[this.get('name')]) {
					this.set('checked', true);
				}
			});
			
			Y.one('#button-save').on('click', function() {
				controls.each(function() {
					settings[this.get('name')] = this.get('checked'); 
				});
				
				chrome.storage.local.set({"tweaks.settings": settings});
				
				window.close();
			});
			
			Y.one('#button-cancel').on('click', function() {
				window.close();
			});
		});
	});
});