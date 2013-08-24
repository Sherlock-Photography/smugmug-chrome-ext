YUI().use(['node', 'json', 'io', 'ss-smugmug-tools', 'ss-smugmug-node-enumerator', 'ss-event-log-widget', 'ss-api-smartqueue', 'ss-progress-bar'], function(Y) {
	var 
		smugmugNickname = 'n-sherlock',
		smugmugDomain = smugmugNickname + '.smugmug.com';
		backup = {};

	function fetchPageDesigns(nodes) {
		//First we have to find the IDs of the page designs for every page... 
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, response) {
				var parsed = Y.SherlockPhotography.SmugmugTools.extractPageInitData(response); 
				
				if (!parsed)
					return false;
				
				console.log(request.node.nodeData.NodeID + '=' + request.node.nodeData.Name + '=' + parsed.pageDesignId + '=' + parsed.sitePageDesignId);
				
				return true;
			},
			responseType: 'html'
		});
		
		for (var nodeID in nodes) {
			var node = nodes[nodeID];
			
			if (node.nodeData.Url) {
				queue.enqueueRequest({
					url: node.nodeData.Url,
					data: {},
					node: node 
				});
			}
		}
		
		queue.on({
			complete: function() {
				alert('Done!');
			},
			progress: function(progress) {
				var progressBar = Y.Node.one('.quick-progressbar');

				if (progress.total > 0) {
					progressBar.one('span').setStyle('width', Math.round((parseInt(progressBar.getComputedStyle('width'), 10) * progress.completed) / progress.total) + 'px');
				}				
			}
		});
	}
	
	Y.on('domready', function () {
		var
			nodeEnumerator = new Y.SherlockPhotography.SmugmugNodeEnumerator({domain: smugmugDomain}),
			eventLog = new Y.SherlockPhotography.EventLogWidget();
		
		eventLog.render('#eventLog');
		
		var 
			logInitialProgress = eventLog.appendLog('info', "Connecting to your Smugmug site..."),
			
			logEnumProgress = null;
		
		nodeEnumerator.on({
			progress: function(progress) {
				logEnumProgress.set('progress', progress);
			},
			
			requestFail: function(e) {
				eventLog.appendLog('error', "Failed to fetch children of node '" + e.NodeID + "': " + e.statusText);
			},
			
			complete: function(e) {
				backup.nodes = e.nodes;
			
				backup.nodeTree = Y.SherlockPhotography.SmugmugTools.treeifyNodes(backup.nodes);
				
				//fetchPageDesigns(backup.nodes);
			}
		});
		
		//We must begin by finding out the ID of the root node of the domain:
		Y.SherlockPhotography.SmugmugTools.getRootNode(smugmugNickname, {
			success: function(rootNode) {
				logInitialProgress.set('message', logInitialProgress.get('message') + ' connected!');
				
				logEnumProgress = eventLog.appendLog('info', "Making a list of your pages...");
								
				logEnumProgress.set('progress', {completed:0, total:1});
				
				nodeEnumerator.fetchNodes(rootNode);
			},
			failure: function() {
				alert("Couldn't find out the ID of the root node of your SmugMug site, are you logged on?");
			}
		});
	});
});