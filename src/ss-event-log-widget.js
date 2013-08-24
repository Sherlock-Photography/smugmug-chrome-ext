YUI.add('ss-event-log-widget', function(Y, NAME) {

	var EventLogEntry = Y.Base.create(
		'ss-event-log-entry',
		Y.Base,
		[],
		{
			_logTypeToClassname: function(type) {
				var classname;
				
				switch (type) {
					case 'error':
					case 'warning':
					case 'info':
						classname = type;
						break;
					default:
						classname = 'info'; 
				}
				
				return 'log-' + classname;
			},
			
			init: function(cfg) {
				this.after('textChange', function(e) {
					this.get('element').set('text', e.newVal);
				});
				
				var element = Y.Node.create('<li class="' + this._logTypeToClassname(cfg.type) + '"></li>');
				
				this.set('element', element);
				this.set('text', cfg.message);
			}
		},
		{
			ATTRS: {
				element : {
					value: null,
					writeOnce: 'initOnly'
				},
				text: {}
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
				
				this._list = Y.Node.create('<ul></ul>');
				
				contentBox.append(this._list);
			},
		
			appendLog: function(type, message) {
				var entry = new EventLogEntry({type:type, message:message});
				
				this._list.append(entry.get('element'));
				
				return entry;
			}
		},
		{
			ATTRS : {
				
			}
		}
	);

	Y.namespace("SherlockPhotography").EventLogEntry = EventLogEntry;
	Y.namespace("SherlockPhotography").EventLogWidget = EventLogWidget;
}, '0.0.1', {
	requires : ['base', 'widget']
});