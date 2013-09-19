YUI.add('ss-paypal-button-manager', function(Y, NAME) {
	var PayPalButtonManager = Y.Base.create(NAME, Y.Base, [], {}, {
		buttonCodeIsHosted : function(code) {
			return code.match(/name="hosted_button_id"/);
		},

		buttonCodeIsEncrypted : function(code) {
			return code.match(/-----BEGIN PKCS7-----/);
		},
		
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

		/* Convert a YUI Y.Node to HTML code. Needed because elem.getHMTL() doesn't include the parent. */
		_nodeToHTML: function(node) {
			var div = Y.Node.create("<div></div>");
			
			div.append(node);
			
			return div.getHTML();
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
		 * Render the PayPal buttons which were previously annotated by parsePayPalCode() to
		 * an HTML string using the given item details.
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
			
			return this._nodeToHTML(result);
		},
		
		/**
		 * Render a PayPal button for the given form, return the element to replace the form
		 * with, or the original form element if it was not a PayPal form.
		 * 
		 * @param form
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
						item_name : item_name,
						item_number : item_number,
						submit : ""
					}),
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
					var select = button.select;

					if (select.label) {
						var heading = Y.Node.create("<h4></h4>");

						heading.set('text', select.label);

						container.append(heading);
					}

					var ul = Y.Node.create('<ul class="ss-paypal-product-options">');

					for (var i in select.options) {
						var 
							option = select.options[i], 
							productLI = Y.Node.create("<li></li>");

						// This link will choose this dropdown option
						urlData[select.name] = option.value;

						productLI.append(renderLink(option.label));

						ul.append(productLI);
					}

					container.append(ul);
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
		}
	});

	Y.namespace("SherlockPhotography").PayPalButtonManager = PayPalButtonManager;
}, '0.0.1', {
	requires : [ 'node', 'json', 'querystring-stringify' ]
});