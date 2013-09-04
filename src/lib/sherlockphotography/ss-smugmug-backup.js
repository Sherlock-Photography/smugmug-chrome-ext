YUI.add('ss-smugmug-site-backup', function(Y, NAME) {
	var SmugmugSiteBackup = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_backup: {},
			
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
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});					
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
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});					
			},
			
			/**
			 * Fetch the page designs for all IDs listed in _backup.pageDesigns
			 */
			_stageFetchPageDesigns: function() {
				var 
					logProgress = this.get('eventLog').appendLog('info', "Fetching all discovered page designs..."),
					that = this,
					pageDesigns = this._backup.pageDesigns;
				
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
				
				for (var pageDesignID in pageDesigns) {
					queue.enqueueRequest({
						url: 'http://' + this.get('smugmugDomain') + '/services/api/json/1.4.0/',
						data: {
							PageDesignID: pageDesignID,
							method:'rpc.pagedesign.get'	
						} 
					});
				}
				
				queue.on({
					complete: function() {
						that._backupStageCompleted(true);
					},
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});	
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
								result[key][node.initData[key]] = {};
							}
						}
					}
				}
				
				return result;
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
						that._backup.siteDesigns = uniqued.siteDesignId;
						
						var 
							numSiteDesigns = Object.keys(that._backup.siteDesigns).length,
							numPageDesigns = Object.keys(that._backup.pageDesigns).length;
						
						that.get('eventLog').appendLog('info', 'Found ' + numSiteDesigns  + ' ' + (numSiteDesigns == 1 ? 'site design' : 'site designs') + ' and ' + numPageDesigns + ' custom ' + (numPageDesigns == 1 ? 'page' : 'pages') + ' in use.');
									
						that._backupStageCompleted(true);
					},
					
					progress: function(progress) {
						logProgress.set('progress', progress);
					}
				});
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
					smugmug: "rocks!"
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
			
			createBackup: function() {
				this._backup = {};
				this._backupStage = -1;
				
				this._backupStages = [
                  	this._stageCreateBackupMetadata,
                	this._stageFindRootNode,
                	this._stageEnumerateNodes,
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