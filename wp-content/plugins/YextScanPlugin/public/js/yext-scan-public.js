(function( $ ) {
	'use strict';

	var YextScan = function(options) {
		this.form = options.form;

		if(!this.form || this.form.length <= 0) {
			console.error("Yext Scan: Form Not found");
			return;
		}
		this.bind();

	};

	/**
	 * Binds YextScan Events
	 */
	YextScan.prototype.bind = function() {
		// binds action lister to the business scan form
		var self = this;
		this.form.bind('submit', function(e){
			e.preventDefault();
			self.onSubmit($(this));
		});
	};

	/**
	 * Submit action when user submits the scan action
	 */
	YextScan.prototype.onSubmit = function($form) {
		var data = this.arrayToJson($form.serializeArray());

		this.create($form.attr('action'), data);
	};
	/**
	 * Creates a Yext Scan
	 * Requires Name, Phone and Address of Business
	 */
	YextScan.prototype.create = function(url, data) {
		// run ajax call to Yext Scan API to create the scan
		// Render The Results Page View from the list of publishers scan was run on
		var self = this;
		$.ajax(
			{
				method: "POST",
				url: url,
				data: data,
				dataType: 'json'
			}
		)
		.done(function( response ) {
			if (response.errors) {
				// something went wrong, render that to the view instead
    		var errorContainer = '<div class="yext-scan-error">YEXT SCAN PLUGIN ERROR :' + response.errors[0].message+'</div>';
				self.renderView(errorContainer);
			} else {
				self.renderView(response.view);
				// start pinging server for scan results
				self.getPublisherResults(url, response.jobId);
			}
		});

	};

	/**
	 * renders the results view with the given publisherList placeholder info
	 * @return {[type]} [description]
	 */
	YextScan.prototype.renderView = function(view) {
		// replace form  with the results view
		this.form.parent().first().html(view);
		var publisherSource   = document.getElementById("yext-scan-publisher-template").innerHTML;
		this.publisherTemplate = Handlebars.compile(publisherSource);
	};

	/**
	 * Get there Scan Results for Each Publisher
	 */
	YextScan.prototype.getPublisherResults = function(url, jobId) {
		var self = this;
		var data = {
			'action' : 'get_publisher_results',
			'jobId': jobId,
			'sites': window.siteIds
		};
		$.ajax(
			{
				method: "POST",
				url: url,
				data: data,
				dataType: 'json'
			}
		)
		.done(function( response ) {
			self.renderPublishers(response.publishers);
			console.log(response.publishers);
			window.setTimeout(function() {
				if(window.siteIds.length > 0) {
					self.getPublisherResults(url, jobId);
				}
			}, 2000);
		});
	};

	YextScan.prototype.renderPublishers = function(publishers) {
		// iterates through all the publishers and if they publisher's scan is finished
		var self = this;
		var doneSiteIds = [];
		publishers.forEach(function(pub){
			if(pub.status != 'SCAN_IN_PROGRESS'){
				// render the view
				var pubView = self.renderPublisherView(pub);
				// replace the loading container with the new publisher content
				$('.js-yext-scan-result-item[data-site-id="' +pub.siteId +'"]').find('.js-yext-scan-loading-container').replaceWith(pubView);
				// pop from stack so we don't query for it again
				doneSiteIds.push(pub.siteId);
			}
		});
		this.removeDoneSites(doneSiteIds);
	};

	/**
	 * Remove Scanned Sites from the window siteIds list
	 */
	YextScan.prototype.removeDoneSites = function(doneSiteIds) {
		window.siteIds = window.siteIds.filter(function(id){
	    return !doneSiteIds.includes( id );
		});
	};

	/**
	 * Compiles the handlebar template to render the publisher to the view
	 */
	YextScan.prototype.renderPublisherView = function(pub) {
		var publisherHtml    = this.publisherTemplate(pub);
		return publisherHtml;
	};


	/**
	 * Utilities
	 */

	/**
	 * Accepts an array and returns a key value json
	 */
	YextScan.prototype.arrayToJson = function(formArray) {
		var returnArray = {};
		for (var i = 0; i < formArray.length; i++){
		  returnArray[formArray[i]['name']] = formArray[i]['value'];
		}
		return returnArray;
	};

	$(document).ready(function() {

		Handlebars.registerHelper('if_equal', function(a, b, opts){
	    if (a == b) {
	        return opts.fn(this)
	    } else {
	        return opts.inverse(this)
	    }
		});

		Handlebars.registerHelper('get_match_class', function(match, score){
	    if (match) {
	    	if (score < 1) {
	    		return "yext-scan-warning";
	    	}
	    	return "yext-scan-success";
	    } else {
	    	return "yext-scan-error";
	    }
		});

		new YextScan({
			'form': $('.js-create-scan-form')
		});
	});

})( jQuery );
