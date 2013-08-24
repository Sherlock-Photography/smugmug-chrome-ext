YUI.add('ss-smugmug-tools', function(Y) {
	var SmugmugTools = Y.Base.create(
		'ssSmugmugTools',
		Y.Base,
		[],
		{
		},
		{
			/**
			 * Nickname is the SmugMug site nickname to look up, the ID is returned
			 * asynchronously.
			 * 
			 * Provide success() and failure() functions in 'on' to receive the result.
			 * 
			 * @param nickname
			 * @param on
			 */
			getRootNodeID: function(nickname, on) {
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
							
							if (data && data.folderNodeId) {
								on.success(data.folderNodeId);
							} else {
								on.failure();
							}
						},
						failure: function(transactionid, response, arguments) {
							on.failure();
						}
					}
				});	
			}			
		}
	);
	
	Y.namespace('SherlockPhotography').SmugmugTools = SmugmugTools;
}, '0.0.1', {
	requires: ['base', 'io']
});

YUI.add('ss-request-delay-queue', function(Y) {
	
	/**
	 * Subscribe to the 'completed' event to know when all outstanding requests have been completed.
	 */
	var RequestDelayQueue = Y.Base.create(
		'requestDelayQueue',
		Y.Base,
		[],
		{
			//Instance members
			_queue: null,

			/**
			 * Add a callback to be called at a later time.
			 * 
			 * @param fn Callback
			 * @param context Context to be used in call to callback
			 * @param args Array of arguments that will be separately provided to the callback
			 */
			enqueue: function(fn, context, args) {
				this.set('numOutstandingRequests', this.get('numOutstandingRequests') + 1);
				
				this._queue.add({
					fn: fn,
					context: context,
					args: args,
					timeout: this.get('delayBetweenNodes')
				}).run();
			},
			
			/**
			 * Add a queued item back onto the queue (i.e. doesn't increase the number of
			 * outstanding requests, the item is still outstanding)
			 * 
			 * @param fn Callback
			 * @param context Context to be used in call to callback
			 * @param args Array of arguments that will be separately provided to the callback
			 */
			retry: function(fn, context, args) {
				this._queue.add({
					fn: fn,
					context: context,
					args: args,
					timeout: this.get('delayBetweenNodes')
				}).run();
			},			
			
			itemCompleted: function(success) {
				this.set('numOutstandingRequests', this.get('numOutstandingRequests') - 1);
				
				if (success) {
					this.set('numSuccessfulRequests', this.get('numSuccessfulRequests') + 1);
				} else {
					this.set('numFailedRequests', this.get('numFailedRequests') + 1);
				}
				
				if (this.get('numOutstandingRequests') == 0) {
					this.fire("completed");
				}
			},
			
		    initializer : function(cfg) {
		    	this._queue = new Y.AsyncQueue();
		    },			
		}, {	
			ATTRS: {
				//Delay in milliseconds between node fetches (be kind to SmugMug!)
				delayBetweenNodes: {
					value: 400
				},
				
				numFailedRequests: {
					value: 0
				},

				numSuccessfulRequests: {
					value: 0
				},
				
				numOutstandingRequests: {
					value: 0
				},
				
				/* Number of requests that have finished (succeeded or failed */
				numCompletedRequests: {
					getter:function() {
						return this.get('numFailedRequests') + this.get('numSuccessfulRequests'); 
					}
				},
				
				/* Sum of number of completed and number of pending requests */
				numTotalRequests: {
					getter:function() {
						return this.get('numCompletedRequests') + this.get('numOutstandingRequests'); 
					}
				}				
			}
		}
	);
	
	Y.namespace('SherlockPhotography').RequestDelayQueue = RequestDelayQueue;
}, '0.0.1', {
	requires: ['base', 'async-queue']
});

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
											this.fire('failed', {method: "rpc.node.getchildnodes", NodeID: node.NodeID, status: 0, statusText: "Node has children, but children are beyond recursion limit, skipping children"});											
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
		    	
			fetchNodes: function(rootNode) {
				this._workQueue.enqueue(this._recursivelyFetchNodes, this, [rootNode, this.get('maxDepth')]);
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

/* Extract the initial page data provided to  Y.SM.Page.init() */
function extractPageData(source) {
	var matches = source.match(/^\s*Y\.SM\.Page\.init\((.+)\);$/m);
	
	if (matches) {
		return Y.JSON.parse(matches[1]);
	}
	
	return false;
}

YUI().use(['node', 'json', 'io', 'ss-smugmug-tools', 'ss-smugmug-node-enumerator'], function(Y) {
	Y.on('domready', function () {
		var 
			smugmugNickname = 'n-sherlock',
			smugmugDomain = smugmugNickname + '.smugmug.com',
			nodeEnumerator = new Y.SherlockPhotography.SmugmugNodeEnumerator({domain: smugmugDomain}),
			progressDisplay = Y.Node.one('#progress');
	
		nodeEnumerator.on({
			progress: function(progress) {
				progressDisplay.set('text', progress.completed + '/' + progress.total);
			},
			failed: function(e) {
				console.log("Request failed:");
				console.log(e);
			},
			completed: function(e) {
				console.log(e);
			}
		});
		
		//We must begin by finding out the ID of the root node of the domain:
		Y.SherlockPhotography.SmugmugTools.getRootNodeID(smugmugNickname, {
			success: function(rootNodeID) {
				nodeEnumerator.fetchNodes(rootNodeID);
			},
			failure: function() {
				alert("Couldn't find out the ID of the root node of your SmugMug site, are you logged on?");
			}
		});
	});
});