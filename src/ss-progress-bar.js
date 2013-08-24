YUI.add('ss-progress-bar', function(Y, NAME) {
	var ProgressBar = Y.Base.create(
		NAME, 
		Y.Widget, 
		[], 
		{			
			syncUI: function() {
				var 
					boundingBox = this.get("boundingBox"),
					contentBox = this.get("contentBox");
				
				if (this.get('total') > 0) {
					contentBox.setStyle('width', Math.round((parseInt(boundingBox.getComputedStyle('width'), 10) * this.get('completed')) / this.get('total')) + 'px');
				}				
			},
		
			appendLog: function(type, message) {
				var entry = new EventLogEntry({type:type, message:message});
				
				this._list.append(entry.get('element'));
				
				return entry;
			},
			
			initializer: function(cfg) {
				var self = this;
				
				this.after('completedChange', function(e) {
					self.syncUI();
				});
			}
		},
		{
			ATTRS : {
				completed: {
					value: 0
				},
				total: {
					value: 1
				}
			}
		}
	);

	Y.namespace("SherlockPhotography").ProgressBar = ProgressBar;
}, '0.0.1', {
	requires : ['base', 'widget']
});