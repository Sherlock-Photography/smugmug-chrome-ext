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