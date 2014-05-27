YUI.add('ss-event-log-widget', function(Y, NAME) {

	var EventLogEntry = Y.Base.create(
		'ss-event-log-entry',
		Y.Base,
		[],
		{
			_progressBar: null,
			
			_logTypeToClassname: function(type) {
				var classname;
				
				switch (type) {
					case 'error':
					case 'warning':
						classname = type;
						break;
					default:
						classname = 'info'; 
				}
				
				return 'log-' + classname;
			},
			
			_uiSyncProgress: function() {
				var progress = this.get('progress');
				
				if (progress) {
					if (!this._progressBar) {
						if (progress.total > 0) {
							this._progressBar = new Y.SherlockPhotography.ProgressBar(progress);
							this._progressBar.render(this.get('element'));
						}
					} else {
						this._progressBar.set('total', progress.total);
						this._progressBar.set('completed', progress.completed);
					}
				} else if (this._progressBar) {
					this._progressBar.destroy(true);
					this._progressBar = null;
				}
			},
			
			_uiSyncMessage: function() {
				this.get('element').one('> .message').set('text', this.get('message'));
			},
			
			render: function() {
				element = Y.Node.create('<li class="' + (this.get('type') == 'error' ? 'alert-danger' : '') + '"><span class="message"></span></li>');

				this.set('element', element);

				this._uiSyncMessage();
				this._uiSyncProgress();
				
				return element;
			},
									
			initializer: function(cfg) {
				this.after({
					progressChange: Y.bind(this._uiSyncProgress, this),
					
					messageChange: Y.bind(this._uiSyncMessage, this),
					
					elementChange: function(e) {
						if (e.prevVal) {
							e.prevVal.replace(e.newVal);
						}
					}
				});
				
				this.render();
			},
			
			destructor: function() {
				this.get('element').remove(true);
			}
		},
		{
			ATTRS: {
				element : {
					value: null
				},
				type: {},
				message: {},
				
				progress: {
					value: null
				}
			}
		}
	);
	
	var EventLogWidget = Y.Base.create(
		NAME, 
		Y.Widget, 
		[], 
		{
			_list: null,
			
			renderUI: function() {
				var contentBox = this.get("contentBox");
				
				this._list = Y.Node.create('<ul class="list-unstyled"></ul>');
				
				contentBox.append(this._list);
			},
		
			clear: function() {
				this._list.get('childNodes').remove();
			},			
			
			appendLog: function(type, message) {
				if (type != 'info') {
					//As soon as something goes wrong, log everything
					this.set('maximumInfoHistory', 1000);
				}
				
				if (this._list.get('children').size() >= this.get('maximumInfoHistory')) {
					this._list.one('*').remove();
				}
				
				var entry = new EventLogEntry({type:type, message:message});
				
				this._list.append(entry.get('element'));
				
				this._list.getDOMNode().scrollTop = this._list.getDOMNode().scrollHeight;
				
				return entry;
			}
		},
		{
			ATTRS : {
				/**
				 * Only bother keeping a set number of Info level entries in a row.
				 */
				maximumInfoHistory: {
					value: 1 
				}
			}
		}
	);

	Y.namespace("SherlockPhotography").EventLogEntry = EventLogEntry;
	Y.namespace("SherlockPhotography").EventLogWidget = EventLogWidget;
}, '0.0.1', {
	requires : ['base', 'widget', 'escape']
});