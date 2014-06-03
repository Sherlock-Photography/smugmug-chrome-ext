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
	
	    on: function (node, sub, notifier, filter) {
	        var args = (sub.args) ? sub.args.slice() : [];
	
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
	        	
	        var updateMousePosition = function(ev) {
	            cX = ev.pageX;
	            cY = ev.pageY;
	        };
	
	        var checkMousePosition = function(ev, subscription) {
	            subscription.hoverIntent_t = clearTimeout(subscription.hoverIntent_t);
	            // compare mouse positions to see if they've crossed the threshold
	            if ((Math.abs(pX-cX) + Math.abs(pY-cY) ) < cfg.sensitivity) {
	                if (subscription._mouseMoveHandle) {
	                	subscription._mouseMoveHandle.detach();
	                	delete subscription._mouseMoveHandle;
	                }
	                
	                // set hoverIntent state to true (so mouseOut can be called)
	                subscription.hoverIntent_s = 1;
	                ev.phase = 'over';
	                return notifier.fire(ev);
	            } else {
	                // set previous coordinates for next time
	                pX = cX; pY = cY;
	                // use self-calling timeout, guarantees intervals are spaced out properly (avoids JavaScript timer bugs)
	                subscription.hoverIntent_t = setTimeout(function() {
	                	checkMousePosition(ev, subscription);
                	}, cfg.interval);
	            }
	        };
	
	        sub._detach = node[(filter) ? "delegate" : "on"]({
	            mouseenter: function (e) {
	                // cancel hoverIntent timer if it exists
	                if (sub.hoverIntent_t) { sub.hoverIntent_t = clearTimeout(sub.hoverIntent_t); }
	
	                // set "previous" X and Y position based on initial entry point
	                pX = e.pageX; pY = e.pageY;
	                
	                sub._mouseMoveHandle = this.on("mousemove", updateMousePosition);
	                
	                // start polling interval (self-calling timeout) to compare mouse coordinates over time
	                if (sub.hoverIntent_s != 1) { 
	                	sub.hoverIntent_t = setTimeout(function() {
	                		checkMousePosition(e, sub);
                		}, cfg.interval);
                	}
	            },
	            mouseleave: function (e) {
	                // cancel hoverIntent timer if it exists
	                if (sub.hoverIntent_t) { sub.hoverIntent_t = clearTimeout(sub.hoverIntent_t); }
	
	                // unbind expensive mousemove event
	                if (sub._mouseMoveHandle) {
	                	sub._mouseMoveHandle.detach();
	                	delete sub._mouseMoveHandle;
	                }
	
	                // if hoverIntent state is true, then call the mouseOut function after the specified delay
	                if (sub.hoverIntent_s == 1) { sub.hoverIntent_t = setTimeout(function(){
        	            sub.hoverIntent_t = clearTimeout(sub.hoverIntent_t);
        	            sub.hoverIntent_s = 0;
        	            e.phase = 'out';
        	            notifier.fire(e);
	                } , cfg.timeout );}
	            }
	        }, filter);
	    },
	
	    detach: function (node, sub, notifier) {
	        sub._detach.detach();
	        sub._mouseMoveHandle.detach();
	    }
	};
	
	conf.delegate = conf.on;
	conf.detachDelegate = conf.detach;
	 
	Y.Event.define("hoverintent", conf);
	
}, '0.0.1', {
    requires: ['event-base', 'event-synthetic']
});