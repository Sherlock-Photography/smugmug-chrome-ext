YUI().use(['node', 'json', 'io', 'event-resize', 'ss-event-log-widget',  
           'ss-progress-bar', 'ss-smugmug-site-backup', 'ss-smugmug-backup-view'], function(Y) {
	var 
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		
		backup = new Y.SherlockPhotography.SmugmugSiteBackup({
			smugmugNickname: 'n-sherlock',
			eventLog: eventLog
		}),
		
		backupView = new Y.SherlockPhotography.SmugmugBackupView({
			container: '#backup-explorer'
		});
	
	//We can't set this header on Chrome, sorry!
	//
	//Y.io.header('User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / n.sherlock@gmail.com');
	
	function adjustPaneHeight() {
		var windowHeight = Y.one("body").get("winHeight");
		
		Y.all('.ss-smugmug-backup-pane').each(function(pane) {
			pane.setStyle('height', (windowHeight - pane.getXY()[1] - 16) +'px');
		});
	}
	
	Y.on({
		domready: function () {
			eventLog.render('#eventLog');
			backupView.render();
			
			adjustPaneHeight();
			
			backup.on('update', function() {
				backupView.set('backup', backup.get('backup'));
			});
			
			Y.one('#btn-backup-create').on('click', function(e) {
				e.preventDefault();
				
				backup.createBackup();
			});
	
			Y.one('#btn-backup-save').on('click', function(e) {
				e.preventDefault();
				
				backup.saveBackupToDisk();		
			});
		},
		windowresize: adjustPaneHeight
	});
});