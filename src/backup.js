YUI().use(['node', 'json', 'io', 'event-resize', 'querystring-parse-simple', 'ss-event-log-widget',
           'ss-progress-bar', 'ss-smugmug-site-backup', 'ss-smugmug-backup-view', 'node-event-simulate'], function(Y) {
	var 
		nickname = Y.QueryString.parse(location.search.slice(1)).nickname;
	
	if (!/^[a-zA-Z0-9-]+$/.test(nickname)) {
		alert("Bad arguments, please close this page and try again.");
		return;
	}
	
	var
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		backup = new Y.SherlockPhotography.SmugmugSiteBackup({
			smugmugNickname: nickname,
			eventLog: eventLog
		}),
		backupView = null;
	
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
            var parent = Y.one("#backup-explorer");
            
			pane.setStyle('width', (parent.get('offsetWidth') + parent.getXY()[0] - pane.getXY()[0]) + 'px');
		});
	}
	
	Y.on({
		domready: function () {
			eventLog.render('#eventLog');
			
			adjustPaneSize();
			
			backup.on({
				update: function() {
					Y.all('#btn-backup-save, #btn-backup-create, #btn-backup-open').removeAttribute('disabled');

					if (backupView) {
						backupView.destroy();
						backupView = null;
					}				

					backupView = new Y.SherlockPhotography.SmugmugBackupView({backup: backup});
					
					backupView.render(Y.one('#backup-explorer'));

					//Since the vertical height could have been reduced by the expanding log
					adjustPaneSize();
				},
				complete: function() {
					if (backup.hadErrors()) {
						this.get('eventLog').appendLog('error', "Errors were encountered during backup, your backup is incomplete!");
					} else {
						this.get('eventLog').appendLog('info', "Backup is complete! Don't forget to click on the save button!");
					}
				}
			});
			
			Y.one('#btn-backup-create').on('click', function(e) {
				e.preventDefault();
				
				if (backupView) {
					backupView.destroy();
					backupView = null;
				}				

				Y.all('#btn-backup-save, #btn-backup-create, #btn-backup-open').setAttribute('disabled', 'disabled');

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
			
			Y.all(".smugmug-site-address").set('text', backup.get('smugmugDomain'));
			
			eventLog.appendLog('info', 'Click the "Start Backup" button below to begin the backup process.');
			
			if (window.localStorage["backupTool.seenHelp"] != "1") {
				Y.one("#btn-help").simulate('click');
				
				window.localStorage["backupTool.seenHelp"] = 1;
			}			
		},
		windowresize: adjustPaneSize
	});
});