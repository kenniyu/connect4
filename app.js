
/**
 * Module dependencies.
 */

var express = require('express'),
		routes = require('./routes'),
		connect = require('connect'),
		ejs = require('ejs'),
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

var everyone = nowjs.initialize(app),		// everyone is initialized
		users_hash = {},
		rooms_hash = {},
		CHAT_HISTORY_BUFFER_SIZE = 10,			// store 10 messages max
		TIME_TO_IDLE = 60000,								// 1 min (in ms)
		chat_messages = [],
		user_count = 1;

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

function add_to_chat_history(message_hash) {
	var chat_messages_length = chat_messages.length;
	if (chat_messages_length >= CHAT_HISTORY_BUFFER_SIZE) {
		// remove the first one
		chat_messages.splice(0,1);
	}
	// push the message_hash
	chat_messages.push(message_hash);
}

function update_last_active_time(client_id) {
	var user = users_hash[client_id];
	user.last_active = (new Date()).getTime();
	
	everyone.now.set_status_active(user);
}

function check_users_status() {
	var user,
			active_users = [],
			idle_users = [],
			current_time = (new Date()).getTime();
	
	for (var client_id in users_hash) {
		user = users_hash[client_id];
		if (user.last_active + TIME_TO_IDLE < current_time) {
			// user has been inactive for more than a minute
			idle_users.push(user);
		} else {
			active_users.push(user);
		}
	}
	
	everyone.now.update_users_status(active_users, idle_users);
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
		id: client_id,
		username: username,
		current_room_id: -1,
		last_active: (new Date()).getTime()
	}
	
	// add user to hash
	users_hash[user_key] = user_value;

	// increment user count
	user_count++;	
	
	// update everyone's client list
	update_clients_list();
	
	// preload this client's chatbox
	nowjs.getClient(client_id, function() {
		this.now.preload_chat(chat_messages);
	});

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
	update_last_active_time(this.user.clientId);
	var message_hash = {
		text: message,
		user: users_hash[this.user.clientId]
	}
	add_to_chat_history(message_hash);
	everyone.now.update_chat_log(message_hash);
}

everyone.now.update_last_active_time = function() {
	update_last_active_time(this.user.clientId);
}

setInterval(function() {
	// check active/idle status time every 10 seconds
	check_users_status();
}, 10000);