(function() {
	try {
		var 
			data = window.sherlockPhotographySMForChrome,
			
			modules = {
				"ss-tile-base-view-collected": {
				    path: "ss-tile-base-view-collected.js",
				    condition: {
				    	trigger: "sm-tile-base-view"
				    }
				},
				"ss-organizer-collected": {
					path: "ss-organizer-collected.js",
					requires: "template-micro",
					condition: {
						trigger: "sm-organizer"
					}
				}
				/*,"ss-upload": {
					path: "ss-upload.js",
					condition: {
						trigger: "sm-upload"
					}
				}*/
			};
		
		window.YUI_config = window.YUI_config || {};
		window.YUI_config.groups = window.YUI_config.groups || {};
		
		window.YUI_config.groups["ss-smugmug-for-chrome"] = {
			modules: modules,
			base: data.config.path
		};
	} catch (e) {
		//Don't break the SM page if we mess up
	}
})();