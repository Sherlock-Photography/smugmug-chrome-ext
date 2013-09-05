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
					timeout: this.get('delayBetweenRequests')
				});
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
				
				var handleSuccessData = function(responseData) {
					var result = this._doProcessResponse(request, responseData);
					
					if (!result || result == 'retry' && !attemptRetry()) {
						this.fire('requestFail', {request: request, status: 0, statusText: "_doProcessResponse failed too many times"});
						
						return false;
					} else {
						this.fire('requestSuccess', {request: request, response: responseData});
						
						return true;
					}
				};

				var 
					responseText = null,
					cacheKey = null;
				
				if (this.get('persistentCache')) {
					cacheKey = Y.Crypto.MD5(request.url + '?' + Y.JSON.stringify(request.data));
					
					responseText = window.localStorage[cacheKey];
				}
				
				if (responseText) {
					//Simulate failures
					if (this.get('simulateFail') && Math.random() < 0.75) {
						if (!attemptRetry()) {
							this.fire('requestFail', {request: request, status: 500, statusText: "Fake error message"});
						}
					} else {
						if (this.get('responseType') == 'json') {
							handleSuccessData.call(this, Y.JSON.parse(responseText));
						} else {
							handleSuccessData.call(this, responseText);
						}
					}
				} else {
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
								
								if (handleSuccessData.call(this, responseData) && this.get('persistentCache')) {
									//Only cache if the data was ingested successfully
									try {
										window.localStorage[cacheKey] = response.responseText;
									} catch (e) {
										//Ignore quota exceeded errors
									}
								}
							},
							failure: function(transactionid, response, arguments) {
								if (!attemptRetry()) {
									this.fire('requestFail', {request: request, status: response.status, statusText: response.statusText});
								}
							}
						},
						headers: request.headers || {},
						method: request.method,
						context: this
					});
				}
			},
			
			run: function() {
				this._reportProgress();
				this._queue.run();
			},
			
		    initializer : function(cfg) {
		    	this._queue = new Y.AsyncQueue();
		    			    	
		    	var self = this;

		    	//Maintain request counts and notify listeners of progress:
		    	this.after({
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
				
				//Only suitable for debugging, as this causes successful responses received to be cached indefinitely
				persistentCache: {
					value: true
				},
				
				//If persistent caching is used, this option simulates failed AJAX requests to test error-handling
				simulateFail: {
					value: false
				},
				
				//How many times will we retry requests upon errors?
				maxRetries: {
					value: 3
				},
				
				//Delay in milliseconds between node fetches (be kind to SmugMug!)
				delayBetweenRequests: {
					value: 200
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
	requires: ['io', 'base', 'json-parse', 'json-stringify', 'async-queue', 'gallery-crypto-md5']
});