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
	var stream = twit.stream('statuses/filter', { follow: program.user });

	stream.on('tweet', function (tweet) {
		console.log("Registered Tweet", tweet);
		if (!tweet.retweeted_status) {
			if (!tweet.in_reply_to_screen_name && !tweet.in_reply_to_status_id && !tweet.in_reply_to_user_id) {
				if (tweet.text.length < 128) {
					if (!!program.dryrun) {
						twit.post('statuses/update', { status: "Dear Diary " + tweet.text}, function (err, details) {
							if (err) {
								console.log("Error posting tweet", tweet.text);
							}
						});
					} else {
						console.log("Dry-run tweet details:", "Dear Diary", tweet.text);
					}
				} else {
					console.log("Potential Diary tweet missed due to length", tweet.text);
				}
			} else {
				console.log("Tweet was a reply", tweet.text);
			}
		} else {
			console.log("Tweet was a retweet");
		}
	});
	console.log("Application Started");
} else {
	console.error("Twitter user Id or screen name is required");
	process.exit(1);
}
