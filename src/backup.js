YUI().use(['node', 'json', 'io', 'event-resize', 'ss-event-log-widget',  
           'ss-progress-bar', 'ss-smugmug-site-backup', 'ss-smugmug-backup-view'], function(Y) {
	var nickname =  chrome.extension.getBackgroundPage().nickname;
	
	var 
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		
		backup = new Y.SherlockPhotography.SmugmugSiteBackup({
			smugmugNickname: nickname,
			eventLog: eventLog
		}),
		
		backupView = new Y.SherlockPhotography.SmugmugBackupView({
			container: '#backup-explorer'
		});
	
	//Sorry, this is the best I can do on Chrome! (it doesn't allow User-Agent to be changed)
	Y.io.header('X-User-Agent', 'Unofficial SmugMug extension for Chrome v0.1 / I\'m in ur server, exfiltrating ur data / n.sherlock@gmail.com');
	
	function adjustPaneSize() {
		var 
			windowWidth = Y.one("body").get("winWidth"),
			windowHeight = Y.one("body").get("winHeight");
		
		//Panes need height adjusted so they fill the window
		Y.all('.ss-smugmug-backup-pane').each(function(pane) {
			pane.setStyle('height', (windowHeight - pane.getXY()[1] - 16) + 'px');
		});
		
		//Rightmost pane fills the remaining space in the window
		Y.all('.ss-smugmug-backup-node-pane').each(function(pane) {
            var parent = pane.get('parentNode');
            
			pane.setStyle('width', (parent.get('offsetWidth') + parent.getXY()[0] - pane.getXY()[0]) + 'px');
		});
	}
	
	Y.on({
		domready: function () {
			eventLog.render('#eventLog');
			backupView.render();
			
			adjustPaneSize();
			
			backup.on({
				update: function() {
					Y.one('#btn-backup-save').removeAttribute('disabled');
					backupView.set('backup', backup.get('backup'));
				},
				complete: function() {
					this.get('eventLog').appendLog('info', "Backup is complete! Don't forget to click on the save button!");
				}
			});
			
			Y.one('#btn-backup-create').on('click', function(e) {
				e.preventDefault();
				
				backup.createBackup();
			});
	
			Y.one('#btn-backup-save').on('click', function(e) {
				e.preventDefault();
				
				backup.saveBackupToDisk();		
			});
			

			Y.one("#btn-backup-open").on('click', function(e) {
				Y.one("#file-backup-open").getDOMNode().click();
			});
			
			Y.one("#file-backup-open").on('change', function(e) {
				if (this.getDOMNode().files.length > 0) {
					backup.loadBackupFromFile(this.getDOMNode().files[0]);
				}
			});
			
			eventLog.appendLog('info', 'Click the "Start Backup" button below to begin the backup process.');
		},
		windowresize: adjustPaneSize
	});
});