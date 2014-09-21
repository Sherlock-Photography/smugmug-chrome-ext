YUI.add('ss-csrf-manager', function(Y, NAME) {
	/**
	 * Handles retrieving and keeping the SmugMug CSRF token up to date
	 */
	
	var 
		CSRFManager = Y.Base.create(
			NAME,
			Y.Base,
			[],
			{
				_refreshTimer: null,
				_domainName: null,
				
				_startTimer: function() {
					if (this._refreshTimer) {
						clearTimeout(this._refreshTimer);
					}
					
					/*
					 * In their code, SmugMug refreshes the CSRF token every hour. I'm going to assume that the
					 * token actually expires on the server after exactly an hour, so I'm going to refresh more 
					 * frequently than that.
					 */ 
					this._refreshTimer = setTimeout(Y.bind(this.refreshToken, this), 30 * 60 * 1000);
				},
				
				_fetchToken: function(callback) {
					var 
						that = this,
						done = false;
					
					/* 
					 * SmugMug is performing CORS authentication on requests made to /api/v2!token, and requests
					 * with an Origin pointing to our Chrome extension will never be authorised. So pass the request
					 * on to any SmugMug tabs we have open and have them execute the request for us instead. That'll
					 * cause the Origin to be correct and pass CORS inspection.
					 */ 
					chrome.tabs.query({}, function(tabs) {
						var i;
						
						for (i = 0; i < tabs.length; i++) {
							chrome.tabs.sendMessage(tabs[i].id, {
								method: "getToken",
								domain: that._domainName
							}, function(response) {
								if (response && !done) {
									done = true;
									
									var newToken = null;
									
									try {
										newToken = response.Response.Token.Token;
									} catch(e) {
									}
									
									if (newToken) {
										done = true;
										that._set('token', newToken);

										if (callback) {
											callback(newToken);
										}
									}
								}
							});
						}
					});
					
					// Give the requests some time to complete before declaring failure.
					setTimeout(function() {
						if (!done && callback) {
							done = true;
							callback(null);
						}
						
						//Whether we succeeded or not, schedule the next token fetch  
						that._startTimer();
					}, 5000);
				},

				refreshToken: function() {
					//We'll ignore errors and assume our next refresh will succeed before the current token expires
					this._fetchToken(); 
				},
				
				start: function(domainName, callback) {
					if (!callback) {
						throw "You must supply a callback in order to register for the initial token ready event.";
					}
					if (!domainName) {
						throw "domainName is a required parameter";
					}
					
					this._domainName = domainName;
					
					this._fetchToken(callback);
				},				
			}, {
				ATTRS: {
					token: {
						value: null,
						readOnly: true,
					}
				}
			}
		);
	Y.namespace("SherlockPhotography").CSRFManager = new CSRFManager();
}, '0.0.1', {
	requires : ['base', 'io']
});	