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
					
					Y.io('http://' + this._domainName + '/api/v2!token', {
						method: 'POST',
						headers: {
							'Accept': 'application/json'
						},
						on: {
							success: function(transactionid, response, arguments) {
								var newToken = null, data;
								
								try {
									data = JSON.parse(response.responseText);
									
									newToken = data.Response.Token.Token;
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