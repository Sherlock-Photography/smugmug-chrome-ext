YUI.add('ss-paypal-button-manager', function(Y, NAME) {
	var 
		_regFindInstalledPayPalCode = /<div class="ss-paypal-button">[\s\S]+?<\/div><div class="ss-paypal-button-end" style="[^"]*">\.?<\/div>/,
		_regFindInstalledPayPalCodeGlobal = new RegExp(_regFindInstalledPayPalCode.source, "g");

	/* Not to be used for security-critical purposes (not a sanitiser!) */
	function stripHTML(text) {
		return text.replace(/<\S[^><]*>/g, " ").replace("/  +/g", " ");
	}
	
	function newlinesToSpaces(text) {
		return text.replace(/(\r\n|\n|\r)/gm, " ");
	}
	
	var PayPalButtonManager = Y.Base.create(NAME, Y.Base, [], {}, {
		_parsePayPalForm: function(form) {
			var button = {
				hidden : {},
				action : form.getAttribute("action"),
				target : form.getAttribute("target")
			};

			form.all('input[type=hidden]').each(function(input) {
				button.hidden[input.getAttribute("name")] = input.getAttribute("value");
			});

			switch (button.hidden.cmd) {
				case "_cart":
					if (button.hidden.display) {
						button.type = "viewcart";
					} else {
						button.type = "addtocart";
					}
					break;
				case "_xclick":
					button.type = "buynow";
					break;
				default:
					/* Not a PayPal button we recognise, so leave it alone. */
					return;
			}

			var select = form.one("select");

			if (select) {
				button.select = {
					name : select.getAttribute("name"),
					label : button.hidden[select.getAttribute("name").replace(/^os/, "on")],
					options : []
				};

				select.all("option").each(function(option) {
					button.select.options.push({
						value : option.getAttribute("value"),
						label : option.get('text')
					});
				});
			} 

			var submit = form.one("input[type=image]");

			if (submit) {
				// Record the image to use for the buy button
				button.submitImage = submit.getAttribute("src");
			}

			form.setAttribute('data-button', Y.JSON.stringify(button));
		},
		
		_substituteVariablesInText: function(text, map, urlencode) {
			for (var key in map) {
				text = text.replace("$" + key, urlencode ? encodeURIComponent(map[key]) : map[key]);
			}
			
			return text;
		},
		
		_recursePerformVariableSubstitutions: function(node, map) {
			var that = this;
			
			node.get("childNodes").each(function(child) {
				switch (child.get('nodeType')) {
					case 3:
						//Text node
						child.set('text', that._substituteVariablesInText(child.get("text"), map));
						break;
					case 1:
						//Element
						switch (child.get("tagName").toUpperCase()) {
							case "A":
								child.setAttribute("href", that._substituteVariablesInText(child.getAttribute("href"), map, true));
								break;
							case "FORM":
								child.setAttribute("action", that._substituteVariablesInText(child.getAttribute("action"), map, true));
								break;
							case "INPUT":
								child.setAttribute("value", that._substituteVariablesInText(child.getAttribute("value"), map));
								break;
						}
						
						that._recursePerformVariableSubstitutions(child, map);
						break;
				}
			});
		},

		/**
		 * Replace the given keys in map with their corresponding values in the text and attributes of
		 * node.
		 * 
		 * Returns HTML text.
		 */
		_performVariableSubstitutions: function(node, map) {
			var container = Y.Node.create("<div></div>");
			
			container.append(node);
			
			this._recursePerformVariableSubstitutions(container, map);
			
			return container.getHTML();
		},
		
		
		_renderSmugMugButton: function(type) {
			var actionLabel, actionIcon;
			
			switch (type) {
				case "addtocart":
					actionIcon = "sm-fonticon-CartAdd";
					actionLabel = "Add to cart";
					break;
				case "viewcart":
					actionIcon = "sm-fonticon-Cart";
					actionLabel = "View cart";
					break;						
				case "buynow":
				default:
					actionIcon = "sm-fonticon-CartAdd";
					actionLabel = "Buy now";
					break;
			}		
			
			return '<button class="sm-button sm-button-size-small sm-button-skin-accent">' +
				'<span class="sm-fonticon sm-button-fonticon sm-fonticon-small ' + actionIcon + '"></span>' +
				'<span class="sm-button-label">' + actionLabel + '</span>' +
			'</button>';			
		},
		
		/**
		 * Render a PayPal button for the given form, return the element to replace the form
		 * with, or the original form element if it was not a PayPal form.
		 * 
		 * @param form PayPal form tag to create button from
		 * 
		 * @param item_name
		 * @param item_number
		 */
		_renderPayPalButton: function(form, style, item_name, item_number) {
			var button;
			
			try {
				button = Y.JSON.parse(form.getAttribute('data-button'));
			} catch (e) {
				//Not a PayPal form we recognize
				return form;
			}

			if (button) {
				var 
					container = Y.Node.create('<div></div>'),
					urlData = Y.merge(button.hidden, {
						item_name : (item_name || "").slice(0, 127), /* PayPal only supports 127 characters for these fields */
						item_number : (item_number || "").slice(0, 127),
						submit : ""
					}),
					/*uniqueID = Y.Crypto.MD5(Y.JSON.stringify(urlData)).slice(0, 6), */
					that = this;
				
				var renderLink = function(productName) {
					var 
						productLink = Y.Node.create("<a></a>"),
						actionLabel;
					
					switch (button.type) {
						case "addtocart":
							actionLabel = "Add to cart";
							break;
						case "viewcart":
							actionLabel = "View cart";
							break;						
						case "buynow":
						default:
							actionLabel = "Buy now";
							break;
					}

					productLink.setAttribute('href', button.action + "?" + Y.QueryString.stringify(urlData));
					productLink.setAttribute('target', button.target);

					if (productName) {
						productLink.setHTML("<span>" + Y.Escape.html(productName) + "</span>");
					}
					
					if (style == "smugmug") {
						productLink.append(that._renderSmugMugButton(button.type));
					} else if (style == "paypal" && button.submitImage) {
						var buttonImg = Y.Node.create("<img>");
						
						buttonImg.setAttribute("src", button.submitImage);
						productLink.append(buttonImg);
					} else {
						productLink.addClass("ss-paypal-plain-label");
						
						if (!productName)
							productLink.set('text', actionLabel);
					}
					
					return productLink;
				};		
				
				switch (button.type) {
					case "viewcart":
						container.addClass("ss-paypal-view-cart-section");
						break;
					case "addtocart":
						container.addClass("ss-paypal-add-to-cart-section");
						break;
					case "buynow":
						container.addClass("ss-paypal-buy-now-section");
						break;
				}
				
				/* Is this a drop-down style button? */
				if (button.select) {
					var 
						select = button.select,
						selectContainer = Y.Node.create('<div class="ss-paypal-product-options"></div>');

					if (select.label) {
						var heading = Y.Node.create("<h4></h4>");

						heading.set('text', select.label);

						selectContainer.append(heading);
					}

					var ul = Y.Node.create('<ul>');

					for (var i in select.options) {
						var 
							option = select.options[i], 
							productLI = Y.Node.create("<li></li>");

						// This link will choose this dropdown option
						urlData[select.name] = option.value;

						productLI.append(renderLink(option.label));

						ul.append(productLI);
					}

					selectContainer.append(ul);
					
					container.append(selectContainer);
				} else {
					/*
					 * Otherwise this is a click-to-submit button with no
					 * options
					 */
					var link = renderLink();

					link.addClass("ss-paypal-submit-button");
					
					container.append(link);
				}

				return container;
			}
			
			return form;
		},		
		
		/**
		 * Customize PayPal code for the given SmugMug image data.
		 * 
		 * @param payPalCode Y.Node of code previously annotated by parsePayPalCode to customise
		 * @param image SmugMug photo to use data from
		 * @returns {String}
		 */
		customizePayPalCodeForImage: function(payPalCode, buttonStyle, image) {
			var 
				link = image.get('WebUri'),
				caption, title, description,
				captionRaw, captionText;
			
			if (image.get("Caption")) {
				//Tidy up the caption by removing HTML and any old PayPal button code
				captionRaw = image.get("Caption").replace(_regFindInstalledPayPalCodeGlobal, '');
				
				captionText = stripHTML(captionRaw).trim();
				
				caption = newlinesToSpaces(captionText);
			} else {
				caption = "";
			}
			
			if (image.get("Title")) {
				//Tidy up the title by removing HTML
				title = stripHTML(image.get("Title")).trim();
				title = newlinesToSpaces(title);
			} else {
				title = "";
			}
			
			if (title || caption) {
				if (title) {
					description = title + " / " + caption;	
				} else {
					description = caption;
				}
			} else {
				if (image.get("FileName")) {
					description = image.get("FileName");
				} else {
					description = link;
				}
			}

			var 
				rendered = this.renderPayPalButtons(payPalCode, buttonStyle, description, link),
				
				renderedHTML = 
					this._performVariableSubstitutions(rendered, {
						'FILENAME': image.get("FileName"),
						'CAPTION': caption,
						'TITLE': image.get("Title"),
						'PHOTO_NAME': description,
						'PHOTO_URL': link,
					})
					.replace(/(\r\n|\n|\r)/gm, " ") /* SmugMug's codegen for tooltips will make every \n start a new line, and we don't want our tooltip that tall! */
					.replace(/  +|\t/g, " ")
					.trim(),
							
				result = 
					'<div class="ss-paypal-button">' 
						+ renderedHTML
					+ '</div><div class="ss-paypal-button-end" style="display:none">';
				
			/* 
			 * A current bug in SmugMug means that a caption which has no text in it after HTML-removal does not get displayed 
			 * even when HTML code would be visible
			 */
			if (!caption && stripHTML(renderedHTML).trim().length == 0) {
				result += '.';
			}
			
			result += '</div>';
					
			return result;
		},		
		
		/**
		 * Modify the passed Y.Node containing PayPal's 'add to cart' or 'buy now' button forms to augment
		 * with parsed button data in "data-button" attributes.
		 * 
		 * @param code Y.Node
		 */
		parsePayPalCode : function(code) {
			if (code.test("form")) {
				this._parsePayPalForm(code);
			} else {
				code.all("form").each(this._parsePayPalForm);
			}
		},
		
		buttonCodeIsHosted : function(code) {
			return code.match(/name="hosted_button_id"/);
		},

		buttonCodeIsEncrypted : function(code) {
			return code.match(/-----BEGIN PKCS7-----/);
		},
		
		containsSSPayPalButton: function(code) {
			return code.match(_regFindInstalledPayPalCode);
		},

		replaceSSPayPalButton: function(caption, newCode) {
			return caption.replace(_regFindInstalledPayPalCode, newCode);
		},

		/**
		 * Remove PayPal buttons added by renderPayPalButtons from the given code, returns the new code.
		 * 
		 * @param code
		 */
		removeSSPayPalButtons: function(code) {
			return code.replace(_regFindInstalledPayPalCodeGlobal, '');
		},
		
		/**
		 * Render the PayPal buttons which were previously annotated by parsePayPalCode() to
		 * a a YUI Node using the given item details.
		 * 
		 * @param code Y.Node augmented by parsePayPalCode()
		 * @param style Buy button style. One of "paypal", "smugmug", or falsey to render none.
		 * @param item_name
		 * @param item_number
		 * 
		 * @returns New Y.Node of rendered buttons
		 */
		renderPayPalButtons : function(code, style, item_name, item_number) {
			// Create a copy we can mess with
			var 
				result = code.cloneNode(true),
				that = this;
			
			if (result.test("form")) {
				result = this._renderPayPalButton(result, style, item_name, item_number);
			} else {
				result.all('form').each(function(form) {
					form.replace(that._renderPayPalButton(form, style, item_name, item_number));
				});
			}
			
			return result;
		}
	});

	Y.namespace("SherlockPhotography").PayPalButtonManager = PayPalButtonManager;
}, '0.0.1', {
	requires : [ 'node', 'json', 'querystring-stringify', 'gallery-crypto-md5' ]
});