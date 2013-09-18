YUI.add('ss-paypal-button-manager', function(Y, NAME) {
	var PayPalButtonManager = Y.Base.create(
		NAME,
		Y.Base,
		[],
		{
		},
		{
			/**
			 * Parse a Y.Node document fragment containing PayPal's 'add to cart' or 'buy now' button forms and augment
			 * them with parsed button data in "button" data attributes.
			 * 
			 * @param code
			 */
			parsePayPalCode:function(code) {
				code.all("form").each(function(form) {
					var payPalButton = {
						hidden: {},
						action: form.getAttribute("action"),
						target: form.getAttribute("target")
					};
					
					form.all('input[type=hidden]').each(function(input) {
						payPalButton.hidden[input.getAttribute("name")] = input.getAttribute("value");
					});
					
					var select = form.one("select");
					
					if (select) {
						payPalButton.select = {
							name: select.getAttribute("name"),
							label: payPalButton.hidden[select.getAttribute("name").replace(/^os/, "on")],
							options: []
						};
						
						select.all("option").each(function(option) {
							payPalButton.select.options.push({
								value: option.getAttribute("value"), 
								label: option.get('text')
							});
						});
					} else {
						var submit = form.one("input[type=image]");
						
						if (submit) {
							//Record the image to use for the buy button
							payPalButton.submit = submit.getAttribute("src");
						}
					}
					
					form.setAttribute('data-button', Y.JSON.stringify(payPalButton));
				});
			},
			
			/**
			 * Render a PayPal buttons to HTML using the given HTML code (augmented by parsePayPalCode) and item details.
			 * 
			 * @param button
			 * @param item_name
			 * @param item_number
			 */
			renderPayPalButtons: function(code, item_name, item_number) {
				var result = code.cloneNode(true);
				
				//Create a copy we can mess with
				
				result.all('form').each(function(form) {
					var
						button = Y.JSON.parse(form.getAttribute('data-button'));
					
					if (button) {
						var
							container = Y.Node.create('<div class="ss-paypal-addtocart"></div>'); /*TODO appropriate classname*/

						urlData = Y.merge(button.hidden, {
							item_name: item_name,
							item_number: item_number,
							submit: ""
						});
						
						if (button.select) {
							var select = button.select;
							
							if (select.label) {
								var heading = Y.Node.create("<h4></h4>");
								
								heading.set('text', select.label);
								
								container.append(heading);
							}
							
							var ul = Y.Node.create('<ul class="ss-product-options">');
							
							for (var i in select.options) {
								var 
									option = select.options[i],
									productLI = Y.Node.create("<li></li>"),
									productLink = Y.Node.create("<a></a>");
								
								//Select this 'chosen' option 
								urlData[select.name] = option.value;
								
								productLink.setAttribute('href', button.action + "?" + Y.QueryString.stringify(urlData));
								productLink.set('text', option.label);
								
								productLI.append(productLink);
								
								ul.append(productLI);
							}
							
							container.append(ul);
						}
					
						form.replace(container);
					}
				});
				
				return result;
			}
		}
	);
	
	Y.namespace("SherlockPhotography").PayPalButtonManager = PayPalButtonManager;
}, '0.0.1', {
	requires: ['node', 'json', 'querystring-stringify']
});