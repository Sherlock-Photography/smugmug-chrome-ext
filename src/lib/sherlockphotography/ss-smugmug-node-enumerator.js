YUI.add('ss-smugmug-node-enumerator', function(Y, NAME) {
	var SmugmugNodeEnumerator = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_nodes: {},
			_queue: null,
			
		    initializer : function(cfg) {
		    	var that = this;
		    	
		    	this._nodes = {};
		    	
		    	this._queue = new Y.SherlockPhotography.APISmartQueue({
		    		processResponse: function(request, response) {
			    		var nodes = response.Nodes;
			    		
						for (var index in nodes) {
							var 
								node = nodes[index],
								seenAlready = that._nodes[node.NodeID] !== undefined;

							if (node.NodeID && !seenAlready) {
								that.fetchNodes(node, request.maxDepth - 1);
							}
						}
						
						return true;
		    		},
		    		responseType: 'json'
		    	});
		    	
		    	this._queue.on({
		    		complete: function() { 
		    			that.fire('complete', {nodes: that._nodes});
		    		},
		    		requestFail: function(e) { 
		    			that.fire('requestFail', e);
		    		},
		    		progress: function(e) { 
		    			that.fire('progress', e);
		    		},
		    	});
		    },
		    	
		    /**
		     * rootNode is a node descriptor returned from e.g. rpc.node.getchildnodes or rpc.thumbnail.folders.
		     * 
		     * @param rootNode
		     */
			fetchNodes: function(rootNode, maxDepth) {
				if (maxDepth === undefined) {
					maxDepth = this.get('maxDepth');
				}
				
				this._nodes[rootNode.NodeID] = {nodeData: rootNode};
				
				if (maxDepth >= 1 && rootNode.HasChildren) {
					this._queue.enqueueRequest({
						url: 'http://' + this.get('domain') + '/services/api/json/1.4.0/',
						data: {
							NodeID: rootNode.NodeID,
							PageSize: 1000,
							method: 'rpc.node.getchildnodes'
						},
						node: this._nodes[rootNode.NodeID],
						maxDepth: maxDepth
					});
				}
				
				this._queue.run();
			}
		}, {	
			ATTRS: {
				//SmugMug domain name we're fetching
				domain : {
					writeOnce: 'initOnly'
				},
				
				//Maximum depth to fetch (1 means just the direct children of the root)
				maxDepth: {
					value: 2
				}
			}
		}
	);
	
	Y.namespace('SherlockPhotography').SmugmugNodeEnumerator = SmugmugNodeEnumerator;
}, '0.0.1', {
	requires: ['io', 'base', 'ss-api-smartqueue']
});