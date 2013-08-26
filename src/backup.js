function findUniquePageDesignIDs(nodes) {
	var 
		result = {pageDesignId: {}, siteDesignId: {}};
	
	for (var nodeID in nodes) {
		var node = nodes[nodeID];
		
		if (node.initData) {
			for (var key in result) {
				if (node.initData[key]) {
					result[key][node.initData[key]] = true;
				}
			}
		}
	}
	
	return result;
}

YUI().use(['node', 'json', 'io', 'ss-smugmug-tools', 'ss-smugmug-node-enumerator', 'ss-event-log-widget', 'ss-api-smartqueue', 'ss-progress-bar'], function(Y) {
	var 
		smugmugNickname = 'n-sherlock',
		smugmugDomain = smugmugNickname + '.smugmug.com',
		backup = {},
		eventLog = new Y.SherlockPhotography.EventLogWidget(),
		foundPageDesignIDs = null;
	
	function fetchWidgets(widgets) {
		var logProgress = eventLog.appendLog('info', "Fetching found page designs...");
		
		var 
			pageDesigns = {};
		
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, pageDesign) {
				//Don't store the API status along with the page design:
				delete pageDesign.method;
				delete pageDesign.stat;
				
				pageDesigns[pageDesign.PageDesign.PageDesignID] = pageDesign;
								
				return true;
			},
			responseType: 'json'
		});
		
		for (var index in widgets) {
			var widget = widgets[index];
			
			queue.enqueueRequest({
				url: 'http://' + smugmugDomain + '/services/api/json/1.4.0/',
				data: {
					Type: widget.Type,
					TypeID: widget.TypeID,
					method:'rpc.widgetrender.get'	
				} 
			});
		}
		
		queue.on({
			complete: function() {
				backup.pageDesigns = pageDesigns;
				
				console.log(backup);
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});			
	}
	
	/**
	 * Look through backup's page designs to find the IDs of all the widgets being used, collect
	 * that information together into backup.widgets.
	 */
	function collectWidgets() {
		
	}
	
	/**
	 * Given an array of page design IDs, fetch those designs!
	 */
	function fetchPageDesigns(pageDesignIDs) {
		var logProgress = eventLog.appendLog('info', "Fetching found page designs...");
		
		var 
			pageDesigns = {};
		
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, pageDesign) {
				//Don't store the API status along with the page design:
				delete pageDesign.method;
				delete pageDesign.stat;
				
				pageDesigns[pageDesign.PageDesign.PageDesignID] = pageDesign;
								
				return true;
			},
			responseType: 'json'
		});
		
		for (var index in pageDesignIDs) {
			queue.enqueueRequest({
				url: 'http://' + smugmugDomain + '/services/api/json/1.4.0/',
				data: {
					PageDesignID: pageDesignIDs[index],
					method:'rpc.pagedesign.get'	
				} 
			});
		}
		
		queue.on({
			complete: function() {
				backup.pageDesigns = pageDesigns;
				
				console.log(backup);
				
				fetchWidgets(collectWidgets());
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});	
	}
	
	/**
	 * Given an array of site design IDs, enumerate their page designs and store them into the backup at backup.siteDesigns.
	 */
	function enumerateSitePageDesigns(siteDesignIDs) {
		var logProgress = eventLog.appendLog('info', "Listing site page designs (All Folders, etc)...");
		
		var 
			siteDesigns = {};
		
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, response) {
				for (var index in response.SitePageDesigns) {
					var sitePageDesign = response.SitePageDesigns[index];
					
					if (siteDesigns[sitePageDesign.SiteDesignID] === undefined) {
						siteDesigns[sitePageDesign.SiteDesignID] = {
							sitePageDesigns: {}
						};
					}
					
					siteDesigns[sitePageDesign.SiteDesignID].sitePageDesigns[sitePageDesign.PageDesignID] = sitePageDesign;
					
					foundPageDesignIDs[sitePageDesign.PageDesignID] = true;
				}
				
				return true;
			},
			responseType: 'json'
		});
		
		for (var index in siteDesignIDs) {
			queue.enqueueRequest({
				url: 'http://' + smugmugDomain + '/services/api/json/1.4.0/',
				data: {
					SiteDesignID: siteDesignIDs[index],
					method:'rpc.sitepagedesigns.getforsitedesign'	
				} 
			});
		}
		
		queue.on({
			complete: function() {
				backup.siteDesigns = siteDesigns;
				
				fetchPageDesigns(Object.keys(foundPageDesignIDs));
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});
	}
	
	/**
	 * Fetch every single page to find out what its page design ID is.
	 */
	function enumerateDesignsForPages(nodes) {
		var logProgress = eventLog.appendLog('info', "Checking for customised pages...");
		
		var queue = new Y.SherlockPhotography.APISmartQueue({
			processResponse: function(request, response) {
				var parsed = Y.SherlockPhotography.SmugmugTools.extractPageInitData(response); 
				
				if (!parsed || !nodes[request.node.nodeData.NodeID])
					return 'retry';
				
				//Only keep some of the initData around (most of it I can't see useful keeping in the backup)
				nodes[request.node.nodeData.NodeID].initData = {
					pageDesignId: parsed.pageDesignId,
					siteDesignId: parsed.siteDesignId,
					sitePageDesignId: parsed.sitePageDesignId
				};
				
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
				var uniqued = findUniquePageDesignIDs(nodes);

				console.log(uniqued);

				//Store in a global as key=>true so we can fetch these later:
				foundPageDesignIDs = uniqued.pageDesignId;
				
				var 
					foundSiteDesignIDs = Object.keys(uniqued.siteDesignId);

				var 
					numSiteDesigns = foundSiteDesignIDs.length,
					numPageDesigns = Object.keys(uniqued.pageDesignId).length;
				
				eventLog.appendLog('info', 'Found ' + numSiteDesigns  + ' ' + (numSiteDesigns == 1 ? 'design' : 'designs') + ' and ' + numPageDesigns + ' custom ' + (numPageDesigns == 1 ? 'page' : 'pages') + ' in use.');
								
				enumerateSitePageDesigns(foundSiteDesignIDs);
			},
			progress: function(progress) {
				logProgress.set('progress', progress);
			}
		});
	}
	
	function enumeratePages(rootNode) {
		var
			nodeEnumerator = new Y.SherlockPhotography.SmugmugNodeEnumerator({
				domain: smugmugDomain, 
				maxDepth: 1
			}),
			logProgress = eventLog.appendLog('info', "Finding your pages...");
		
		nodeEnumerator.on({
			progress: function(progress) {
				logProgress.set('progress', progress);
			},
			
			requestFail: function(e) {
				eventLog.appendLog('error', "Failed to fetch children of node '" + e.NodeID + "': " + e.statusText);
			},
			
			complete: function(e) {
				backup.nodes = e.nodes;
				backup.nodeTree = Y.SherlockPhotography.SmugmugTools.treeifyNodes(backup.nodes);
				
				enumerateDesignsForPages(backup.nodes);
			}
		});	
		
		logProgress.set('progress', {completed:0, total:1});	
		
		nodeEnumerator.fetchNodes(rootNode);		
	}
	
	Y.on('domready', function () {
		eventLog.render('#eventLog');
		
		var 
			logInitialProgress = eventLog.appendLog('info', "Connecting to your Smugmug site...");
		
		//We must begin by finding out the ID of the root node of the domain:
		Y.SherlockPhotography.SmugmugTools.getRootNode(smugmugNickname, {
			success: function(rootNode) {
				logInitialProgress.set('message', logInitialProgress.get('message') + ' connected!');
				
				enumeratePages(rootNode);
			},
			failure: function() {
				alert("Couldn't find out the ID of the root node of your SmugMug site, are you logged on?");
			}
		});
	});
});