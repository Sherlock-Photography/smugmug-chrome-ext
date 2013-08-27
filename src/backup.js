YUI().use(['node', 'json', 'io', 'ss-smugmug-tools', 'ss-event-log-widget',  
           'ss-progress-bar', 'ss-smugmug-site-backup'], function(Y) {
	var 
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		
		backup = new Y.SherlockPhotography.SmugmugSiteBackup({
			smugmugNickname: 'n-sherlock',
			eventLog: eventLog
		});
	
	Y.on('domready', function () {
		eventLog.render('#eventLog');
		
		Y.one('#btn-backup-create').on('click', function(e) {
			e.preventDefault();
			
			backup.createBackup();
		});

		Y.one('#btn-backup-save').on('click', function(e) {
			e.preventDefault();
			
			backup.saveBackupToDisk();		
		});
	});
});