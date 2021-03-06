var tests = [
	{
		name: 'Basic replacement: Keywords',
		
    	Keywords: "hello",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "hello",
    	replace: "world",
    	
    	expected: "world"
	},
	
	{
		name: 'Basic replacement: Title',
		
    	Title: "hello",
    	
    	target: "Title",
    	action: "replace",
    	primary: "hello",
    	replace: "world",
    	
    	expected: "world"
	},
	
	{
		name: 'Basic replacement: Caption',
		
    	Caption: "hello",
    	
    	target: "Caption",
    	action: "replace",
    	primary: "hello",
    	replace: "world",
    	
    	expected: "world"
	},	
	
	{
		name: 'Replace case insensitivity: Keywords',
		
    	Keywords: "hello",
    	
    	target: "Keywords",
    	action: "replace",
    	primary: "hEllO",
    	replace: "World",
    	
    	expected: "World"
	},	

	{
		name: 'Replace case sensitivity: Title',
		
    	Title: "hello",
    	
    	target: "Title",
    	action: "replace",
    	primary: "hEllO",
    	replace: "World",
    	
    	expected: "hello"
	},	
	
	{
		name: 'Replace case sensitivity: Caption',
		
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
		name: "Replace multiple fragments in the same keyword",
		
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
		name: "Add keyword",
		
    	Keywords: "one",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "two",
    	
    	expected: "one; two"
	},
	
	{
		name: "Add keyword that already exists",
		
    	Keywords: "one; two three; four",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "two three",
    	
    	expected: "one; two three; four"
	},	
	
	{
		name: "Add single-word keyword to empty field",
		
    	Keywords: "",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "fifty",
    	
    	expected: "fifty"
	},		
	
	{
		name: "Add multi-word keyword to empty field",
		
    	Keywords: "",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "fifty five",
    	
    	expected: "\"fifty five\""
	},
	
	{
		name: "Add multiple keywords to empty field",
		
    	Keywords: "",
    	
    	target: "Keywords",
    	action: "add",
    	primary: "one, two; three",
    	
    	expected: "one, two; three"
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
		name: "Add to: caption",
		
    	Caption: "This is a photo",
    	
    	target: "Caption",
    	action: "add",
    	primary: "lol",
    	
    	expected: "This is a photo lol"
	},
	
	{
		name: "Add to: title",
		
    	Title: "This is a photo",
    	
    	target: "Title",
    	action: "add",
    	primary: "lol",
    	
    	expected: "This is a photo lol"
	},	
	
	{
		name: "Add to: caption (trailing whitespace)",
		
    	Caption: "This is a photo ",
    	
    	target: "Caption",
    	action: "add",
    	primary: "lol",
    	
    	expected: "This is a photo lol"
	},
	
	{
		name: "Add to: title (trailing whitespace)",
		
    	Title: "This is a photo ",
    	
    	target: "Title",
    	action: "add",
    	primary: "lol",
    	
    	expected: "This is a photo lol"
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
	
	{
		name: "Remove keyword fragment (final word)",
		
    	Keywords: "one two; three; four",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "two",
    	
    	expected: "one; three; four"
	},
	
	{
		name: "Remove keyword fragment (first word)",
		
    	Keywords: "one two; three; four",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "one",
    	
    	expected: "two; three; four"
	},
	
	{
		name: "Remove keyword fragment (inner word)",
		
    	Keywords: "one two three; four",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "two",
    	
    	expected: "one three; four"
	},			
	
	{
		name: "Remove keyword fragment (trailing word fragment)",
		
    	Keywords: "hello onetwo there;",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "two",
    	
    	expected: "hello one there;"
	},
	
	{
		name: "Remove keyword fragment (leading word fragment)",
		
    	Keywords: "hello onetwo there;",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "one",
    	
    	expected: "hello two there;"
	},	
	
	{
		name: "Remove keyword fragment (inner word fragment)",
		
    	Keywords: "hello onetwo there;",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "etw",
    	
    	expected: "hello ono there;"
	},
	
	{
		name: "Remove keyword fragment (user supplies explicit trailing space)",
		
    	Keywords: "one two three;",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: "two ",
    	
    	expected: "one three;"
	},
	
	{
		name: "Remove keyword fragment (user supplies explicit surrounding space)",
		
    	Keywords: "one two three;",
    	
    	target: "Keywords",
    	action: "remove",
    	primary: " two ",
    	
    	expected: "onethree;"
	},				
	
	{
		name: "Set to",
		
    	Keywords: "one two; three; four",
    	
    	target: "Keywords",
    	action: "set",
    	primary: "hello world",
    	
    	expected: "hello world"
	},
	
	{
		name: "Erase",
		
    	Keywords: "one two; three; four",
    	
    	target: "Keywords",
    	action: "erase",
    	
    	expected: ""
	},

	{
		name: "Remove numeric: Keywords",
		
		Keywords: "hello there; 1234; 5",
		
		target: "Keywords",
		action: "remove-numeric",
		
		expected: "hello there;"
	},
	
	{
		name: "Remove numeric: Keywords",
		
		Keywords: "1234 5",
		
		target: "Keywords",
		action: "remove-numeric",
		
		expected: ""
	},
	
	{
		name: "Remove numeric: Caption",
		
		Caption: "2008",
		
		target: "Caption",
		action: "remove-numeric",
		
		expected: ""
	},	
	
	{
		name: "Remove numeric: Caption fragment",
		
		Caption: "In AD 2101 war was beginning",
		
		target: "Caption",
		action: "remove-numeric",
		
		expected: "In AD 2101 war was beginning"
	},
	
	{
		name: "Remove numeric: Title",
		
		Title: "2008",
		
		target: "Title",
		action: "remove-numeric",
		
		expected: ""
	},	
	
	{
		name: "Remove numeric: Title fragment",
		
		Title: "In AD 2101 war was beginning",
		
		target: "Title",
		action: "remove-numeric",
		
		expected: "In AD 2101 war was beginning"
	},
	
	{
		name: "Add nothing: Keywords",
		
		Keywords: "test; this",
		
		target: "Keywords",
		action: "add",
		primary: "",
		
		expected: "test; this"
	},
	
	{
		name: "Replace nothing: Keywords",
		
		Keywords: "test; this",
		
		target: "Keywords",
		action: "add",
		primary: "",
		replace: "lol",
		
		expected: "test; this"
	},	

	{
		name: "Remove nothing: Keywords",
		
		Keywords: "test; ;; this",
		
		target: "Keywords",
		action: "remove",
		primary: "",
		
		expected: "test; ;; this"
	},		
];

YUI().use(['node', 'ss-smugmug-bulk-edit-tool'], function(Y) {
	Y.on({
		domready: function() {
			var
				bulkTool = Y.SherlockPhotography.SmugmugBulkEditTool,
				outputList = Y.one("#output"),
				
				failures = 0, successes = 0;
			
			Y.each(tests, function(test) {
				var testNode = Y.Node.create(
					'<li class="test">' +
						'<dl class="dl-horizontal">' +
							(test.name ? '<h4>' + Y.Escape.html(test.name) + '</h4>' : '') + 
							'<dt>' + Y.Escape.html(test.target) + '</dt>' +
							'<dd><input type="text" value="' + Y.Escape.html(test[test.target]) + '"/></dd>' +
							'<dt>Action</dt>' +
							'<dd>' + Y.Escape.html(test.action) + 
								(test.primary ? ' <code>' + Y.Escape.html(test.primary) + '</code> ' + (test.replace ? "with <code>" + Y.Escape.html(test.replace) + '</code>' : '') + '</dd>' : "") +
							'<dt>Result</dt>' +
							'<dd><input type="text" value="' + Y.Escape.html(test[test.target]) + '" class="photo-' + Y.Escape.html(test.target) + '" /></dd>' +
						'</dl>' +
					'</li>');
				
				bulkTool._bulkEditPhotos(new Y.NodeList([testNode]), test.target, test.action, test.primary, test.replace);
				
				if (testNode.one('.photo-' + test.target).get('value') == test.expected) {
					testNode.addClass('pass');
					successes++;
				} else {
					testNode.addClass('fail');
					failures++;
					
					testNode.one('dl').append('<dt>Expected</dt><dd><input type="text" value="' + Y.Escape.html(test.expected) + '"/></dd>');
				}
				
				outputList.append(testNode);
			});
			
			if (failures == 0) {
				alert("Success, " + successes + "/" + successes + " pass.");
			} else {
				alert("Some tests failed! Only " + successes + "/" + (failures + successes) + " passed!");
			}
		}
	});
});