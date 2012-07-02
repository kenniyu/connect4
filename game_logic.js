// 2 players connect and take turns
// 2d matrix to fill 0 or 1
// 1d matrix to keep track of the heights



var player1 = null;
var player2 = null;
var _game_board = null;
var _height_meter = null;

console.log('loading game_logic.js');
// function to collect player names and initialize
function init_users() {
	player1 = prompt("Enter player 1 name");
	player2 = prompt("Enter player 2 name");
}

// function to initialize the game board and the height meter for each row
function init_game() {
	_game_board = new Array(6);
	
	for(var i = 0; i < 6; i++) {
		_game_board[i] = new Array(7);
		for (var j = 0; j < 7; j++) {
			_game_board[i][j] = 0;
		}
	}

	_height_meter = new Array(7);
	for(var i = 0; i < 7; i++) {
		_height_meter[i] = 0;
	}
}

function take_turn(token, col) {

	console.log('take_turn: col is ' + col);
	console.log('take_turn: _height_meter[col] is ' + _height_meter[col]);

	var height_at_col = parseInt(_height_meter[col]);
	if(height_at_col < 6) {
		var row = 5 - height_at_col;
		console.log('take_turn: row is ' + row);
		_game_board[row][col] = token;
		_height_meter[col] += 1;
		return true;
	}
	else {
		alert("The row is full; pick another row");
		return false;
	}
}

// function to determine whether there is a winner
// will be called at the end of each turn, and that person is the winner
function is_game_finished() {
	return false;
}

function print_board() {
	for(var i = 0; i < 6; i++) {
		for(var j = 0; j < 7; j++) {
			var r_class = 'row' + i;
			var c_id = 'col' + j;

			//console.log('printing: row = ' + r_class + ' col = ' + c_id);
			//console.log('_game_board value is: ' + _game_board[i][j]);

			var selector = "td." + r_class + '#' + c_id;
			$(selector).html(_game_board[i][j]);
		}
	}
}

// initializing the game board
init_game();
console.log('checking game_board init');
console.log(_game_board[0][0]);
console.log(_height_meter[0]);

// while the game is not over, keep prompting each of the users for input
// player1 goes first

function start_game() {
	var current_player = player1;
	var former_player = player2;
	var token = null;

	while(!is_game_finished()) {

		// update the current player and print the updated board
		$("#current_player").html('Current Player: ' + current_player);
		print_board();

		// prompt for user col input and validate
		var col = parseInt(prompt(current_player + " Pick a col"));
		console.log(typeof(col));

		// need to check for invalid input - including NaN

		while(typeof(col) != "number" || col < 0 || col > 6 || col == "NaN") {
			console.log('user col input is ' + col);
			col = parseInt(prompt('invalid row input; please pick a value between 1-7'));
		    console.log(typeof(col));
		}

		// set the token symbol based on the current player
		if(current_player === player1) {
			token = 1;
			current_player = player2;
			former_player = player1;
		}
		else {
			token = 2;
			current_player = player1;
			former_player = player2;
		}

		console.log('making player moves with token ' + token + ' at col ' + col);
		var took_turn_successfully = take_turn(token, col);
		console.log('turn taken successfully? ' + took_turn_successfully);
		

		if(!took_turn_successfully) {
			var tmp_former_player = former_player;
			former_player = current_player;
			current_player = tmp_former_player;
			alert('unable to make the move at col ' + col);
		}
	}
}













