YUI.add('ss-smugmug-site-backup', function(Y, NAME) {
	var SmugmugSiteBackup = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_backup: {},
			
			_logError: function(message) {
				this._backup.backup.numErrors++;
				this.get('eventLog').appendLog('error', message);				
			},
			
			_stageBackupComplete: function() {
				this.fire('complete');
				this.fire('update');
			},
						
			/**
			 * Fetch detailed information for the skins (user themes) of the site designs discovered in earlier phases.
			 */
			_stageFetchSkins: function() {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Fetching site themes..."),
					that = this;
				
				this._backup.siteSkins = {};
				
				var
					siteSkins = this._backup.siteSkins;
				
				var queue = new Y.SherlockPhotography.APISmartQueue({
					processResponse: function(request, response) {
						for (var index in response.UserSkins) {
							var skin = response.UserSkins[index];
							
							if (skin.IsOwner) {
								siteSkins[skin.SkinID] = skin;
							}
						}
							
						return true;
					},
					responseType: 'json'
				});
				
				queue.enqueueRequest({
					url: 'http://' + this.get('smugmugDomain') + '/services/api/json/1.4.0/',
					data: {
						NickName: this.get('smugmugNickname'),
						method:'rpc.userskin.get'	
					} 
				});
				
				queue.on({
					complete: function() {
						that._backupStageCompleted(true);
					},
					requestFail: function(e) {
						that._logError("Failed to fetch site themes");
					},
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
				
				queue.run();
			},			
			
			/**
			 * Fetch detailed information for the site designs discovered in earlier phases, which have
			 * their IDs as keys in backup.siteDesigns.
			 */
			_stageFetchSiteDesigns: function() {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Fetching details of site designs..."),
					that = this,
					siteDesigns = this._backup.siteDesigns;
				
				var queue = new Y.SherlockPhotography.APISmartQueue({
					processResponse: function(request, response) {
						siteDesigns[response.SiteDesign.SiteDesignID] = Y.merge(response.SiteDesign, siteDesigns[response.SiteDesign.SiteDesignID]);
										
						return true;
					},
					responseType: 'json'
				});
				
				for (var siteDesignID in siteDesigns) {
					queue.enqueueRequest({
						url: 'http://' + this.get('smugmugDomain') + '/services/api/json/1.4.0/',
						data: {
							SiteDesignID: siteDesignID,
							method:'rpc.sitedesign.get'	
						} 
					});
				}
				
				queue.on({
					complete: function() {
						that._backupStageCompleted(true);
					},
					requestFail: function(e) {
						that._logError("Failed to fetch site design ID#" + e.request.data.SiteDesignID);
					},					
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
				
				queue.run();
			},
			
			/**
			 * Fetch the page designs for all IDs listed in _backup.pageDesigns
			 */
			_stageFetchPageDesigns: function() {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Fetching all customised page designs..."),
					that = this,
					apiEndpoint = 'http://' + this.get('smugmugDomain') + '/services/api/json/1.4.0/',
					pageDesigns = this._backup.pageDesigns;
				
				var queue = new Y.SherlockPhotography.APISmartQueue({
					processResponse: function(request, response) {
						if (response.PageDesign) {						
							//Don't store the API status along with the page design:
							delete response.method;
							delete response.stat;

							pageDesigns[response.PageDesign.PageDesignID] = response;
						} else {
							if (request.data.Published === undefined && response.stat == 'fail' && response.message == 'Access denied') {
								//This is probably a page whose customisation was never published, so fetch the Unpublished version:
								queue.enqueueRequest({
									url: apiEndpoint,
									data: Y.merge(request.data, {
										Published: false,
									}) 
								});
								
								queue.run();
							} else {
								that._logError("Got response '" + response.stat + "', '" + response.message + "' while trying to fetch page design #" + request.data.PageDesignID);
							}
						}

						return true;
					},
					responseType: 'json'
				});
				
				for (var pageDesignID in pageDesigns) {
					queue.enqueueRequest({
						url: apiEndpoint,
						data: {
							PageDesignID: pageDesignID,
							method: 'rpc.pagedesign.get'	
						} 
					});
				}
				
				queue.on({
					complete: function() {
						that._backupStageCompleted(true);
					},
					requestFail: function(e) {
						that._logError("Failed to fetch page design ID#" + e.request.data.PageDesignID);
					},					
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
				
				queue.run();
			},
			
			/**
			 * Enumerate the site page designs for all site design IDs listed in _backup.siteDesigns.
			 */
			_stageEnumerateSitePageDesigns: function() {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Listing designs for default pages (homepage, all folders, etc)..."),
					that = this, 
					siteDesigns = this._backup.siteDesigns;
				
				var queue = new Y.SherlockPhotography.APISmartQueue({
					processResponse: function(request, response) {
						for (var index in response.SitePageDesigns) {
							var 
								sitePageDesign = response.SitePageDesigns[index],
								siteDesign = siteDesigns[sitePageDesign.SiteDesignID];
							
							siteDesign.sitePageDesigns = siteDesign.sitePageDesigns || {};
							siteDesign.sitePageDesigns[sitePageDesign.PageDesignID] = sitePageDesign;
							
							/* 
							 * We might not have seen this page design in use during our earlier scan of active
							 * pages, so schedule it for later fetch:
							 */
							that._backup.pageDesigns[sitePageDesign.PageDesignID] = {};
						}
						
						return true;
					},
					responseType: 'json'
				});
				
				for (var siteDesignID in siteDesigns) {
					queue.enqueueRequest({
						url: 'http://' + this.get('smugmugDomain') + '/services/api/json/1.4.0/',
						data: {
							SiteDesignID: siteDesignID,
							method:'rpc.sitepagedesigns.getforsitedesign'	
						} 
					});
				}
				
				queue.on({
					complete: function() {
						that._backupStageCompleted(true);
					},
					requestFail: function(e) {
						that._logError("Failed to find the designs for the default pages of design ID#" + e.request.data.SiteDesignID);
					},										
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
				
				queue.run();
			},
			
			_findUniquePageDesignIDs:function(nodes) {
				var 
					result = {pageDesignId: {}, siteDesignId: {}};
				
				for (var nodeID in nodes) {
					var node = nodes[nodeID];
					
					if (node.initData) {
						for (var key in result) {
							if (node.initData[key]) {
								result[key][node.initData[key]] = {};
							}
						}
					}
				}
				
				return result;
			},	
			
			/**
			 * Filter init data scraped from a SmugMug HTML page to include only the information I want stored in a node's initData:{} field.
			 */
			_filterInitDataForBackup: function(data) {
				return {
					pageDesignId: data.pageDesignId,
					siteDesignId: data.siteDesignId,
					sitePageDesignId: data.sitePageDesignId
				};				
			},
			
			/**
			 * Fetch every single node from _backup.nodes to fetch their init data, store that data in 
			 * _backup.nodes[].initData.
			 * 
			 * ID numbers of discovered site designs are added to _backup.siteDesigns 
			 * ID numbers of discovered page designs are in _backup.pageDesigns
			 */
			_stageEnumerateDesignsForNodes: function() {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Checking for page customisations..."),
					that = this,
					nodes = this._backup.nodes;
				
				var queue = new Y.SherlockPhotography.APISmartQueue({
					processResponse: function(request, response) {
						var parsed = Y.SherlockPhotography.SmugmugTools.extractPageInitData(response); 
						
						if (!parsed || !nodes[request.node.nodeData.NodeID])
							return 'retry';
						
						//Only keep some of the initData around (most of it I can't see useful keeping in the backup)
						nodes[request.node.nodeData.NodeID].initData = that._filterInitDataForBackup(parsed);
						
						return true;
					},
					responseType: 'html'
				});
				
				for (var nodeID in nodes) {
					var node = nodes[nodeID];
					
					//Don't refetch the initData if the system node enumeration already got it for us
					if (node.nodeData.Url && !node.initData) {
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
						that._backup.siteDesigns = uniqued.siteDesignId;
						
						var 
							numSiteDesigns = Object.keys(that._backup.siteDesigns).length,
							numPageDesigns = Object.keys(that._backup.pageDesigns).length;
						
						that.get('eventLog').appendLog('info', 'Found ' + numSiteDesigns  + ' ' + (numSiteDesigns == 1 ? 'site design' : 'site designs') + ' and ' + numPageDesigns + ' custom ' + (numPageDesigns == 1 ? 'page' : 'pages') + ' in use.');
									
						that._backupStageCompleted(true);
					},
					requestFail: function(e) {
						that._logError("Failed to check the design for page '" + e.request.node.nodeData.Name + "'");
					},					
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
				
				queue.run();
			},
			
			_stageTreeifyNodes: function() {
				this._backup.nodeTree = Y.SherlockPhotography.SmugmugTools.treeifyNodes(this._backup.nodes);
				
				this._backupStageCompleted(true);
			},
			
			/**
			 * Find node data for system pages like /browse and add it to _backup.nodes, but only if they've been customised.
			 */
			_stageEnumerateSystemNodes: function() {
				var systemURLs = ["/browse", "/404", "/password", "/date", "/keyword", "/popular", "/search"];
				
				var 
					logProgress = this.get('eventLog').appendLog('info', "Finding system pages..."),
					that = this,
					nodes = this._backup.nodes;
				
				var queue = new Y.SherlockPhotography.APISmartQueue({
					processResponse: function(request, response) {
						var parsed = Y.SherlockPhotography.SmugmugTools.extractPageInitData(response); 

						//Page must be customised to bother storing in backup
						if (parsed && parsed.userNode && parsed.pageDesignId) {
							nodes[parsed.userNode.NodeID] = {nodeData: parsed.userNode, initData: that._filterInitDataForBackup(parsed)};
						}
						
						return true;
					},
					responseType: 'html'
				});
				
				for (var index in systemURLs) {
					queue.enqueueRequest({
						url: 'http://' + this.get('smugmugDomain') + systemURLs[index]
					});
				}
				
				queue.on({
					complete: function() {
						that._backupStageCompleted(true);
					},
					requestFail: function(e) {
						that._logError("Failed to fetch system page '" + e.request.url + "'");
					},					
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
				
				queue.run();				
			},
			
			/**
			 * Walk the SmugMug node tree beginning from the _backup.nodeTree root, find all the nodes and store
			 * in _backup.nodes, _backup.nodeTree.
			 * 
			 * @param rootNode
			 */
			_stageEnumerateNodes: function() {
				var
					nodeEnumerator = new Y.SherlockPhotography.SmugmugNodeEnumerator({
						domain: this.get('smugmugDomain'), 
						maxDepth: 10 /* TODO */
					}),
					logProgress = this.get('eventLog').appendLog('info', "Finding your pages..."),
					that = this;
				
				nodeEnumerator.on({
					progress: function(progress) {
						logProgress.set('progress', progress);
					},
					
					requestFail: function(e) {
						that._logError("Failed to find the children of page '" + e.request.node.nodeData.Name + "': " + e.statusText);
					},
					
					complete: function(e) {
						that._backup.nodes = e.nodes;
						
						that._backupStageCompleted(true);
					}
				});	
				
				logProgress.set('progress', {completed:0, total:1});	
				
				nodeEnumerator.fetchNodes(this._backup.nodeTree.nodeData);		
			},
			
			/** 
			 * We must begin by finding out the ID of the root node of the domain.
			 */
			_stageFindRootNode:function() {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Connecting to your Smugmug site...");
				
				Y.SherlockPhotography.SmugmugTools.getRootNode(this.get('smugmugNickname'), {
					on: {
						success: function(rootNode) {
							logProgress.set('message', logProgress.get('message') + ' connected!');
							
							this._backup.nodeTree = {nodeData: rootNode};
							this._backupStageCompleted(true);
						},
						failure: function() {
							alert("Couldn't find out the ID of the root node of your SmugMug site, are you logged on?");
						},
					},
					context: this
				});
			},
			
			_stageCreateBackupMetadata:function() {
				var metadata = {
					nickname: this.get('smugmugNickname'),
					date: new Date(),
					numErrors: 0,
					version: 1,
					smugmug: "rocks!",
				};
				
				this._backup.backup = metadata;
				
				this._backupStageCompleted(true);				
			},
			
			/**
			 * The backup proceeds in a series of stages that are executed in sequence to slowly build up this._backup.
			 * 
			 * Call this function once one stage is completed so that the next stage can begin.
			 * 
			 * @param success
			 */
			_backupStageCompleted: function(success) {
				this._backupStage++;
				
				var stage = this._backupStages[this._backupStage];
				
				stage.call(this);
			},
			
			/**
			 * Find the node for the given album details, or false if it could not be found.
			 * 
			 * @param albumID
			 * @param albumKey
			 */
			findAlbumNode: function(albumID, albumKey) {
				for (var nodeID in this._backup.nodes) {
					var node = this._backup.nodes[nodeID];
					
					if (node.nodeData && node.nodeData.RemoteID == albumID && node.nodeData.RemoteKey == albumKey) {
						return node;
					}
				}
				
				return false;
			},
			
			createBackup: function() {
				this._backup = {};
				this._backupStage = -1;
				
				this._backupStages = [
                  	this._stageCreateBackupMetadata,
                	this._stageFindRootNode,
                	this._stageEnumerateNodes,
                	this._stageEnumerateSystemNodes,
                	this._stageTreeifyNodes,
					this._stageEnumerateDesignsForNodes,
					this._stageEnumerateSitePageDesigns,
					this._stageFetchPageDesigns,
					this._stageFetchSiteDesigns,
					this._stageFetchSkins,
					this._stageBackupComplete
              	];
				
				this._backupStageCompleted(true);
			},
	
			saveBackupToDisk: function() {
				/* 
				 * The backup's nodetree contains cycles that prevent it being rendered to JSON.
				 * So begin with cloning it so we can strip that out.
				 */
				var cloned = Y.clone(this._backup);

				delete cloned.nodeTree;
				Y.SherlockPhotography.SmugmugTools.untreeifyNodes(cloned.nodes);
				
				var blob = new Blob([Y.JSON.stringify(cloned, null, 2)], {type: "text/plain;charset=utf-8"});
				saveAs(blob, 'smugmug backup ' + this.get('smugmugNickname') + ' ' + Y.Date.format(cloned.backup.date, {format:"%Y-%m-%d %H%M%S"}) + ".json");
			},
			
			/**
			 * File is an HTML5 File API file.
			 * 
			 * @param file
			 */
			loadBackupFromFile: function(file) {
				var 
					reader = new FileReader(),
					that = this;
				
				reader.onload = function(e) {
					try {
						var parsed = JSON.parse(e.target.result);
						
						that._backup = parsed;
						
						that._backup.nodeTree = Y.SherlockPhotography.SmugmugTools.treeifyNodes(that._backup.nodes);
						
						that.get('eventLog').appendLog('info', "Backup loaded!");
						that.fire('update');
					} catch (e) {
						alert("The backup file could not be read. Did you select the right file?");
					}
				};
				
				reader.readAsText(file);				
			},
			
			hadErrors: function() {
				return this._backup && this._backup.backup.numErrors;
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
				},
				
				backup: {
					getter: function() {
						return this._backup;
					}
				}
			}
		}
	);

	Y.namespace("SherlockPhotography").SmugmugSiteBackup = SmugmugSiteBackup;
}, '0.0.1', {
	requires: ['json', 'io', 'ss-smugmug-tools', 'ss-smugmug-node-enumerator', 'ss-event-log-widget', 'ss-api-smartqueue', 'datatype-date-format']
});