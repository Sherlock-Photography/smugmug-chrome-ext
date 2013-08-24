YUI.add('ss-smugmug-node-enumerator', function(Y, NAME) {
	/**
	 * Events: progress, completed
	 */
	var SmugmugNodeEnumerator = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			//Prototype members
			_nodes: null,
			
			_reportProgress: function() {
				this.fire('progress', {completed: this._workQueue.get('numCompletedRequests'), total: this._workQueue.get('numTotalRequests')});
			},
			
			_recursivelyFetchNodes: function(rootNode, maxDepth, retryCount) {
				if (maxDepth <= 0) {
					this._workQueue.itemCompleted(false);
					
					return;
				}
				
				Y.io('http://' + this.get('domain') + '/services/api/json/1.4.0/', {
					data: {
						NodeID: rootNode,
						PageSize: 1000,
						method: 'rpc.node.getchildnodes'
					},
					on: {
						success: function(transactionid, response, arguments) {
							var data = JSON.parse(response.responseText);
							
							for (var index in data.Nodes) {
								var node = data.Nodes[index];
								
								var seenAlready = this._nodes[node.NodeID] !== undefined;

								if (node.NodeID && !seenAlready) {
									this._nodes[node.NodeID] = {nodeData: node}; // Store the basic node information from rpc.node.getchildnodes
								
									if (node.HasChildren) {
										if (maxDepth <= 1) {
											this.fire('failed', {method: "rpc.node.getchildnodes", NodeID: node.NodeID, status: 0, statusText: "Recursion limit reached"});											
										} else {
											this._workQueue.enqueue(this._recursivelyFetchNodes, this, [node.NodeID, maxDepth - 1]);
										}
									}
								}
							}
							
							this._workQueue.itemCompleted(true);
							this._reportProgress();
						},
						failure: function(transactionid, response, arguments) {
							if (!retryCount) 
								retryCount = 1; 
							else
								retryCount++;
							
							if (retryCount > this.get('maxRetries')) {
								//All our retries failed, this node is failed
								this._workQueue.itemCompleted(false);
								this.fire('failed', {method: "rpc.node.getchildnodes", NodeID: rootNode, status: response.status, statusText: response.statusText});
								
								this._reportProgress();
							} else {
								//Try to fetch this node again later
								this._workQueue.retry(this._recursivelyFetchNodes, this, [rootNode, maxDepth, retryCount]);
							}
						}
					},
					context: this
				});
			},
			
		    initializer : function(cfg) {
		    	this._workQueue = new Y.SherlockPhotography.RequestDelayQueue();
		    	this._nodes = {};
		    	
		    	var self = this;
		    	
		    	this._workQueue.on('completed', function() {
		    		self._reportProgress();
		    		
		    		self.fire('completed', {nodes: self._nodes});
		    	});
		    },
		    	
		    /**
		     * rootNode is a node descriptor returned from e.g. rpc.node.getchildnodes or rpc.thumbnail.folders.
		     * 
		     * @param rootNode
		     */
			fetchNodes: function(rootNode) {
				this._nodes[rootNode.NodeID] = {nodeData: rootNode};
				
				this._workQueue.enqueue(this._recursivelyFetchNodes, this, [rootNode.NodeID, this.get('maxDepth')]);
			}
		}, {	
			ATTRS: {
				//SmugMug domain name we're fetching
				domain : {},
				
				//Maximum depth to fetch (1 means just the root)
				maxDepth: {
					value: 2
				},
				
				//How many times will we try to fetch the same resource upon error?
				maxRetries: {
					value: 3
				}
			}
		}
	);
	
	Y.namespace('SherlockPhotography').SmugmugNodeEnumerator = SmugmugNodeEnumerator;
}, '0.0.1', {
	requires: ['io', 'base', 'json-parse', 'ss-request-delay-queue']
});