YUI.add('ss-smugmug-node-enumerator', function(Y, NAME) {
	Y.SmugMugNodeEnumerator = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			//Instance members
			_numSuccessfulRequests: 0,
			_numFailedRequests: 0,
			_numOutstandingRequests: 0,
			_nodes: {},

			_queueNodeFetch: function(url, maxDepth, onCompletion) {
				this._numOutstandingRequests++;
				
				this.get('workQueue').add({
					fn: this._recursivelyFetchNodes,
					context: this,
					args: [url, maxDepth, onCompletion],
					timeout: this.get('delayBetweenNodes')
				}).run();
			},
			
			_nodeFetchCompleted: function(success, onCompletion) {
				this._numOutstandingRequests--;
				
				if (success) {
					this._numSuccessfulRequests++;
				} else {
					this._numFailedRequests++;
				}
				
				if (this._numOutstandingRequests == 0) {
					onCompletion(this._nodes);
				}
			},
			
			/* Extract the initial page data provided to  Y.SM.Page.init() */
			_extractPageData: function(source) {
				var matches = source.match(/^\s*Y\.SM\.Page\.init\((.+)\);$/m);
				
				if (matches) {
					return Y.JSON.parse(matches[1]);
				}
				
				return false;
			},
			
			_recursivelyFetchNodes: function(url, maxDepth, onCompletion) {
				if (maxDepth <= 0) {
					this._nodeFetchCompleted(false, onCompletion);
					
					return;
				}
				
				Y.io(url, {
					on: {
						success: function(transactionid, response, arguments) {
							var pageData = this._extractPageData(response.responseText);
							
							if (pageData) {
								this._nodes[pageData.nodeId] = Y.merge(this._nodes[pageData.nodeId], {pageData: pageData});

								if (maxDepth > 1) {
									//Now enumerate the children and recurse
									Y.io('http://' + this.get('domain') + '/services/api/json/1.4.0/', {
										data: {
											NodeID: pageData.nodeId,
											PageSize: 1000,
											method: 'rpc.node.getchildnodes'
										},
										on: {
											success: function(transactionid, response, arguments) {
												var data = JSON.parse(response.responseText);
												
												for (var index in data.Nodes) {
													var node = data.Nodes[index];
													
													if (node.NodeID && node.Url && this._nodes[node.NodeID] === undefined) {
														this._nodes[node.NodeID] = {nodeData: node}; // Store the basic node information from rpc.node.getchildnodes
														
														this._queueNodeFetch(node.Url, maxDepth - 1, onCompletion);
													}
												}
											},
											end: function() {
												/* 
												 * Once we've determined how many children we have, and counted up those outstanding requests,
												 * it's safe to mark this node as done.
												 */
												this._nodeFetchCompleted(true, onCompletion);
											}
										},
										context: this
									});
								} else {
									//We're not fetching our children due to hitting the depth limit
									this._nodeFetchCompleted(false, onCompletion);
								}
							} else {
								//TODO signal an event
								console.log("Failed to fetch " + url);

								this._nodeFetchCompleted(false, onCompletion);
							}
						},
						failure: function() {
							this._nodeFetchCompleted(false, onCompletion);
						}
					},
					context: this
				}); 
			},			
			
			fetchNodes: function(onCompletion) {
				this._queueNodeFetch('http://' + this.get('domain') + '/', 2, onCompletion);
			}
		}, {	
			ATTRS: {
				//SmugMug domain name we're fetching
				domain : {},
				
				//Provide a Y.AsyncQueue to schedule AJAX execution
				workQueue: {},
				
				//Delay in milliseconds between node fetches (be kind to SmugMug!)
				delayBetweenNodes: {
					value: 400
				}
			}
		}
	);
	
}, '0.0.1', {
	requires: ['io', 'base', 'json-parse']
});

YUI().use(['node', 'async-queue', 'io', 'ss-smugmug-node-enumerator'], function(Y) {
	var 
		smugmug_domain = 'n-sherlock.smugmug.com',
		workQueue = new Y.AsyncQueue(),
		nodeEnumerator = new Y.SmugMugNodeEnumerator({domain: smugmug_domain, workQueue: workQueue});

	nodeEnumerator.fetchNodes(function(nodes) {
		console.log(nodes);
	});
	
	workQueue.run();
});