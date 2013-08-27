YUI.add('ss-smugmug-site-backup', function(Y, NAME) {
	var SmugmugSiteBackup = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_backup: {},
			
			/**
			 * Given an array of page design IDs, fetch those designs!
			 */
			_fetchPageDesigns: function(pageDesignIDs) {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Fetching found page designs..."),
					that = this,
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
						url: 'http://' + this.get('smugmugDomain') + '/services/api/json/1.4.0/',
						data: {
							PageDesignID: pageDesignIDs[index],
							method:'rpc.pagedesign.get'	
						} 
					});
				}
				
				queue.on({
					complete: function() {
						that._backup.pageDesigns = pageDesigns;
						
						console.log(that._backup);
					},
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});	
			},
			
			/**
			 * Given an array of site-page design IDs, enumerate their page designs and store them into the backup at backup.siteDesigns.
			 */
			_enumerateSitePageDesigns: function(siteDesignIDs) {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Listing site page designs (All Folders, etc)..."),
					that = this, 
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
							
							that._backup.pageDesigns[sitePageDesign.PageDesignID] = true;
						}
						
						return true;
					},
					responseType: 'json'
				});
				
				for (var index in siteDesignIDs) {
					queue.enqueueRequest({
						url: 'http://' + this.get('smugmugDomain') + '/services/api/json/1.4.0/',
						data: {
							SiteDesignID: siteDesignIDs[index],
							method:'rpc.sitepagedesigns.getforsitedesign'	
						} 
					});
				}
				
				queue.on({
					complete: function() {
						that._backup.siteDesigns = siteDesigns;
						
						that._fetchPageDesigns(Object.keys(that._backup.pageDesigns));
					},
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
			},
			
			_findUniquePageDesignIDs:function(nodes) {
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
			},	
			
			/**
			 * Fetch every single node from the given array of nodes to find out what their page design IDs are.
			 */
			_enumerateDesignsForPages: function(nodes) {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Checking for customised pages..."),
					that = this;
				
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
						var uniqued = that._findUniquePageDesignIDs(nodes);
				
						//Store in the backup as key=>true so we can fetch these later:
						that._backup.pageDesigns = uniqued.pageDesignId;
						
						var 
							foundSiteDesignIDs = Object.keys(uniqued.siteDesignId);
		
						var 
							numSiteDesigns = foundSiteDesignIDs.length,
							numPageDesigns = Object.keys(uniqued.pageDesignId).length;
						
						that.get('eventLog').appendLog('info', 'Found ' + numSiteDesigns  + ' ' + (numSiteDesigns == 1 ? 'design' : 'designs') + ' and ' + numPageDesigns + ' custom ' + (numPageDesigns == 1 ? 'page' : 'pages') + ' in use.');
										
						that._enumerateSitePageDesigns(foundSiteDesignIDs);
					},
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
			},
			
			/**
			 * Walk the SmugMug node tree beginning from the given root, find all the nodes and store
			 * in _backup.nodes, _backup.nodeTree.
			 * 
			 * @param rootNode
			 */
			_enumeratePages: function(rootNode) {
				var
					nodeEnumerator = new Y.SherlockPhotography.SmugmugNodeEnumerator({
						domain: this.get('smugmugDomain'), 
						maxDepth: 1 /* TODO */
					}),
					logProgress = this.get('eventLog').appendLog('info', "Finding your pages..."),
					that = this;
				
				nodeEnumerator.on({
					progress: function(progress) {
						logProgress.set('progress', progress);
					},
					
					requestFail: function(e) {
						that.get('eventLog').appendLog('error', "Failed to fetch children of node '" + e.NodeID + "': " + e.statusText);
					},
					
					complete: function(e) {
						that._backup.nodes = e.nodes;
						that._backup.nodeTree = Y.SherlockPhotography.SmugmugTools.treeifyNodes(that._backup.nodes);
						
						that._enumerateDesignsForPages(that._backup.nodes);
					}
				});	
				
				logProgress.set('progress', {completed:0, total:1});	
				
				nodeEnumerator.fetchNodes(rootNode);		
			},
			
			createBackup: function() {
				var 
					logInitialProgress = this.get('eventLog').appendLog('info', "Connecting to your Smugmug site...");

				//We must begin by finding out the ID of the root node of the domain:
				Y.SherlockPhotography.SmugmugTools.getRootNode(this.get('smugmugNickname'), {
					on: {
						success: function(rootNode) {
							logInitialProgress.set('message', logInitialProgress.get('message') + ' connected!');
							
							this._enumeratePages(rootNode);
						},
						failure: function() {
							alert("Couldn't find out the ID of the root node of your SmugMug site, are you logged on?");
						},
					},
					context: this
				});				
			},
	
			saveBackupToDisk: function() {
				/* 
				 * The backup's nodetree contains cycles that prevent it being rendered to JSON.
				 * So begin with cloning it so we can strip that out.
				 */
				var cloned = Y.clone(this._backup);

				delete cloned.nodeTree;
				cloned.nodes = Y.SherlockPhotography.SmugmugTools.untreeifyNodes(cloned.nodes);
				
				var blob = new Blob([Y.JSON.stringify(cloned)], {type: "text/plain;charset=utf-8"});
				saveAs(blob, "smugmug backup.json");
			}
		},
		{
			ATTRS : {
				smugmugNickname: {
					writeOnly: 'initOnly'
				},
				
				smugmugDomain: {
					getter: function() {
						return this.get('smugmugNickname') + '.smugmug.com';				
					}
				},
				
				eventLog: {
					value: null
				}
			}
		}
	);

	Y.namespace("SherlockPhotography").SmugmugSiteBackup = SmugmugSiteBackup;
}, '0.0.1', {
	requires: ['node', 'json', 'io', 'ss-smugmug-tools', 'ss-smugmug-node-enumerator', 'ss-event-log-widget', 'ss-api-smartqueue', 'ss-progress-bar']
});