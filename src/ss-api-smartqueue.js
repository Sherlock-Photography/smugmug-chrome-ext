YUI.add('ss-api-smartqueue', function(Y, NAME) {
	var APISmartQueue = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_queue: null,

			/* Default implementation that you may override */
			_doProcessResponse: function(request, response) {
				return this.get('processResponse')(request, response);
			},
			
			_enqueueCallback: function(request, retryCount) {
				this._queue.add({
					fn: this._executeRequest,
					context: this,
					args: [request, retryCount],
					timeout: this.get('delayBetweenNodes')
				}).run();
			},		
			
			_reportProgress: function() {
				var progress = {
					completed: this.get('numCompletedRequests'),
					total: this.get('numTotalRequests'),
				};
				
				this.fire('progress', progress);
				
				if (progress.completed >= progress.total) {
					this.fire('complete');
				}
			},
						
			_executeRequest: function(request, retryCount) {
				var self = this;
				
				/* 
				 * Attempt to queue up a retry of this request. If the maximum number of retries has already
				 * been reached, false is returned instead.
				 */
				var attemptRetry = function() {
					if (retryCount < self.get('maxRetries')) {
						//Retry this request later
						self._enqueueCallback(request, retryCount + 1);					

						return true;
					}
					
					return false;
				};
				
				Y.io(request.url, {
					data: request.data || {},
					on: {
						success: function(transactionid, response, arguments) {
							var responseData;
							
							if (this.get('responseType') == 'json') {
								try {
									responseData = JSON.parse(response.responseText);
								} catch (e) {
									if (!attemptRetry()) {
										//All our retries failed, this request failed
										this.fire('requestFail', {request: request, status: 0, statusText: 'Failed to parse JSON in response'});
									}
									return;
								}
							} else {
								responseData = response.responseText;
							}
							
							var result = this._doProcessResponse(request, responseData);
							
							if (!result || result == 'retry' && !attemptRetry()) {
								this.fire('requestFail', {request: request});
							} else {
								this.fire('requestSuccess', {request: request, response: responseData});
							}
						},
						failure: function(transactionid, response, arguments) {
							if (!attemptRetry()) {
								this.fire('requestFail', {request: request, response: "[" + response.status + "] " + response.statusText});
							}
						}
					},
					context: this
				});
			},
			
		    initializer : function(cfg) {
		    	this._queue = new Y.AsyncQueue();
		    	
		    	var self = this;

		    	//Maintain request counts and notify listeners of progress:
		    	this.on({
		    		requestSuccess: function() {
						self.set('numSuccessfulRequests', self.get('numSuccessfulRequests') + 1);
						self._reportProgress();
		    		},
		    		requestFail: function(e) {
						self.set('numFailedRequests', self.get('numFailedRequests') + 1);
						self._reportProgress();
		    		}
		    	});   	
		    },
		    
		    enqueueRequest: function(request) {
				this.set('numTotalRequests', this.get('numTotalRequests') + 1);
				
				this._enqueueCallback(request, 0);
			}
		}, {
			ATTRS: {
				processResponse: {
					writeOnce: 'initOnly',
					value: null
				},
				
				/**
				 * One of json, html
				 */
				responseType: {
					value: 'json'
				},
				
				//How many times will we retry requests upon errors?
				maxRetries: {
					value: 3
				},
				
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
								
				/* Number of requests that have finished (succeeded or failed */
				numCompletedRequests: {
					getter:function() {
						return this.get('numFailedRequests') + this.get('numSuccessfulRequests'); 
					}
				},

				numOutstandingRequests: {
					getter:function() {
						return this.get('numTotalRequests') - this.get('numCompletedRequests'); 
					}
				},

				numTotalRequests: {
					value: 0
				}				
			}
		}
	);
	
	Y.namespace('SherlockPhotography').APISmartQueue = APISmartQueue;
}, '0.0.1', {
	requires: ['io', 'base', 'json-parse', 'async-queue']
});