YUI.add('ss-smugmug-node-enumerator', function(Y, NAME) {
	var SmugmugNodeEnumerator = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			//Prototype members
			_nodes: null,
			_queue: null,

	    	_processResponse: function(request, response) {
	    		var nodes = response.Nodes;
	    		
				for (var index in nodes) {
					var node = nodes[index];
					
					var seenAlready = this._nodes[node.NodeID] !== undefined;

					if (node.NodeID && !seenAlready) {
						this.fetchNodes(node, request.maxDepth - 1);
					}
				}
				
				return true;
	    	},
			
		    initializer : function(cfg) {
		    	var self = this;
		    	
		    	this._nodes = {};
		    	
		    	this._queue = new Y.SherlockPhotography.APISmartQueue({
		    		processResponse: function(request, response) {
		    			return self._processResponse(request, response);
		    		},
		    		responseType: 'json'
		    	});
		    	
		    	this._queue.on({
		    		complete: function() { 
		    			self.fire('complete', {nodes: self._nodes});
		    		},
		    		requestFail: function(e) { 
		    			self.fire('requestFail', e);
		    		},
		    		progress: function(e) { 
		    			self.fire('progress', e);
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
			}
		}, {	
			ATTRS: {
				//SmugMug domain name we're fetching
				domain : {
					writeOnce: 'initOnly'
				},
				
				//Maximum depth to fetch (1 means just the root)
				maxDepth: {
					value: 2
				}
			}
		}
	);
	
	Y.namespace('SherlockPhotography').SmugmugNodeEnumerator = SmugmugNodeEnumerator;
}, '0.0.1', {
	requires: ['io', 'base', 'json-parse', 'ss-api-smartqueue']
});