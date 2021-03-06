YUI.add('ss-api-smartqueue', function(Y, NAME) {
	var APISmartQueue = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
			_queue: null,
			_aborted: false,
			
			/* Requests which have been sent to Y.io and we haven't heard back from */
			_numTrueOutstandingRequests: 0,

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
					// Counts for requests that have completed
					failed: this.get('numFailedRequests'),
					successful: this.get('numSuccessfulRequests'),
					
					// The total number of requests the user queued up
					total: this.get('numTotalRequests')
				};
				
				progress.completed = progress.failed + progress.successful;
				
				// If we've aborted the queue, and all of the requests we issued have now completed...
				if (this._aborted && this._numTrueOutstandingRequests == 0) {
					// Then fail the requests that we never issued (and will now never issue) so we can finish up
					this.set('numFailedRequests', progress.total - progress.successful);
					
					// And recalc the progress report to match:
					progress.failed = this.get('numFailedRequests');
					progress.completed = progress.total;
				}
				
				this.fire('progress', progress);
				
				if (progress.completed >= progress.total) {
					this.fire('complete');
				}
			},
						
			_executeRequest: function(request, retryCount) {
				var 
					self = this,
					cacheable = (request.method || "GET") == "GET",
					retryable = (request.method || "GET") == "GET" || request.method == "POST" && this.get('retryPosts');
				
				/* 
				 * Attempt to queue up a retry of this request. If the maximum number of retries has already
				 * been reached, false is returned instead.
				 */
				var attemptRetry = function() {
					if (retryable && retryCount < self.get('maxRetries') && !self._aborted) {
						//Retry this request later
						self._enqueueCallback(request, retryCount + 1);					
						self._queue.run();
						
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
				
				if (cacheable && this.get('persistentCache')) {
					cacheKey = Y.Crypto.MD5(request.url + '?' + Y.JSON.stringify(request.data));
					
					responseText = window.localStorage[cacheKey];
				}

				/* 
				 * If asked to simulate failures, and we decide this request is failed, don't even make the request to the server.
				 */ 
				if (this.get('simulateFail') && Math.random() < this.get('simulateFail')) {
					this.fire('requestError', {request: request, status: 500, statusText: "Fake error message"});
					
					if (!attemptRetry()) {
						this.fire('requestFail', {request: request, status: 500, statusText: "Fake error message"});
					}
					return;
				}
				
				if (responseText) {
					if (this.get('responseType') == 'json') {
						handleSuccessData.call(this, Y.JSON.parse(responseText));
					} else {
						handleSuccessData.call(this, responseText);
					}
				} else {
					this._numTrueOutstandingRequests++;

					Y.io(request.url, {
						data: request.data || {},
						on: {
							complete: function() {
								self._numTrueOutstandingRequests--;
							},
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
								/* 
								 * Give the caller an early chance to deal with this error, which we're not yet sure if we'll be able to retry.
								 * (i.e. by calling .abort() on us)
								 */
								this.fire('requestError', {request: request, status: response.status, statusText: response.statusText, responseText: response.responseText});
								
								if (!attemptRetry()) {
									this.fire('requestFail', {request: request, status: response.status, statusText: response.statusText, responseText: response.responseText});
								}
							}
						},
						headers: request.headers || {},
						method: request.method,
						context: this
					});
				}
			},
			
			/**
			 * Cancel execution of the remainer of the queue (failure callbacks are not called for these items).
			 */
			abort: function() {
				if (!this._aborted) {
					this._aborted = true;
					this._queue.stop();
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
				
				/**
				 * Only suitable for debugging, as this causes successful responses received to be cached indefinitely, and makes
				 * no attempt to avoid filling up LocalStorage.
				 */
				persistentCache: {
					value: false
				},
				
				/**
				 * This option simulates failed AJAX requests to test error-handling.
				 * 
				 * Set to false to disable failure simulation, or enter a failure probability 0.0 < x <= 1.0 to enable simulation.
				 */
				simulateFail: {
					value: false
				},
				
				//How many times will we retry requests upon errors?
				maxRetries: {
					value: 3
				},
				
				//Set to true to enable retry of POST requests
				retryPosts: {
					value: false
				},
				
				//Delay in milliseconds between requests (be kind to SmugMug!)
				delayBetweenRequests: {
					value: 800
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