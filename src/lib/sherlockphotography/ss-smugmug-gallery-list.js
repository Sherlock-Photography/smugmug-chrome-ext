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
						treeRoot.nodeData.Url = treeRoot.nodeData.Url.replace(new RegExp("^https?://" + escapeRegExp(nickName) + "\.smugmug\.com"), 'https://' + customDomain);
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
			 * Check if a ModelList of nodes contains any Unlisted or Private ones.
			 */
			nodelistContainsUnlistedOrPrivatePages: function(nodeList) {
				var result = false;
				
				nodeList.each(function(node) {
					var privacy = node.get('PrivacyLevel');
					
					if (privacy == Constants.Privacy.UNLISTED || privacy == Constants.Privacy.PRIVATE) {
						result = true;
						
						//Does .each() support early termination? Nobody knows...
						return false;
					}
				});
				
				return result;
			},
			
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
			
			/**
			 * Render the nodes in the modellist 'nodes' as HTML, selecting the columns in the array 'columns' (same format
			 * as DataTable's column definitons).
			 * 
			 * @param nodes
			 * @param columns
			 * @returns
			 */
			renderAsHTML: function(nodes, usePermalinks) {
				var 
					output = [],
					indent = 0,
					depth = -1,
					SPACES_PER_TAB = 2,
					
					outputLine = function(line, indentDelta) {
						if (indentDelta < 0)
							indent += indentDelta;
						
						output.push(Array(indent * SPACES_PER_TAB + 1).join(" ") + line); //Thank you based StackOverflow http://stackoverflow.com/questions/1877475/repeat-character-n-times
						
						if (indentDelta > 0)
							indent += indentDelta;
					},
					
					//Adapted from YUI's Escape.html to avoid escaping characters like / which we don't need to escape and look super ugly in the output
					myEscape = function(text) {
						var HTML_CHARS = {
					        '&': '&amp;',
					        '<': '&lt;',
					        '>': '&gt;',
					        '"': '&quot;'
					    };

						return (text + '').replace(/[&<>"]/g, function(match) { 
							return HTML_CHARS[match]; 
						});
					};
				
				outputLine('<dl class="ss-sitemap">', +1);
				
				nodes.each(function(node, index) {
					var nodeDepth = node.get('Depth');
					
					//Exclude the homepage node
					if (nodeDepth == 0) {
						return;
					}
					
					//Children of the homepage move to top level:
					nodeDepth--;
					
					//Orphaned nodes move to the top level (since their parents are missing their original depth is meaningless)
					if (node.get('Orphaned')) {
						nodeDepth = 0;
					}
					
					//Finish off the previous node
					while (nodeDepth <= depth) {
						outputLine("</dl>", -1);
						outputLine("</dd>", -1);
						
						depth--;
					}
					
					depth++;

					outputLine("<dd>", +1);
					outputLine("<dl>", +1);
					outputLine("<dt>", +1);
					outputLine('<a href="' + myEscape(usePermalinks ? node.get('Permalink') : node.get('Url')) + '">' + myEscape(node.get('Name')) + "</a>", 0);
					outputLine("</dt>", -1);
				}, this);
				
				while (depth >= 0) {
					outputLine("</dl>", -1);
					outputLine("</dd>", -1);
					
					depth--;
				}
				
				outputLine('</dl>', -1);
				
				output = output.join("\n");
				
				//Replace <dl>s that have just a <dt> and no <dd>s with the content of the <dt> (tidy up the HTML).
				output = output.replace(/^(\s*)<dl>\n\s*<dt>\n\s*(.+?)\n\s*<\/dt>\s*<\/dl>/gm, "$1$2");
								
				return output;
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