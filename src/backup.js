YUI().use(['node', 'json', 'io', 'ss-smugmug-tools', 'ss-event-log-widget',  
           'ss-progress-bar', 'ss-smugmug-site-backup', 'ss-smugmug-backup-view'], function(Y) {
	var 
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		
		backup = new Y.SherlockPhotography.SmugmugSiteBackup({
			smugmugNickname: 'n-sherlock',
			eventLog: eventLog
		}),
		
		backupView = new Y.SherlockPhotography.SmugmugBackupView({
		});
	
	Y.io.header('User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / n.sherlock@gmail.com');
	
	Y.on('domready', function () {
		eventLog.render('#eventLog');
		backupView.render('#backup-structure-pane');
		
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
	});
});