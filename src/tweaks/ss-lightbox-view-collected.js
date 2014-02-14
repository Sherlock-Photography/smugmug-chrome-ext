YUI.add('ss-lightbox-view-collected', function(Y) {	
	var 
		target = Y.SM.Views.Lightbox,
		Patch = function(){
		},
		
		style = Y.Node.create('<style type="text/css"></style>');
		
	style.set('text', '.ss-lightbox-image-collection-info { position:absolute; right:0px; padding:10px 15px; bottom:50px; z-index:4;}'); 
		
	Y.one("head").prepend(style);
	
	var origRenderBody = target.prototype._renderBody;
	
	/* 
	 * Attempt to convert the custom domain name we're viewing to its .smugmug.com equivalent, and return the new URL.
	 * 
	 * On failure, the old URL is returned. 
	 */
	function uncustomiseDomain(url) {
		url = url + "";
		
		if (SM.env.pageOwner && SM.env.pageOwner.homepage) {
			url = url.replace(SM.env.pageOwner.homepage, "http://" + SM.env.pageOwner.nickName + ".smugmug.com");
		}
		
		return url;
	}
		
	Patch.prototype._renderBody = function() {
        origRenderBody.call(this);
        
        var
        	image = this.get('image');
        
        if (image) {
        	var
	        	imageData = image.toJSON(),
	        
	        	bodyNode = this.getStdModNode(Y.WidgetStdMod.BODY),
	        	collectedDiv = Y.Node.create('<div class="ss-lightbox-image-collection-info sm-lightbox-panel"></div>');
	        
	        if (imageData.Origin == "Smart" || imageData.Origin == "Collected") {
	        	if (imageData.PhotoBy.album.name) {
	        		if (imageData.Origin == 'Smart') {
	        			collectedDiv.append('From <a target="_blank"></a> by smart rules');
	        		} else {
	        			collectedDiv.append('Collected from <a target="_blank"></a>');
	        		}
		        	
		        	var galleryLink = collectedDiv.one('a');
		        	
		        	galleryLink.set('href', uncustomiseDomain(imageData.PhotoBy.album.url));
		        	galleryLink.set('text', imageData.PhotoBy.album.name);
	        	} else {
		        	collectedDiv.append("Collected" + (imageData.Origin == "Smart" ? ' here by smart rules': ''));	        		
	        	}
	        }
	        
	        bodyNode.append(collectedDiv);
        }
    };

	Y.augment(target, Patch, true);
});
