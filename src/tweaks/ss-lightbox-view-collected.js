YUI.add('ss-lightbox-view-collected', function(Y) {
	try {
		var 
			target = Y.SM.Views.Lightbox,
			Patch = function(){
			};
			
		/* 
		 * Attempt to convert the custom domain name we're viewing to its .smugmug.com equivalent, and return the new URL.
		 * 
		 * On failure, the old URL is returned. 
		 */
		function uncustomiseDomain(url) {
			url = url + "";
			
			if (SM.env.pageOwner && SM.env.pageOwner.homepage) {
				url = url.replace(SM.env.pageOwner.homepage, "https://" + SM.env.pageOwner.nickName + ".smugmug.com");
			}
			
			return url;
		}
	
		var origRenderBody = target.prototype._renderBody;
		
		Patch.prototype._renderBody = function() {
	        origRenderBody.call(this);
	        
	        if (window.sherlockPhotographySMForChrome && document.body.className.indexOf('sm-user-owner') > -1 && window.sherlockPhotographySMForChrome.settings["collected-lightbox"]) {
		        var
		        	image = this.get('image');
		        
		        if (image) {
		        	var imageData = image.toJSON();
			        
			        if (imageData.Origin == "Smart" || imageData.Origin == "Collected") {
			        	var
				        	bodyNode = this.getStdModNode(Y.WidgetStdMod.BODY),
				        	collectedDiv = Y.Node.create('<div class="ss-lightbox-image-collection-info sm-lightbox-panel"></div>');
				        	
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
		
				        bodyNode.append(collectedDiv);
			        }
		        }
	        }
	    };
	
		Y.augment(target, Patch, true);
	} catch (e) {
		//Don't break SM if we fail
	}
});
