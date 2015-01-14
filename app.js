"use strict"

var Twit = require("twit")
var program = require('commander')
var when = require('when')

program
	.version("0.0.1")
	.option("-u, --user <value>", "Twitter screen name or user Id to track")
	.option("-r, --frequency <value>", "The percentage of the time that a registered tweet will be included", "100")
	.option("-d, --dryrun", "Set dryrun on, not tweets will be posted")
	.parse(process.argv)

try {
	var authConfig = require("./authConfig")
} catch (err) {
	console.error("Unable to initiate twitter connection without auth config")
	process.exit(1)
}

if (!program.user) {
	console.error("Twitter user Id or screen name is required")
	process.exit(1)
}

/**
 *
 * @constructor
 */
function Dyeary() {
	var self = this
	self.twit = new Twit(authConfig)

	when.all(this.getUserIds(program.user.split(','))).then(this.followUsers.bind(this))
}

Dyeary.prototype.getUserIds = function(users) {
	var self = this,
		promises = []
	users.forEach(function (user) {
		var deferred = when.defer()
		promises.push(deferred.promise)
		var userLookupArgs = {}
		if (isNaN(parseInt(user))) {
			userLookupArgs = {screen_name: user}
		} else {
			userLookupArgs = {user_id: user}
		}
		self.twit.get('users/show', userLookupArgs, self.parseUserResponse.bind(self, user, deferred))
	})
	return promises
}

Dyeary.prototype.parseUserResponse = function(user, deferred, error, twitterUser) {
	if (error) {
		console.log("Unable to find twitter user for input:", user)
	} else if (twitterUser) {
		console.log("User found for input:", user, "screen_name:", twitterUser.screen_name)
		deferred.resolve(twitterUser.id)
	}
}

Dyeary.prototype.followUsers = function(userIds) {
	var self = this
	var stream = self.twit.stream('statuses/filter', { follow: userIds.join(',') })

	stream.on('tweet', function (tweet) {
		var isCandidateTweet = !tweet.in_reply_to_screen_name && !tweet.in_reply_to_status_id && !tweet.in_reply_to_user_id && !tweet.retweeted_status
		if (self.doRepostTweet() && isCandidateTweet && tweet.text.length < 128) {
			if (!program.dryrun) {
				console.log("Registered Tweet", tweet)
				self.twit.post('statuses/update', { status: "Dear Diary " + tweet.text}, function (err) {
					if (err) {
						console.log("Error posting tweet", tweet.text)
					}
				})
			} else {
				console.log("Dry-run tweet details:", "Dear Diary", tweet.text)
			}
		}
	})
	console.log("Application Started", program.dryrun ? " - dryrun on" : "" )
}

Dyeary.prototype.doRepostTweet = function() {
	var tweetFrequency = parseInt(program.frequency)
	var repost = true
	if (!isNaN(tweetFrequency)) {
		repost = tweetFrequency / 100 > Math.random()
	}
	return repost
}

new Dyeary()
