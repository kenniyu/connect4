
/**
 * Module dependencies.
 */

var express = require('express'),
		routes = require('./routes'),
		connect = require('connect'),
		ejs = require('ejs'),
		sass = require('sass'),
		nowjs = require('now');
	
var app = module.exports = express.createServer();

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.set('view options', { layout: false });
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

var everyone = nowjs.initialize(app);		// everyone is initialized
var users_hash = {};
var rooms_hash = {};
var CHAT_HISTORY_BUFFER_SIZE = 10;			// store 10 messages max
var chat_messages = [];
var user_count = 1;

function create_rooms(n) {
	var room_key,
			room_value;
			
	for (var i = 0; i < n; i++) {
		room_key = i + 1;
		room_value = {
			'id': (i + 1),
			'users': nowjs.getGroup(room_key)
		}
		rooms_hash[room_key] = room_value;
	}
}

function update_clients_list() {
	for (var client_id in users_hash) {
		nowjs.getClient(client_id, function() {
			this.now.update_clients_list_callback(users_hash);
		});
	}
}

// when a client connects to this page
nowjs.on('connect', function() {	
	// get user data
	var user = this.user,
			client_id = user.clientId,
			username = 'player_' + user_count;
			
	// set user id and name
	user_key = client_id;
	user_value = {
		'id': client_id,
		'username': username,
		'current_room_id': -1
	}
	
	// add user to hash
	users_hash[user_key] = user_value;

	// increment user count
	user_count++;	
	
	// update everyone's client list
	update_clients_list();
});

// when a client disconnects from the page
nowjs.on('disconnect', function() {
	var client_id = this.user.clientId;
	delete users_hash[client_id];
});

// everyone.now is a shared namespace on the server side 
// and is shared between server and all clients
everyone.now.join_room = function(room_id) {
	var room_users = rooms_hash[room_id].users;
	room_users.addUser(this.user.clientId);
}

everyone.now.leave_room = function(room_id) {
	var room_users = rooms_hash[room_id].users;
	room_users.removeUser(this.user.clientId);	
}

everyone.now.submit_chat = function(message) {
	var message_hash = {
		text: message,
		user: users_hash[this.user.clientId]
	}
	for (var client_id in users_hash) {
		nowjs.getClient(client_id, function() {
			this.now.update_chat_log(message_hash);
		});
	}
}