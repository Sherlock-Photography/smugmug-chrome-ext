YUI.add('ss-smugmug-tools', function(Y) {
	var SmugmugTools = Y.Base.create(
		'ssSmugmugTools',
		Y.Base,
		[],
		{
		},
		{
			/**
			 * Nickname is the SmugMug site nickname to look up, the descriptor for the
			 * root node is returned asynchronously to the handlers in params.on.
			 * 
			 * Provide params.context to set the context object for those handlers.
			 * 
			 * The data is that returned by rpc.thumbnail.folders or rpc.node.getchildnodes.
			 * 
			 * Provide success() and failure() functions in 'on' to receive the result.
			 * 
			 * @param nickname
			 * @param on
			 */
			getRootNode: function(nickname, params) {
				Y.io('http://' + nickname + '.smugmug.com/services/api/json/1.4.0/', {
					data: {
						disableAlbum:1,
						disableEmpty:1,
						disablePages:1,
						nickname : nickname,
						type:"view-folder",
						method:"rpc.thumbnail.folders"
					},
					on: {
						success: function(transactionid, response, arguments) {
							var data = Y.JSON.parse(response.responseText);
							
							if (data && data.Folder) {
								params.on.success.call(params.context || null, data.Folder);
							} else {
								params.on.failure.call(params.context || null);
							}
						},
						failure: function(transactionid, response, arguments) {
							params.on.failure.call(params.context || null);
						}
					}
				});	
			},
			
			/**
			 * Take a list of nodes produced by ss-smugmug-node-enumerator, augment them with parent and children elements so
			 * it may be traversed as a tree, and return a reference to the root node (or null if something goes wrong).
			 * 
			 * @param nodes
			 */
			treeifyNodes: function(nodes) {
				var 
					lowestDepthSeen = null,
					rootNode = null;
				
				for (var nodeID in nodes) {
					var 
						node = nodes[nodeID],
						parent = nodes[node.nodeData.ParentID];
					
					if (lowestDepthSeen === null || node.Depth < lowestDepthSeen) {
						lowestDepthSeen = node.Depth;
						rootNode = node;
					}
					
					if (parent) {
						node.parent = parent;
						
						if (parent.children === undefined) {
							parent.children = {};
						}
						
						parent.children[nodeID] = node;
					}
				}
				
				return rootNode;
			},
			
			/**
			 * Strip out child/parent elements inserted by treeifyNodes
			 */
			untreeifyNodes: function(nodes) {
				for (var nodeID in nodes) {
					var node = nodes[nodeID];
					
					delete node.parent;
					delete node.children;
				}
			},
			
			/**
			 * Extract the initial page data provided to Y.SM.Page.init() from the page source and return it,
			 * or false on failure. 
			 */
			extractPageInitData: function(source) {
				try {
					var matches = source.match(/^\s*Y\.SM\.Page\.init\((.+)\);$/m);
					
					if (matches) {
						return Y.JSON.parse(matches[1]);
						
					}
				} catch (e) {
					// On (JSON parsing) failure, we return false
				}
				
				return false;
			}			
		}
	);
	
	Y.namespace('SherlockPhotography').SmugmugTools = SmugmugTools;
}, '0.0.1', {
	requires: ['base', 'io', 'json']
});