YUI.add('ss-smugmug-tools', function(Y) {
	
	// From http://stackoverflow.com/a/6969486/14431
	function escapeRegExp(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}
	
	var SmugmugTools = Y.Base.create(
		'ssSmugmugTools',
		Y.Base,
		[],
		{
		},
		{
			/**
			 * Nickname is the SmugMug site nickname to look up, the descriptor for the
			 * root node is returned asynchronously to the handlers in params.on.
			 * 
			 * Provide params.context to set the context object for those handlers.
			 * 
			 * The data is that returned by rpc.thumbnail.folders or rpc.node.getchildnodes.
			 * 
			 * Provide success() and failure() functions in 'on' to receive the result.
			 * 
			 * @param nickname
			 * @param on
			 */
			getRootNode: function(nickname, params) {
				Y.io('http://' + nickname + '.smugmug.com/services/api/json/1.4.0/', {
					data: {
						disableAlbum:1,
						disableEmpty:1,
						disablePages:1,
						nickname : nickname,
						type:"view-folder",
						method:"rpc.thumbnail.folders"
					},
					on: {
						success: function(transactionid, response, arguments) {
							var data = Y.JSON.parse(response.responseText);
							
							if (data && data.Folder) {
								params.on.success.call(params.context || null, data.Folder);
							} else {
								params.on.failure.call(params.context || null);
							}
						},
						failure: function(transactionid, response, arguments) {
							params.on.failure.call(params.context || null);
						}
					}
				});	
			},
			
			/**
			 * Take a list of nodes produced by ss-smugmug-node-enumerator, augment them with parent and children elements so
			 * it may be traversed as a tree, and return a reference to the root node (or null if something goes wrong).
			 * 
			 * @param nodes
			 */
			treeifyNodes: function(nodes) {
				var 
					lowestDepthSeen = null,
					rootNode = null;
				
				for (var nodeID in nodes) {
					var 
						node = nodes[nodeID],
						parent = nodes[node.nodeData.ParentID];
					
					if (lowestDepthSeen === null || node.Depth < lowestDepthSeen) {
						lowestDepthSeen = node.Depth;
						rootNode = node;
					}
					
					if (parent) {
						node.parent = parent;
						
						if (parent.children === undefined) {
							parent.children = {};
						}
						
						parent.children[nodeID] = node;
					}
				}
				
				return rootNode;
			},
			
			/**
			 * Strip out child/parent elements inserted by treeifyNodes
			 */
			untreeifyNodes: function(nodes) {
				for (var nodeID in nodes) {
					var node = nodes[nodeID];
					
					delete node.parent;
					delete node.children;
				}
			},
			
			/**
			 * Extract the initial page data provided to Y.SM.Page.init() from the page source and return it,
			 * or false on failure. 
			 */
			extractPageInitData: function(source) {
				try {
					var matches = source.match(/^\s*Y\.SM\.Page\.init\((.+)\);$/m);
					
					if (matches) {
						return Y.JSON.parse(matches[1]);
						
					}
				} catch (e) {
					// On (JSON parsing) failure, we return false
				}
				
				return false;
			},		
			
			/**
			 * Creates a permalink for given gallery described with the nodedata in gallerynode, or returns false if a link could not be created.
			 * 
			 * Supply the optional lightboxUrl which is the complete URL for the open lightbox if you want to include the lightbox data in the URL, or false otherwise.
			 * 
			 * Supply the SmugMug user data object from the HTML as loggedInUser if you want to use the custom domain name from there, false otherwise (currently
			 * this looks for keys 'nickName' and 'homepage' which is http://... ).
			 */
			createGalleryPermalink: function(galleryNode, lightboxUrl, loggedInUser) {
				if (!galleryNode.Url)
					return false;
				
				var 
					pl = galleryNode.Url;
				
				if (galleryNode.RemoteID && galleryNode.RemoteKey) {
					//Remove NodeID from the end of the URL for unlisted galleries (albumID/albumKey substitutes for that)
					pl = pl.replace(new RegExp("/n-" + escapeRegExp(galleryNode.NodeID) + "$"), "");
					
					//Add the old-style SmugMug albumID/albumKey to the end
					pl = pl + "/" + galleryNode.RemoteID + "_" + galleryNode.RemoteKey;
					
					if (lightboxUrl) {
						//Does the supplied lightbox URL correspond to a location inside this gallery?
						var 
							pageUrl = galleryNode.Url.replace(/\/$/, ""), //Remove trailing backslash
							matches = lightboxUrl.match(new RegExp("^" + escapeRegExp(pageUrl) + "/i-([0-9a-zA-Z]+)(?:/([A-Z0-9]{1,2}))?$"));
						
						if (matches) {
							/* When the gallery URL is correct, SmugMug does a 301 permanent to the vanilla gallery URL, discarding
							 * the query string. The New SmugMug gallery then interprets the hashbang arguments and opens the lightbox. 
							 * 
							 * When the gallery URL is incorrect, SmugMug loads a special gallery-404 page to examine the hash with
							 * JS (which the SM server couldn't see on its own).
							 * 
							 * The query string part (?) ends up being examined as well as the hash (I think accidentally). The information
							 * in the query string causes a redirect to a URL like /r-KT1a1j/XL.
							 * 
							 * When it arrives at the new-SmugMug gallery router, this gets converted to /i-KT1a1j/XL which opens the lightbox.
							 */
							if (matches[2]) { // Lightbox size
								pl = pl + "?k=" + matches[1] + "&lb=1&s=" + matches[2] + "#!/i-" + matches[1] + "/" + matches[2];
							} else { // SmugMug-style image selected
								pl = pl + "?k=" + matches[1] + "#!/i-" + matches[1];						
							}
						}
					}
				}
				
				//Attempt to switch the link to use the user's custom domain
				if (loggedInUser && loggedInUser.homepage && !loggedInUser.homepage.match(/\.smugmug\.com$/)) {
					pl = pl.replace(new RegExp("^http://" + loggedInUser.nickName + "\.smugmug\.com"), loggedInUser.homepage);
				}
				
				return pl;
			}
		}
	);
	
	Y.namespace('SherlockPhotography').SmugmugTools = SmugmugTools;
}, '0.0.1', {
	requires: ['base', 'io', 'json']
});