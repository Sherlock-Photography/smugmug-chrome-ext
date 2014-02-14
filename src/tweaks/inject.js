var 
	config = window.sherlockSoftwareSMForChrome.config,
	
	modules = {
		"ss-lightbox-view-collected": {
		    path: "ss-lightbox-view-collected.js",
		    condition: {
		    	trigger: "sm-lightbox-view"
		    }
		}		
	};

if (!window.YUI_config) {
	window.YUI_config = {};
}
if (!window.YUI_config.groups) {
	window.YUI_config.groups = {};
}

window.YUI_config.groups["ss-smugmug-for-chrome"] = {
	modules: modules,
	base: config.path
};