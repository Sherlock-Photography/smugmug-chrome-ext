YUI.add('ss-smugmug-gallery-list', function(Y, NAME) {
	var
		Constants = Y.SherlockPhotography.SmugmugConstants;

	// From http://stackoverflow.com/a/6969486/14431
	function escapeRegExp(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}

	//Found a good specification of CSV as used by Office here: http://www.creativyst.com/Doc/Articles/CSV/CSV01.htm
	function escapeCSV(str) {
		if (typeof str === 'undefined') 
			return "";
		
		str = str + "";
		
		//Only quote the string if needed (if it contains commas, leading or trailing whitespace, or double-quotes):
		if (str && str.match(/[\n,"]|^\s|\s$/)) {
			return '"' + str.replace(/"/g, '""') + '"';
		}
		return str;
	}

	var SmugmugGalleryList = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_nodes: {},
			_nodeTree: {},
			_numErrors: 0,
			
			_stages: [],
			_stage: 0,
			
			_logError: function(message) {
				this._numErrors++;
				this.get('eventLog').appendLog('error', message);				
			},
			
			_stageListComplete: function() {
				this.fire('complete');
				this.fire('update');
			},

			_recurseAugmentNodes: function(treeRoot, path) {
				if (treeRoot.nodeData) {
					var 
						customDomain = this.get('customDomain'),
						nickName = this.get('smugmugNickname');
					
					//Switch the gallery URL to our custom domain name if we can
					if (customDomain) {
						treeRoot.nodeData.Url = treeRoot.nodeData.Url.replace(new RegExp("^http://" + escapeRegExp(nickName) + "\.smugmug\.com"), 'http://' + customDomain);
					}
					
					treeRoot.nodeData.Permalink = Y.SherlockPhotography.SmugmugTools.createGalleryPermalink(treeRoot.nodeData);
				}
				
				path += treeRoot.nodeData.Name;
				
				treeRoot.nodeData.Path = path;				
				
				//No leading / at start of gallery path:
				if (treeRoot.nodeData.Depth > 0) {
					path += "/";
				}

				for (var index in treeRoot.children) {
					this._recurseAugmentNodes(treeRoot.children[index], path);
				}				
			},
			
			/* Add some derived information to each node to make the data more comprehensible to consumers */
			_stageAugmentNodes: function() {
				if (this._nodeTree)
					this._recurseAugmentNodes(this._nodeTree, "");
				
				this._stageCompleted(true);
			},
			
			_stageTreeifyNodes: function() {
				this._nodeTree = Y.SherlockPhotography.SmugmugTools.treeifyNodes(this._nodes);
				
				this._stageCompleted(true);
			},
			
			/**
			 * Walk the SmugMug node tree beginning from the _nodeTree root, find all the nodes and store
			 * in _nodes, _nodeTree.
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
						that._nodes = e.nodes;
						
						that._stageCompleted(true);
					}
				});	
				
				logProgress.set('progress', {completed:0, total:1});	
				
				nodeEnumerator.fetchNodes(this._nodeTree.nodeData);		
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
							
							this._nodeTree = {nodeData: rootNode};
							this._stageCompleted(true);
						},
						failure: function() {
							alert("Couldn't find out the ID of the root node of your SmugMug site, are you logged on?");
						},
					},
					context: this
				});
			},
			
			_stageCompleted: function(success) {
				this._stage++;
				
				var stage = this._stages[this._stage];
				
				stage.call(this);
			},
			
			createList: function() {
				this._nodes = {};
				this._nodeTree = {};
				this._stage = -1;
				
				this._stages = [
                	this._stageFindRootNode,
                	this._stageEnumerateNodes,
                	this._stageTreeifyNodes,
                	this._stageAugmentNodes,
					this._stageListComplete
              	];
				
				this._stageCompleted(true);
			},
			
			hadErrors: function() {
				return this._numErrors;
			}
		},
		{
			/**
			 * Render the nodes in the modellist 'nodes' as CSV, selecting the columns in the array 'columns' (same format
			 * as DataTable's column definitons).
			 * 
			 * @param nodes
			 * @param columns
			 * @returns
			 */
			renderAsCSV: function(nodes, columns) {
				var 
					output = [],
					line,
					index;
				
				//Render headers:
				line = [];
				for (index = 0; index < columns.length; index++) {
					var column = columns[index];
					
					line.push(escapeCSV(column.label));
				}
				output.push(line.join(","));
				
				//Render data:
				nodes.each(function(node) {
					line = [];
					
					for (index = 0; index < columns.length; index++) {
						var 
							column = columns[index],
							value = node.get(column.key),
							cell,
							rendered;
						
						if (column.formatter || column.formatterCSV) {
							cell = {
								value: value,
								record: node
							};
							
							if (column.formatterCSV) {
								rendered = column.formatterCSV(cell);
							} else { 
								rendered = column.formatter(cell);
							}
						} else {
							rendered = value;
						}
						
						line.push(escapeCSV(rendered));
					}
					
					output.push(line.join(","));
				}, this);
				
				return output.join("\n");
			},
			
			ATTRS : {
				smugmugNickname: {
					writeOnly: 'initOnly'
				},
				
				customDomain: {
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
				
				nodeTree: {
					getter: function() {
						return this._nodeTree;
					}
				}
			}
		}
	);

	Y.namespace("SherlockPhotography").SmugmugGalleryList = SmugmugGalleryList;
}, '0.0.1', {
	requires: ['json', 'io', 'ss-smugmug-tools', 'ss-smugmug-constants', 'ss-smugmug-node-enumerator', 'ss-event-log-widget', 'ss-api-smartqueue', 'datatype-date-format']
});