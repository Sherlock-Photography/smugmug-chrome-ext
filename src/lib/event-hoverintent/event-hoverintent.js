YUI.add('event-hoverintent', function(Y) {
	/*!
	 * This is derived from the hoverIntent library for jQuery (developed by Brian Cherne (r7)) which I have
	 * rewritten for use with YUI.
	 * 
	 * Nicholas Sherlock, 2014.06.03
	 */
	
	var isFunction = Y.Lang.isFunction,
	noop = function () {},
	conf = {
	    processArgs: function (args) {
	        // Y.delegate('hover', over, out, '#container', '.filter')
	        // comes in as ['hover', over, out, '#container', '.filter'], but
	        // node.delegate('hover', over, out, '.filter')
	        // comes in as ['hover', over, containerEl, out, '.filter']
	        var i = isFunction(args[2]) ? 2 : 3;
	
	        return (isFunction(args[i])) ? args.splice(i,1)[0] : noop;
	    },
	
	    on: function (node, subscription, notifier, filter) {
	        var args = (subscription.args) ? subscription.args.slice() : [];
	
	        args.unshift(null);
	        
	        // default configuration values
	        var cfg = {
	            interval: 100,
	            sensitivity: 7,
	            timeout: 0
	        };
	
	        // cX, cY = current X and Y position of mouse, updated by mousemove event
	        // pX, pY = previous X and Y position of mouse, set by mouseover and polling interval
	        var cX, cY, pX, pY;
	        	
	        var updateMousePosition = function(e) {
	            cX = e.pageX;
	            cY = e.pageY;
	        };
	
	        var checkMousePosition = function(e) {
	            subscription.hoverIntent_timer = clearTimeout(subscription.hoverIntent_timer);
	            
	            // compare mouse positions to see if they've crossed the threshold
	            if ((Math.abs(pX-cX) + Math.abs(pY-cY) ) < cfg.sensitivity) {
	                if (subscription._mouseMoveHandle) {
	                	subscription._mouseMoveHandle.detach();
	                	delete subscription._mouseMoveHandle;
	                }
	                
	                // remember that we're hovering (so mouseOut can be called)
	                subscription.hoverIntent_over = true;
	                
	                e.phase = 'over';
	                return notifier.fire(e);
	            } else {
	                // set previous coordinates for next time
	                pX = cX; pY = cY;
	                
	                // use self-calling timeout, guarantees intervals are spaced out properly (avoids JavaScript timer bugs)
	                subscription.hoverIntent_timer = setTimeout(function() {
	                	checkMousePosition(e);
                	}, cfg.interval);
	            }
	        };
	
	        subscription._detach = node[(filter) ? "delegate" : "on"]({
	            mouseenter: function (e) {
	                // cancel hoverIntent timer
	                if (subscription.hoverIntent_timer) { 
	                	subscription.hoverIntent_timer = clearTimeout(subscription.hoverIntent_timer); 
                	}
	
	                // set "previous" X and Y position based on initial entry point
	                pX = e.pageX; pY = e.pageY;
	                
	                subscription._mouseMoveHandle = this.on("mousemove", updateMousePosition);
	                
	                // start polling interval (self-calling timeout) to compare mouse coordinates over time
	                if (!subscription.hoverIntent_over) { 
	                	subscription.hoverIntent_timer = setTimeout(function() {
	                		checkMousePosition(e);
                		}, cfg.interval);
                	}
	            },
	            
	            mouseleave: function (e) {
	                // cancel hoverIntent timer
	                if (subscription.hoverIntent_timer) { 
	                	subscription.hoverIntent_timer = clearTimeout(subscription.hoverIntent_timer); 
                	}
	
	                // unbind expensive mousemove event
	                if (subscription._mouseMoveHandle) {
	                	subscription._mouseMoveHandle.detach();
	                	delete subscription._mouseMoveHandle;
	                }
	
	                // if we were hovering, then call the mouseOut function after the specified delay
	                if (subscription.hoverIntent_over) { 
	                	subscription.hoverIntent_timer = setTimeout(function() {
	        	            subscription.hoverIntent_timer = clearTimeout(subscription.hoverIntent_timer);
	        	            subscription.hoverIntent_over = false;
	        	            e.phase = 'out';
	        	            notifier.fire(e);
		                }, cfg.timeout);
                	}
	            }
	        }, filter);
	    },
	
	    detach: function (node, subscription, notifier) {
	        subscription._detach.detach();
	        subscription._mouseMoveHandle.detach();
	    }
	};
	
	conf.delegate = conf.on;
	conf.detachDelegate = conf.detach;
	 
	Y.Event.define("hoverintent", conf);
	
}, '0.0.1', {
    requires: ['event-base', 'event-synthetic']
});