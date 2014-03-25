YUI.add('ss-organizer-collected', function(Y) {
	try {
		var 
			target = Y.SM.Organizer.Tiles,
			Patch = function(){
			};
			
		var 
			origRenderImageTile = target.prototype._renderImageTile,
			newImageTileTemplate = Y.Template.Micro.compile(
				'<li id="<%== data.id %>" class="sm-organizer-tile sm-organizer-tile-image<% if (data.tile.Origin == "Smart") { %> ss-tile-smart<% } %><% if (data.tile.Origin == "Collected") { %> ss-tile-collected<% } %><% if (data.tile.IsVideo) { %> sm-organizer-tile-video<% } %>">' +
				
				'<a id="<%== data.id %>-link" class="sm-organizer-tile-link" ' +
				    'href="<%== data.url %>" style="height: <%== data.height %>; width: <%== data.width %>">' +
				
				    '<% if (data.icon) { %>' +
				        '<div role="img" id="<%== data.id %>-image" ' +
				            'class="sm-organizer-image sm-organizer-image-icon" ' +
				            'aria-label="<%= data.title %>" ' +
				            'style="height: <%== data.height %>; width: <%== data.width %>">' +
				
				            '<span class="sm-fonticon sm-fonticon-<%= data.icon %>"></span>' +
				        '</div>' +
				    '<% } else { %>' +
				        '<div role="img" id="<%== data.id %>-image" ' +
				            'class="sm-organizer-image sm-organizer-image-unloaded" ' +
				            'aria-label="<% if (data.tile.IsVideo) { %>Video: <% } %><%= data.title %>" ' +
				            'data-src="<%== data.imageUrl %>" ' +
				            'style="height: <%== data.height %>; width: <%== data.width %>"></div>' +
				
				        '<% if (data.tile.IsVideo) { %>' +
				            '<div role="presentation" class="sm-organizer-tile-icon ' +
				                'sm-fonticon-sml sm-fonticon-VideoCamera"></div>' +
				        '<% } else if (data.tile.IsVault) { %>' +
				            '<div role="presentation" class="sm-organizer-tile-icon ' +
				                'sm-fonticon-sml sm-fonticon-Vault"></div>' +
				        '<% } %>' +
				
				        '<% if (data.isHidden || data.tile.Origin == "Smart"|| data.tile.Origin == "Collected") { %>' +
				            '<div class="sm-organizer-image-overlay" ' +
				                'style="height: <%== data.height %>; width: <%== data.width %>">' +
				
						        '<% if (data.isHidden) { %>' +
						        	'<span class="sm-fonticon sm-fonticon-Hide"></span>' +
						        '<% } else { %>' +
					        		'<span class="sm-fonticon"></span>' +
					        	'<% } %>' +
				            '</div>' +
				        '<% } %>' +
				
				    '<% } %>' +
				'</a>' +
				'</li>'
			);
		
		Patch.prototype._renderImageTile = function(tile) {
	        if (window.sherlockPhotographySMForChrome.config.enable && window.sherlockPhotographySMForChrome.settings["collected-organiser"]
	        	&& tile.data.Status !== 'Preprocess' && !tile.data.IsArchive) {
	        	
	        	var
		        	tileSize = this.imageTileSize,
		            sizeName = this.imageSize,
		            size     = tile.data.Sizes[sizeName],
		            height   = size.height,
		            width    = size.width;
	
		        // Restrict the longest dimension to 100px.
		        if (width > tileSize || height > tileSize) {
		            if (width > height) {
		                height = Math.floor((tileSize / width) * height);
		                width  = tileSize;
		            } else {
		                width  = Math.floor((tileSize / height) * width);
		                height = tileSize;
		            }
		        }
		
		        return newImageTileTemplate({
		            height  : height + 'px',
		            id      : tile.tileId,
		            imageUrl: tile.imageUrl(sizeName),
		            isHidden: tile.isHidden(),
		            tile    : tile.data,
		            title   : tile.name(),
		            url     : tile.url(),
		            width   : width + 'px'
		        });        	
	        } else {
	        	return origRenderImageTile.call(this, tile);
	        }
	    };
	
		Y.augment(target, Patch, true);
	} catch (e) {
		//Don't break SM if we fail
	} 
});
