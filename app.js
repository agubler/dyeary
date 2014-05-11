"use strict";

var Twit = require("twit");
var program = require('commander');

program
	.version("0.0.1")
	.option("-u, --user <value>", "Twitter screen name or user Id to track")
	.option("-d, --dryrun", "Set dryrun on, not tweets will be posted")
	.parse(process.argv);

try {
	var authConfig = require("./authConfig");
} catch (err) {
	console.error("Unable to initiate twitter connection without auth config");
	process.exit(1);
}

if (program.user) {
	var twit = new Twit(authConfig);
	var userId = program.user;

	twit.get('users/show', {screen_name: program.user}, function(err, user){
		if (user) {
			console.log("User found for screen_name:", program.user);
			userId = user.id;
		}
		var stream = twit.stream('statuses/filter', { follow: userId });

		stream.on('tweet', function (tweet) {
			var isCandidateTweet = !tweet.in_reply_to_screen_name &&
				!tweet.in_reply_to_status_id &&
				!tweet.in_reply_to_user_id &&
				!tweet.retweeted_status;

			if (isCandidateTweet) {
				if (tweet.text.length < 128) {
					if (!!program.dryrun) {
						console.log("Registered Tweet", tweet);
						twit.post('statuses/update', { status: "Dear Diary " + tweet.text}, function (err, details) {
							if (err) {
								console.log("Error posting tweet", tweet.text);
							}
						});
					} else {
						console.log("Dry-run tweet details:", "Dear Diary", tweet.text);
					}
				} else {
					console.log("Tweet missed due to length:", tweet.text);
				}
			} else {
				console.log("Tweet was a retweet or reply:", tweet.text);
			}
		});
		console.log("Application Started");
	});
} else {
	console.error("Twitter user Id or screen name is required");
	process.exit(1);
}
