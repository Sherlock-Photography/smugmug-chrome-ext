YUI.add('ss-tile-base-view-collected', function(Y) {	
	var 
		target = Y.SM.Views.TileBase.Shared,
		Patch = function(){
		};
		
	var origSetupRenderConfig = target.prototype._setupRenderConfig;
		
	Patch.prototype._setupRenderConfig = function(tile) {
        origSetupRenderConfig.call(this, tile);
        
        if (this.get('showStatus')) {
	        var imageModel = null;
	        
	        if (tile instanceof Y.SM.Models.Image) {
	            imageModel = tile;
	        } else if (tile.getRelated) {
	            imageModel = tile.getRelated('Image');
	        }
	        
	        if (imageModel) {
	        	var 
	        		clientId = tile.get('clientId'),
	            	renderConfig = this._renderConfig[clientId],
	            	tileClassNames = [];
	
	        	switch (imageModel.get('Origin')) {
	        		case 'Smart':
		        		tileClassNames.push('ss-tile-smart');
		        		
		        		renderConfig.showStatus = true;
		        		break;
		        	
	        		case 'Collected':
		        		tileClassNames.push('ss-tile-collected');
		        		
		        		renderConfig.showStatus = true;
		        		break;
	        	}
	        	
	        	if (tileClassNames.length) {
	        		renderConfig.tileClassNames = (renderConfig.tileClassNames ? renderConfig.tileClassNames + " " : "") + tileClassNames.join(' '); 
	        	}
	        }
        }
    };

	Y.augment(target, Patch, true);
});
