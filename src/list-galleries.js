YUI().use(['node', 'json', 'io', 'event-resize', 'querystring-parse-simple', 'ss-event-log-widget', 'ss-smugmug-gallery-list', 'ss-smugmug-gallery-list-view',
           'ss-progress-bar', 'node-event-simulate', 'event-valuechange'], function(Y) {
	var
		arguments = Y.QueryString.parse(location.search.slice(1)),
		nickname = arguments.nickname,
		customDomain = arguments.customDomain;
	
	if (!/^[a-zA-Z0-9-]+$/.test(nickname)) {
		alert("Bad arguments, please close this page and try again.");
		return;
	}
	
	var
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		galleryList = new Y.SherlockPhotography.SmugmugGalleryList({
			smugmugNickname: nickname,
			customDomain: customDomain,
			eventLog: eventLog
		}),
		galleryListView = null;
	
	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, exfiltrating ur data / n.sherlock@gmail.com');
	
	Y.on({
		domready: function () {
			eventLog.render('#eventLog');
		
			galleryList.on({
				update: function() {
					Y.all('#btn-list-save, #btn-list-create, #btn-list-open').removeAttribute('disabled');

					if (galleryListView) {
						galleryListView.destroy();
						galleryListView = null;
					}				

					galleryListView = new Y.SherlockPhotography.SmugmugGalleryListView({galleryList: galleryList});
					
					galleryListView.render(Y.one('#gallery-list'));

					//Since the vertical height could have been reduced by the expanding log
					//adjustPaneSize();
				},
				complete: function() {
					if (galleryList.hadErrors()) {
						this.get('eventLog').appendLog('error', "Errors were encountered, your gallery list is incomplete!");
					} else {
						this.get('eventLog').appendLog('info', "The gallery list is complete!");
					}
				}
			});
	
			Y.one('#btn-list-save').on('click', function(e) {
				e.preventDefault();
				
				backup.saveBackupToDisk();		
			});
			
			Y.all(".smugmug-site-address").set('text', galleryList.get('smugmugDomain'));
			
			Y.all('#btn-list-save, #btn-list-create, #btn-list-open').setAttribute('disabled', 'disabled');

			galleryList.createList();			
		}
	});
});