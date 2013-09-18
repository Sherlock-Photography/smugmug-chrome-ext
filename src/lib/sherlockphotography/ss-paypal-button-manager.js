YUI.add('ss-paypal-button-manager', function(Y, NAME) {
	var PayPalButtonManager = Y.Base.create(NAME, Y.Base, [], {}, {
		buttonCodeIsHosted : function(code) {
			return code.match(/name="hosted_button_id"/);
		},

		buttonCodeIsEncrypted : function(code) {
			return code.match(/-----BEGIN PKCS7-----/);
		},

		/**
		 * Modify the passed Y.Node containing PayPal's 'add to cart' or 'buy now' button forms to augment
		 * with parsed button data in "data-button" attributes.
		 * 
		 * @param code Y.Node
		 */
		parsePayPalCode : function(code) {
			code.all("form").each(function(form) {
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
				} else {
					var submit = form.one("input[type=image]");

					if (submit) {
						// Record the image to use for the buy button
						button.submitImage = submit.getAttribute("src");
					}
				}

				form.setAttribute('data-button', Y.JSON.stringify(button));
			});
		},

		/**
		 * Render the PayPal buttons which were previously annotated by parsePayPalCode(), to
		 * a node using the given item details.
		 * 
		 * @param code Y.Node augmented by parsePayPalCode()
		 * @param item_name
		 * @param item_number
		 * 
		 * @returns New Y.Node of rendered buttons
		 */
		renderPayPalButtons : function(code, item_name, item_number) {
			// Create a copy we can mess with
			var result = code.cloneNode(true);

			result.all('form').each(function(form) {
				var button;
				
				try {
					button = Y.JSON.parse(form.getAttribute('data-button'));
				} catch (e) {
					//Continue looking at other forms
					return;
				}

				if (button) {
					var container = Y.Node.create('<div></div>');

					urlData = Y.merge(button.hidden, {
						item_name : item_name,
						item_number : item_number,
						submit : ""
					});

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
								productLI = Y.Node.create("<li></li>"), 
								productLink = Y.Node.create("<a></a>");

							// This link will choose this dropdown option
							urlData[select.name] = option.value;

							productLink.setAttribute('href', button.action + "?" + Y.QueryString.stringify(urlData));
							productLink.setAttribute('target', button.target);

							productLink.setHTML(Y.Escape.html(option.label));

							productLI.append(productLink);

							ul.append(productLI);
						}

						container.append(ul);
					} else {
						/*
						 * Otherwise this is a click-to-submit button with no
						 * options
						 */
						var 
							link = Y.Node.create("<a class='ss-paypal-submit-button'></a>"),
							image = Y.Node.create("<img>"),

							urlData = Y.merge(button.hidden, {
								submit : ""
							});

						link.setAttribute('href', button.action + "?" + Y.QueryString.stringify(urlData));
						link.setAttribute('target', button.target);

						image.setAttribute('src', button.submitImage);

						link.append(image);
						
						container.append(link);
					}

					form.replace(container);
				}
			});

			return result;
		}
	});

	Y.namespace("SherlockPhotography").PayPalButtonManager = PayPalButtonManager;
}, '0.0.1', {
	requires : [ 'node', 'json', 'querystring-stringify' ]
});