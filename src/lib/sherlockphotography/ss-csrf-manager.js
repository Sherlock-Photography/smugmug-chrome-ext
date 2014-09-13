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
					var that = this;
					
					/* 
					 * SmugMug is now blocking access to the /v2!token API endpoint based on the Origin header, 
					 * so we'll have to scrape this from the page source instead:
					 */
					Y.io('http://' + this._domainName + '/', {
						method: 'GET',
						on: {
							success: function(transactionid, response, arguments) {
								var newToken = null, matches, pageDetails;
								
								try {
									if ((matches = response.responseText.match(/^\s*Y\.SM\.Page\.init\(([^\n]+)\);$/m))) {
										pageDetails = JSON.parse(matches[1]);
										
										newToken = pageDetails.csrfToken;
									}									
								} catch (e) {
								}
								
								if (newToken) {
									that._set('token', newToken);
								} else {
									//Don't update the token attribute, just hope that the previous token is still valid.
									newToken = null;
								}
								
								if (callback) {
									callback(newToken);
								}
							},
							failure: function() {
								if (callback) {
									callback(null);
								}
							},
							end: function() {
								that._startTimer();								
							}
						}
					});
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