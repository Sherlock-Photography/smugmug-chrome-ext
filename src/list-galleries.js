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
			//Bootstrap's event monitoring is a super CPU cycle hog when rebuilding the table (determined by profiling). 4x more expensive than us rebuilding the table!
			//So knock it off:
			$(document).off('.data-api');

			$("#dlg-export-list").modal({
				show: false
			});
			$("#tabs-export a").click(function(e) {
				e.preventDefault();
				$(this).tab('show');
			});			
			
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
			
			var 
				outputCSV = Y.one('#output-csv'),
				outputHTML = Y.one('#output-html'),
				cmCSV = null,
				cmHTML = null,
				selectedNodes = null,
				
				cmExampleCSS = CodeMirror.fromTextArea(Y.one('#example-css textarea').getDOMNode(), {
					mode: 'text/css',
					readOnly: false,
					lineWrapping: false
				}),
				
				cmCSV = CodeMirror(outputCSV.getDOMNode(), {
					mode: 'text/plain',
					readOnly: false,
					lineWrapping: false
				}),
				cmHTML = CodeMirror(outputHTML.getDOMNode(), {
					mode: 'text/html',
					readOnly: false,
					lineWrapping: false
				});

			Y.one('#btn-list-save').on('click', function(e) {
				var 
					selectedColumns = galleryListView.get('selectedColumns');

				selectedNodes = galleryListView.get('selectedNodes');

				cmCSV.setValue(Y.SherlockPhotography.SmugmugGalleryList.renderAsCSV(selectedNodes, selectedColumns));
				cmHTML.setValue(Y.SherlockPhotography.SmugmugGalleryList.renderAsHTML(selectedNodes, window.localStorage["galleryList.htmlUsePermalinks"] == "1"));
				
				if (Y.SherlockPhotography.SmugmugGalleryList.nodelistContainsUnlistedOrPrivatePages(selectedNodes)) {
					Y.one('#tab-html-private-warning').setStyle('display', 'block');
				} else {
					Y.one('#tab-html-private-warning').setStyle('display', 'none');
				}
				
				$("#dlg-export-list").modal('show');
				
				$("#dlg-export-list").on('shown.bs.modal', function() {
					cmCSV.refresh();
					cmHTML.refresh();
					cmExampleCSS.refresh();
				});

				$("#tabs-export a").on('shown.bs.tab', function() {
					cmCSV.refresh();
					cmHTML.refresh();
					cmExampleCSS.refresh();
				});

				e.preventDefault();
			});
			
			Y.one('#btn-save-csv').on('click', function(e) {
				var blob = new Blob([cmCSV.getValue()], {type: "text/csv;charset=utf-8"});
				saveAs(blob, 'Gallery list ' + nickname + ' ' + Y.Date.format(new Date(), {format:"%Y-%m-%d %H%M%S"}) + ".csv");
				
				e.preventDefault();
			});
			
			Y.one('#btn-save-html').on('click', function(e) {
				var blob = new Blob([cmHTML.getValue()], {type: "text/html;charset=utf-8"});
				saveAs(blob, 'Gallery list ' + nickname + ' ' + Y.Date.format(new Date(), {format:"%Y-%m-%d %H%M%S"}) + ".html");
				
				e.preventDefault();
			});
			
			Y.one("#chk-use-permalinks").set('checked', window.localStorage["galleryList.htmlUsePermalinks"] == "1");
			Y.one("#chk-use-permalinks").after('change', function() {
				window.localStorage["galleryList.htmlUsePermalinks"] = Y.one("#chk-use-permalinks").get('checked') ? "1" : "0";
				
				cmHTML.setValue(Y.SherlockPhotography.SmugmugGalleryList.renderAsHTML(selectedNodes, window.localStorage["galleryList.htmlUsePermalinks"] == "1"));
				cmHTML.refresh();
			});
			
			Y.all(".smugmug-site-address").set('text', galleryList.get('smugmugDomain'));
			
			Y.all('#btn-list-save, #btn-list-create, #btn-list-open').setAttribute('disabled', 'disabled');

			galleryList.createList();			
		}
	});
});