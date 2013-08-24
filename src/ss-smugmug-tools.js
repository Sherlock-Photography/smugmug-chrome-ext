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
			 * root node is returned asynchronously to the handlers in 'on'.
			 * 
			 * The data is that returned by rpc.thumbnail.folders or rpc.node.getchildnodes.
			 * 
			 * Provide success() and failure() functions in 'on' to receive the result.
			 * 
			 * @param nickname
			 * @param on
			 */
			getRootNode: function(nickname, on) {
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
								on.success(data.Folder);
							} else {
								on.failure();
							}
						},
						failure: function(transactionid, response, arguments) {
							on.failure();
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
			 * Extract the initial page data provided to Y.SM.Page.init() from the page source. 
			 */
			extractPageInitData: function(source) {
				var matches = source.match(/^\s*Y\.SM\.Page\.init\((.+)\);$/m);
				
				if (matches) {
					return Y.JSON.parse(matches[1]);
				}
				
				return false;
			}			
		}
	);
	
	Y.namespace('SherlockPhotography').SmugmugTools = SmugmugTools;
}, '0.0.1', {
	requires: ['base', 'io', 'json']
});