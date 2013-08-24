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
					this._workQueue.itemCompleted(true, false);
					
					return;
				}
				
				var self = this;
				
				/* 
				 * Attempt to queue up a retry of the fetch of this node. If the maximum number of retries has already
				 * been reached, false is returned instead and the item is marked failed on the queue.
				 */
				var attemptRetry = function() {
					if (!retryCount) 
						retryCount = 1; 
					else
						retryCount++;
					
					if (retryCount <= self.get('maxRetries')) {
						//Try to fetch this node again later
						self._workQueue.retry(self._recursivelyFetchNodes, self, [rootNode, maxDepth, retryCount]);					

						return true;
					}
					
					return false;
				};
				
				Y.io('http://' + this.get('domain') + '/services/api/json/1.4.0/', {
					data: {
						NodeID: rootNode,
						PageSize: 1000,
						method: 'rpc.node.getchildnodes'
					},
					on: {
						success: function(transactionid, response, arguments) {
							var data;
							
							try {
								data = JSON.parse(response.responseText);
							} catch (e) {
								if (!attemptRetry()) {
									//All our retries failed, this node is failed
									this.fire('nodeFail', {outstanding: true, method: "rpc.node.getchildnodes", NodeID: rootNode, status: response.status, statusText: 'Failed to parse JSON'});
								}
								return;
							}
							
							for (var index in data.Nodes) {
								var node = data.Nodes[index];
								
								var seenAlready = this._nodes[node.NodeID] !== undefined;

								if (node.NodeID && !seenAlready) {
									this._nodes[node.NodeID] = {nodeData: node}; // Store the basic node information from rpc.node.getchildnodes
								
									if (node.HasChildren) {
										if (maxDepth <= 1) {
											this.fire('nodeFail', {outstanding: false, method: "rpc.node.getchildnodes", NodeID: node.NodeID, status: 0, statusText: "Recursion limit reached"});											
										} else {
											this._workQueue.enqueue(this._recursivelyFetchNodes, this, [node.NodeID, maxDepth - 1]);
										}
									}
								}
							}
							
							this.fire('nodeSuccess');
						},
						failure: function(transactionid, response, arguments) {
							if (!attemptRetry()) {
								//All our retries failed, this node is failed
								this.fire('nodeFail', {outstanding: true, method: "rpc.node.getchildnodes", NodeID: rootNode, status: response.status, statusText: response.statusText});
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

		    	//Maintain work queue outstanding counts:
		    	this.on({
		    		nodeSuccess: function() { 
		    			self._workQueue.itemCompleted(true, true); 
		    		},
		    		nodeFail: function(e) {
		    			/* 
		    			 * Here we take care that items that failed before they were even queued up don't end up decreasing the
		    			 * count of outstanding requests in the queue:
		    			 */
		    			self._workQueue.itemCompleted(e.outstanding, false); 
		    		}
		    	});
		    	
		    	//Update listeners after each failure or success:
		    	this.after({
		    		nodeSuccess: self._reportProgress,
		    		nodeFail: self._reportProgress
		    	});
		    	
		    	//Ensure listeners get a 100% completed progress report before we tell them it's complete:
		    	this.before('completed', self._reportProgress);

		    	this._workQueue.on('completed', function() {
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