var tests = [
	{
		name: 'Basic, single word replacement: Keywords',
		
    	Keywords: "hello",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "hello",
    	replace: "world",
    	
    	expected: "world"
	},
	
	{
		name: 'Basic, single word replacement: Title',
		
    	Title: "hello",
    	
    	target: "Title",
    	action: "replace",
    	primary: "hello",
    	replace: "world",
    	
    	expected: "world"
	},
	
	{
		name: 'Basic, single word replacement: Caption',
		
    	Caption: "hello",
    	
    	target: "Caption",
    	action: "replace",
    	primary: "hello",
    	replace: "world",
    	
    	expected: "world"
	},	
	
	{
		name: 'Case insensitivity: Keywords',
		
    	Keywords: "hello",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "hEllO",
    	replace: "World",
    	
    	expected: "World"
	},	

	{
		name: 'Case sensitivity: Title',
		
    	Title: "hello",
    	
    	target: "Title",
    	action: "replace",
    	primary: "hEllO",
    	replace: "World",
    	
    	expected: "hello"
	},	
	
	{
		name: 'Case sensitivity: Caption',
		
    	Title: "hello",
    	
    	target: "Title",
    	action: "replace",
    	primary: "hEllO",
    	replace: "World",
    	
    	expected: "hello"
	},	
		
	
	{
    	Keywords: "hello world",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "hello",
    	replace: "world",
    	
    	expected: "world world"
	},
	
	{
    	Keywords: "world world",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "world",
    	replace: "hello",
    	
    	expected: "hello hello"
	},	
	
	{
    	Keywords: "testing; this",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "this",
    	replace: "this thing",
    	
    	expected: "testing; this thing"
	},
	
	{
    	Keywords: "testing; this thing; out",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "this",
    	replace: "my",
    	
    	expected: "testing; my thing; out"
	},	
	
	{
    	Keywords: "testing; this thing; out",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "thing",
    	replace: "tool",
    	
    	expected: "testing; this tool; out"
	},
	
	{
    	Keywords: "one",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "two",
    	
    	expected: "one; two"
	},
	
	{
    	Keywords: "one",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "twenty three",
    	
    	expected: "one; twenty three"
	},
	
	{
    	Keywords: "one;",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "two",
    	
    	expected: "one; two"
	},		

	{
    	Keywords: "one two",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "three",
    	
    	expected: "one two; three"
	},		
	
	{
		name: "Remove only keyword",
		
    	Keywords: "one",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "one",
    	
    	expected: ""
	},	
	
	{
		name: "Remove final keyword",
		
    	Keywords: "one two; three; four",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "four",
    	
    	expected: "one two; three;"
	},
	
	{
		name: "Remove inner keyword",

    	Keywords: "one two; three; four",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "three",
    	
    	expected: "one two; four"
	},
	
	{
		name: "Remove first keyword",
		
    	Keywords: "one two; three; four",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "one two",
    	
    	expected: "three; four"
	},		
];

YUI().use(['node', 'json', 'querystring-parse-simple', 'ss-event-log-widget',
           'ss-progress-bar', 'ss-api-smartqueue', 'model', 'event-valuechange', 'node-event-simulate',
           'ss-smugmug-bulk-edit-tool', 'ss-csrf-manager'], function(Y) {

	Y.on({
		domready: function() {
			var
				bulkTool = Y.SherlockPhotography.SmugmugBulkEditTool,
				outputList = Y.one("#output");
			
			Y.each(tests, function(test) {
				var testNode = Y.Node.create(
					'<li class="test">' +
						'<dl class="dl-horizontal">' +
							(test.name ? '<h4>' + Y.Escape.html(test.name) + '</h4>' : '') + 
							'<dt>' + Y.Escape.html(test.target) + '</dt>' +
							'<dd><input type="text" value="' + Y.Escape.html(test[test.target]) + '"/></dd>' +
							'<dt>Action</dt>' +
							'<dd>' + Y.Escape.html(test.action) + ' <code>' + Y.Escape.html(test.primary) + '</code> ' + (test.replace ? "with <code>" + Y.Escape.html(test.replace) + '</code>' : '') + '</dd>' +
							'<dt>Result</dt>' +
							'<dd><input type="text" value="' + Y.Escape.html(test[test.target]) + '" class="photo-' + Y.Escape.html(test.target) + '" /></dd>' +
						'</dl>' +
					'</li>');
				
				bulkTool._bulkEditPhotos(new Y.NodeList([testNode]), test.target, test.action, test.primary, test.replace);
				
				if (testNode.one('.photo-' + test.target).get('value') == test.expected) {
					testNode.addClass('pass');
				} else {
					testNode.addClass('fail');
					
					testNode.one('dl').append('<dt>Expected</dt><dd><input type="text" value="' + Y.Escape.html(test.expected) + '"/></dd>');
				}
				
				outputList.append(testNode);
			});
		}
	});
});