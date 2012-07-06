
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

function everyone_update_clients_list() {
	everyone.now.update_clients_list_callback(users_hash);
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

function update_last_active_time(user_obj) {
	user_obj.last_active = (new Date()).getTime();
	everyone.now.set_status_active(user_obj);
}

function broadcast_message(user_obj, type, chat_text) {
	console.log(user_obj);
	var username = user_obj.username,
			message_hash = {
				'leave'		:	'<div class="message passive"><span class="name">' + username + '</span> has left the game</div>',
				'join'		: '<div class="message passive"><span class="name">' + username + '</span> has joined the game</div>', 
				'chat'		: '<div class="message active"><span class="name">' + username + '</span>: ' + chat_text + '</div>'
			},
			message_hash = {
				type: type,
				html_string: message_hash[type],
				user: user_obj
			};
	console.log(message_hash);
	add_to_chat_history(message_hash);
	everyone.now.update_chat_log(message_hash);
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
	
	// broadcast join
	
	user_obj = users_hash[client_id];
	broadcast_message(user_obj, 'join');
	
	// update everyone's client list
	everyone_update_clients_list();
	
	// preload this client's chatbox
	nowjs.getClient(client_id, function() {
		this.now.preload_chat(chat_messages);
	});

});

// when a client disconnects from the page
nowjs.on('disconnect', function() {
	var client_id = this.user.clientId,
			user_obj	= users_hash[client_id];
	broadcast_message(user_obj, 'leave');
	delete users_hash[client_id];
	everyone_update_clients_list();
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
	var client_id 	= this.user.clientId,
			user_obj 		= users_hash[client_id],
			type 				=	'chat';
	update_last_active_time(user_obj);
	broadcast_message(user_obj, type, message);
}

everyone.now.update_last_active_time = function() {
	var client_id = this.user.clientId,
			user_obj 	= users_hash[client_id];
	update_last_active_time(user_obj);
}

setInterval(function() {
	// check active/idle status time every 10 seconds
	check_users_status();
}, 10000);