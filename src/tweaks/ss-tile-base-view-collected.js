YUI.add('ss-tile-base-view-collected', function(Y) {
	try {
		var 
			target = Y.SM.Views.TileBase.Shared,
			Patch = function(){
			};
			
		var origSetupRenderConfig = target.prototype._setupRenderConfig;
			
		Patch.prototype._setupRenderConfig = function(tile) {
	        origSetupRenderConfig.call(this, tile);
	
	        if (window.sherlockPhotographySMForChrome && document.body.className.indexOf('sm-user-owner') > -1 && window.sherlockPhotographySMForChrome.settings["collected-thumbnail"] && this.get('showStatus')) {
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
	
		Y.mix(target, Patch, true, null, 1);
	
		//Y.SM.Views.Tile might already have extended from Y.SM.Views.TileBase.Shared, so we need to patch that too:
		if (Y.SM.Views.Tile) {
			Y.mix(Y.SM.Views.Tile, Patch, true, null, 1);
		}
		
		if (Y.SM.Views.Tiles && Y.SM.Views.Tiles.Layout && Y.SM.Views.Tiles.Layout.Base) {
			Y.mix(Y.SM.Views.Tiles.Layout.Base, Patch, true, null, 1);
		}
	} catch (e) {
		//Don't break SM if we fail
	}
});