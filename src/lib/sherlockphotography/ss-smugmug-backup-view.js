YUI.add('ss-smugmug-backup-view', function(Y, NAME) {
	var SmugmugBackupView = Y.Base.create(NAME, Y.Widget, [], {
		_treeView : null,

		initializer : function(cfg) {
			this._treeView = new Y.TreeView({
				container : "#backup-structure-pane",
				nodes : [ {
					label : 'My Novel',
					children : [ {
						label : 'Chapter One'
					}, {
						label : 'Chapter Two'
					} ]
				} ]
			});
		},

		renderUI : function() {
			this._treeView.render();
		},
	}, {
		ATTRS : {

		}
	});

	Y.namespace("SherlockPhotography").SmugmugBackupView = SmugmugBackupView;
}, '0.0.1', {
	requires : [ 'base', 'widget', 'gallery-sm-treeview', 'escape' ]
});