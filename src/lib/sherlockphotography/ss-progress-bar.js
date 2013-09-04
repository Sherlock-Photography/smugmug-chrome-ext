YUI.add('ss-progress-bar', function(Y, NAME) {
	var ProgressBar = Y.Base.create(
		NAME, 
		Y.Widget, 
		[], 
		{			
			syncUI: function() {
				var 
					contentBox = this.get("contentBox"),
					progressBar = contentBox.one('.progress-bar'),
					percent = this.get('completed') / this.get('total') * 100;
				
				if (this.get('total') > 0) {
					progressBar.setAttribute('aria-valuenow', this.get('completed'));
					progressBar.setAttribute('aria-valuemax', this.get('total'));
					progressBar.setStyle('width', percent + '%');
				}
			},

			renderUI: function() {
				var 
					contentBox = this.get("contentBox");
				
				contentBox.addClass("progress");
				contentBox.append('<div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="1" style="width: 0%;"></div>');
				
				if (this.get('total')) {
					this.syncUI();
				}
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