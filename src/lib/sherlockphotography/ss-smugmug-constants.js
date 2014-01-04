YUI.add('ss-smugmug-constants', function(Y, NAME) {
	var SmugmugConstants = Y.Base.create(
			NAME,
			Y.Base,
			[],
			{
				
			},
			{
				NodeType: {
					ROOT: 1,
					FOLDER: 2,
					GALLERY: 4,
					SYSTEM_PAGE: 16,
					PAGE: 64
				},
				
				NODE_TYPE_NAMES: {
					1: "Homepage",
					2: "Folder",
					4: "Gallery",
					16: "System page",
					64: "Page"				
				},
			
				GALLERY_STYLE_NAMES: {
					3: "SmugMug",
					17: "Thumbnails",
					18: "Collage Landscape",
					19: "Collage Portrait",
					16: "Journal",
					8: "Slideshow"			
				},
				
				
				//SM's PrivacyLevel field (effective privacy after applying inheritance rules)
				Privacy: {
					PUBLIC: 1,
					UNLISTED: 2,
					PRIVATE: 3
				},				

				PRIVACY_NAMES: {
					1: "Public", 
					2: "Unlisted", 
					3: "Private"
				},
				
				//SM's NodePrivacy field
				NodePrivacy: {
					INHERIT: 1,
					UNLISTED: 2,
					PRIVATE: 3
				},
				
				NODE_PRIVACY_NAMES: {
					1: "Inherit", 
					2: "Unlisted", 
					3: "Private"
				},
				
				NODE_SMUGMUG_SEARCHABLE_NAMES: {
					0: "No",
					1: "Site-setting",
					6: "No - find me by name only",
					7: "No - make me an island",
					8: "Yes - discover me!"
				},
				
				NODE_WORLD_SEARCHABLE_NAMES: {
					0: "No",
					1: "Site-setting",
					2: "Homepage only",
					3: "Yes"
				}
				
			}
		);

	Y.namespace("SherlockPhotography").SmugmugConstants = SmugmugConstants;	
});