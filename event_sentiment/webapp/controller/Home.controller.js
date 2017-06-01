sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("event_sentiment.controller.Home", {
					
			
		modelServices :function() {
	        var self = this;
	        this.intervalHandle = setInterval(function() { 
	            //No need to create and assign a new model each time. Just load the data. 
	            self.callTwitter();
	         },  30000); //Call setInterval only once
		},
		
		callTwitter: function(){
			var customer_key = "";
			var customer_secret = " ";
			var access_token= " ";
			var access_token_secret = " ";
			                               
			var signing_key = customer_secret + "&" + access_token_secret;
			                               
			var signature_method = "HMAC-SHA1";
			var authorization_version = "1.0";
			var method = "GET";
			var protocol = "https";
			var server = "api.twitter.com";
			var version = "1.1";
			var service = "search/tweets.json";
		
			var BaseURL = protocol + "://" + server + "/" + version + "/" + service;

			var oauth_consumer_key = "oauth_consumer_key=" + customer_key + "&";
			var oauth_nonce = "oauth_nonce=" + this.makeid() + "&";
			var oauth_signature_method = "oauth_signature_method=" + signature_method + "&";
			var oauth_timestamp = "oauth_timestamp=" + Math.floor(Date.now() / 1000) + "&";
			var oauth_token = "oauth_token=" + access_token + "&";
			var oauth_version = "oauth_version=" + authorization_version + "&";
			var eventQ = sap.ui.getCore().byId("__xmlview0").getModel().oData.eventName;
			var query = "q=" + encodeURIComponent(eventQ);
			
			var oauth_parameters = oauth_consumer_key + oauth_nonce + oauth_signature_method + oauth_timestamp + oauth_token + oauth_version;
			var searchOption = query;
			
			var parametersString = oauth_parameters + query ;
			
			var signatureBaseString = method + "&" + encodeURIComponent(BaseURL) + "&" + encodeURIComponent(parametersString);

			var hash = CryptoJS.HmacSHA1(signatureBaseString, signing_key);
			var base64String = hash.toString(CryptoJS.enc.Base64);
			var oauth_signature = encodeURIComponent(base64String);
		
			var URL = BaseURL + "?" + searchOption + "&" + oauth_parameters + "oauth_signature=" + oauth_signature;
			
			var self = this;

			$.ajax({
				type: 'GET',
				url: URL,
				crossDomain: true,
				async: true,
				header: {
					"Access-Control-Allow-Origin": '*'
				}
			}).done(function(results) {
				if (results) {
                    var twitterResult = new sap.ui.model.json.JSONModel();
                    twitterResult.setData(results);
                    self.analyseTweets(twitterResult); 
    			}
			});
		},
			

		
		analyseTweets: function(results){

			var APIkey = " ";
			var tweets = results.oData.statuses;

			//variables for the loop
			var array = [];
			var i;

			//loop over tweers
			for(i in tweets){

				var data = "{  \"text\": " + tweets[i].text + " }";

				var xhr = new XMLHttpRequest();
				//xhr.withCredentials = true;
				
				xhr.addEventListener("readystatechange", function () {
				  if (this.readyState === this.DONE) {
					var string = this.responseText;
					var sentiment = "None"; 
					var sentimentText = "No Sentiment Detected";
					if(string.includes("Sentiment")){
						console.log(string);
						if(string.includes("WeakPositiveSentiment")){
							sentiment="Success";
							sentimentText = "Strong";
						} else if(string.includes("StrongPositiveSentiment")){
							sentiment="Success";
							sentimentText="Weak";
						} else if(string.includes("WeakNegativeSentiment")){
							sentiment="Warning";
							sentimentText = "Weak";
						} else if(string.includes("StrongNegativeSentiment")){
							sentiment="Error";
							sentimentText = "Strong";
						} else {
							sentiment = "None";
							sentimentText = "No Sentiment Detected";
						}
						
					}
					
					var tweet = {
						"text": tweets[i].text,
						"username": tweets[i].user.name,
						"userpic": tweets[i].user.profile_image_url,
						"userlocation": tweets[i].user.location,
						"created": tweets[i].created_at,
						"sentiment": sentiment,
						"sentimentText": sentimentText
					};
					
					array.push(tweet);
				    
				  }
				});
				
				//setting request method
				xhr.open("POST", "https://sandbox.api.sap.com/textanalysis/ta-sentiments/v1", false);
				
				//adding request headers
				xhr.setRequestHeader("Content-Type", "application/octet-stream");
				xhr.setRequestHeader("Accept", "application/json");
				xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
				xhr.setRequestHeader("APIKey", APIkey);
				
				//sending request
				xhr.send(data);
			}
			console.log(array);
			
			this.getView().getModel("twitterResult").setProperty("/data", array);
			
		},
		
		makeid: function(){
			return Math.floor(Math.random() * 899999 + 100000);	
		},
		
		onPress: function(){
			var self = this;
			var dialog = new sap.m.Dialog({
				title: 'Change Event Search',
				type: 'Message',
				content: [
					new sap.m.Label({ text: 'Event Hashtag', labelFor: 'event'}),
					new sap.m.Input('event', {
						liveChange: function(oEvent) {
							var eventName = oEvent.getParameter('value');
							var parent = oEvent.getSource().getParent();
 
							parent.getBeginButton().setEnabled(eventName.length > 0);
						},
						width: '100%',
						placeholder: 'Add Text from Hashtag (required - do not include #)'
					})
				],
				beginButton: new sap.m.Button({
					text: 'Submit',
					enabled: false,
					press: function () {
						var sText = sap.ui.getCore().byId('event').getValue();
						var event ={
							"eventName": sText
						};
						var searchTerm = new sap.ui.model.json.JSONModel();
			            searchTerm.setData(event);
						sap.ui.getCore().byId("__xmlview0").setModel(searchTerm);
						dialog.close();
						self.callTwitter();
					}
				}),
				endButton: new sap.m.Button({
					text: 'Cancel',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
 
			dialog.open();	
			
		},
		
		onInit: function(){
			var event ={
				"eventName": "OSCON"
			};
			var searchTerm = new sap.ui.model.json.JSONModel();
            searchTerm.setData(event);
			sap.ui.getCore().byId("__xmlview0").setModel(searchTerm);
			var twitterResult = new sap.ui.model.json.JSONModel();
			this.getView().setModel(twitterResult, "twitterResult");
			this.callTwitter();
			this.modelServices();
		}
	});
});