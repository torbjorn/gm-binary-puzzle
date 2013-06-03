// ==UserScript==
// @name        Binary puzzle solver
// @namespace   http://torbjorn.org/binary-puzzle-solver
// @version     0.1
// @description Attempts to solve binary puzzles
// @copyright   http://creativecommons.org/licenses/by-sa/3.0/deed.en_US
// @require	http://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js
// @require     http://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js
// @resource    jQueryUICSS    http://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/themes/start/jquery-ui.css
// @include     http://www.binarypuzzle.com/*
// @run-at      document-start
// ==/UserScript==

// remove the alert
// var node = $("script").eq(0);
// var code = node.text();
// var result = code.replace(/alert('[\w\s.]*');/, '');
// node.text( result );
// console.log( code )

function new_alert(msg){
    $("#dialog").text(msg).dialog({
        modal: false,
        title: "Puzzle complete",
        buttons: {
            Ok: function(){ $(this).dialog("close") }
        }
    }).parent().find("div").css("float","none");
}

window.alert = function(msg){ new_alert(msg) } ;

if( typeof GM_getResourceText !== "undefined" ){
    var newCSS = GM_getResourceText ("jQueryUICSS");
    GM_addStyle (newCSS);
}

var rows;
var cols;
var vector_objects = Object();
var action_objects = Object();

var n_rows;
var n_cols;

var vector_queue = $([]);
var action_queue = $([]);

var message_counter = 0;

var found_action = false;
var vector_counter = 0;
var row_counter = 0;
var col_counter = 0;

var run_mode = "manual";

function load_vector_till_action(){

    if( found_action )
        vector_counter = 0;

    var v1;
    var v2;

    do {

        vector_counter++;

        v1 = new Vector( vector_counter, "row" );
        v2 = new Vector( vector_counter, "col" );

    } while( v1.is_complete() && v2.is_complete() && vector_counter <= n_rows );

    if( vector_counter > n_rows ){
        vector_counter = n_rows;
    }

    load_vector( v1 );
    load_vector( v2 );

    if( vector_counter == n_rows && !vector_queue.length )
        run_mode == "manual"

    found_action = false;

}

function message( text ){

    message_counter++;
    $("#message_column").prepend( text + "<br>");

}

function wash_vector_queue(){

    var i=0;

    var queue_washed = false;

    while( i<vector_queue.length ){

        var vec = vector_queue[i];

        if( vec.is_complete() ){
            vector_queue.splice( $.inArray( vec, vector_queue ), 1 );
            queue_washed = true;
        }
        else {
            i++;
            if( i >= vector_queue.length )
                break;
        }

    }

    return queue_washed;

}

function new_vector_from_cache( row_or_col, what ){

    var v = vector_objects[ what + "_" + row_or_col ];
    if( !v ){
        v = new Vector( row_or_col, what );
    }
    else {
    }

    return v;

}

function new_action_from_cache( cell, value ){

    var coord = coord_from_cell(cell);

    var s = "[" + coord + "]" + " => " + value;
    var a = action_objects[ s ];
    if( !a ){
        a = new Action( cell, value );
    }
    else {
    }

    return a;

}


function sync_vector_queue_to_table(){

    // strip vectors not in queue
    $("a.vector_button").each( function(){

        var b = $(this).button();
        var vec = b.data("vector");

        if( $.inArray( vec, vector_queue ) == -1 ){
            $(this).button("destroy");
            $(this).next("br").detach();
            $(this).detach();
        }

    });

    // send vectors to html
    vector_queue.each( function(){
        if( $( "#" + this.html_id() ).length == 0 )
            put_vector_in_table(this)
    });

}

function sync_action_queue_to_table(){

    // strip vectors not in queue
    $("a.action_button").each( function(){

        var b = $(this).button();
        var act = b.data("action");

        if( $.inArray( act, action_queue ) == -1 ){
            $(this).button("destroy");
            $(this).next("br").detach();
            $(this).detach();
        }

    });

    // send vectors to html
    action_queue.each( function(){
        if( $( "#" + this.html_id() ).length == 0 )
            put_action_in_table(this)
    });
}

function put_action_in_table(act){

    var b = $( '<a class="action_button" id="' + act.html_id() + '">' + act + '</a>' ).button().click( function(){dispatch_action(act) } ).appendTo("#action_column");
    b.after("<br>");
    b.data( "action", act );
    b.css( "width", "8em" );

}

function load_action(act){

    if( $.inArray( act, action_queue ) == -1 ){
        action_queue.push(act);
        sync_action_queue_to_table();
    }

}

function put_vector_in_table(vec){

    var b = $( '<a class="vector_button" id="' + vec.html_id() + '">' + vec.niceString() + '</a>' ).button().click( function(){ dispatch_vector(vec) }).appendTo("#vector_column");
    b.after("<br>");
    b.data( "vector", vec );
    b.css( "width", "8em" );

}

function load_vector(vec){

    if( vec.is_complete() ){
        return;
    }

    if( $.inArray( vec, vector_queue ) == -1 ){
        vector_queue.push(vec);
        sync_vector_queue_to_table();
    }

}

function dispatch_action(act){

    action_queue.splice( $.inArray( act, action_queue ), 1 );
    sync_action_queue_to_table();
    act.run();

    if( wash_vector_queue() )
        sync_vector_queue_to_table();

    if( action_queue.length == 0 && vector_queue.length == 0 )
        load_vector_till_action();

    go_go_gadget();

}

function dispatch_vector(vec){

    vector_queue.splice( $.inArray( vec, vector_queue ), 1 );
    sync_vector_queue_to_table();
    vec.solve();

    if( vector_queue.length == 0 && action_queue.length == 0 )
        load_vector_till_action();

    go_go_gadget();

}

function dispatch_a_vector(){

    if( vector_queue.length > 0 ){
        dispatch_vector( vector_queue[0] );
    }

}

function dispatch_an_action(){

    if( action_queue.length > 0 ){
        dispatch_action( action_queue[0] );
    }

}

function init_solver() {

    if( ! $("div.intekst") )
        return;

    // set up row and col lists
    n_rows = $("div.intekst div[id$=_1]").length;
    n_cols = $("div.intekst div[id^=cel_1]").length;

    rows = Array(n_cols);
    cols = Array(n_rows);

    for( var i=0; i<n_rows; i++ ){
        rows[i] = Array(n_cols);
    }
    for( var i=0; i<n_cols; i++ ){
        cols[i] = Array(n_rows);
    }

    // clicker event
    $("div.intekst div.puzzlecel").click( cell_clicker );

    // fill lists with divs
    $("div.intekst div.puzzlecel").each( function() {

        var coord = coord_from_cell(this);

        rows[ coord[0]-1 ][ coord[1]-1 ] = this;
        cols[ coord[1]-1 ][ coord[0]-1 ] = this;

    });

    // setup a container
    // $("div.intekst").after('<div id="solver">');
    // $("div.intekst").css( "float", "left" );
    // $("div.intekst").css( "margin-right", "2em" );
    // $("div.intekst").css( "margin-left", "15em" );

    $('<div id="solver">').appendTo( $("body") );
    $('<div id="dialog">').appendTo( $("body") );

    var f = $("#selectpuzzle");
    var d = $("div.intekst");

    var fpos = f.offset();
    var dpos = d.offset();

    $('<table>' +
      '<tr><td colspan="3"><form>' +
      '<div id="auto_buttons">' +
      '<input type="radio" name="autorun" id="autorun_off" value="manual" checked="checked"><label for="autorun_off">Manual</label>' +
      '<input type="radio" name="autorun" id="autorun_on" value="auto"><label for="autorun_on">Auto</label>' +
      '</div>' +
      '</form>' +
      '<a id="go_next">Next</a>' +
      '</td></tr>' +
      '<tr><td><a id="vector_button">Dispatch Vector</a></td>' +
      '<td><a id="action_button">Dispatch Action</a></td>' +
      '<th align="left"><a id="solver_messages">Messages</a></th></tr>' +
      '<tr><td id="vector_column"></td><td id="action_column"></td>' +
      '<td id="message_column"></td></tr>'
     ).appendTo("#solver");

    $("#auto_buttons input").click( go_go_gadget );
    $("#auto_buttons").buttonset();

    $("#vector_button").button().click( dispatch_a_vector ).css( "width", "10em" );
    $("#action_button").button().click( dispatch_an_action ).css( "width", "10em" );;
    $("#solver_messages").button().click( function(){ message("Clicking this button does nothing") } );

    $("#go_next").button().click( function(){
        $("select").eq(1).val( parseInt( $("select").eq(1).val() ) + 1 );
        $("select").eq(1).change();
    });

    $("#solver").css( "position", "absolute" );
    $("#solver").css( "top", fpos.top + d.position().top - 100 );
    $("#solver").css( "left", dpos.left + d.width() + 20 );
    $("#solver").css( "width", "50em" );
    var t = $("#solver table").css( "width", "100%" );
    $("#message_column").css( "width", "30em" );
    $("#message_column").css( "color", "gray" );

    $("a:contains('Start again')").click( function(){

        $("#message_column").html('');
        vector_queue = $([]);
        action_queue = $([]);
        sync_vector_queue_to_table();
        sync_action_queue_to_table();

        vector_counter = 0;
        load_vector_till_action();

    });

    load_vector_till_action();

    message( "Click 'Dispatch Action' when it populates" );
    message( "Click 'Dispatch Vector' to start stepwise solving" );

}

function coord_from_cell(div) {
    // returns 1-indexed coordinate

    // make sure its an element
    var div = $(div).get(0);

    if( ! div )
        return;

    var raw_coord = div.id.replace( "cel_", "" );
    var r_c = raw_coord.split("_");
    r_c[0] = parseInt( r_c[0] );
    r_c[1] = parseInt( r_c[1] );
    return r_c;

}

function cell_clicker(){

    var c = coord_from_cell(this);

    var v1 = new_vector_from_cache( c[0], "row" );
    var v2 = new_vector_from_cache( c[1], "col" );

    if( ! v1.is_complete() )
        load_vector( v1 );

    if( ! v2.is_complete() )
        load_vector( v2 );

}

function click_cell_till_value(cell,idx){

    var clicks = 0;

    while( $(cell).text().trim() != String(idx) ){
        $(cell).click();
        if( ++clicks >= 3 ){
            break;
        }
    }

}

function Action( cell, value ){

    // do it right if its a $ object
    var cell2 = $(cell).get(0);

    if( ! cell2 ){
        console.log( "received invalid cell input '" + cell + "'" )
        return;
        // throw "Invalid cell";
    }

    this.cell = cell2;
    this.value = value;

    this.run = function(){
        click_cell_till_value( cell2, value );
    }

    this.toString = function(){
        var coord = coord_from_cell(this.cell);
        return "[" + coord + "]" + " => " + this.value;
    }

    action_objects[ this.toString() ] = this;

    this.html_id = function(){
        var coord = coord_from_cell(this.cell);
        return "action_cell_" + coord.join("_");
    }

}

// row_or_col idx is 1-based
function Vector( row_or_col, what ){

    this.idx = parseInt(row_or_col);

    this.is_complete = function(){
        v = this.vector()
        return $.inArray( "", v ) == -1;
    }

    this.toString = function(){
        return this.what + "_" + this.idx;
    }

    this.niceString = function( prepare_for_more ){
        var s = this.what + " " + this.idx;
        if( prepare_for_more )
            s += ": ";
        return s;
    }

    this.message = function( m ){
        message( this.niceString(true) + m );
    }

    if( what != "row" && what != "col" )
        throw "'what' should be either 'row' or 'col'";

    this.what = String(what);

    vector_objects[ this.toString() ] = this;

    this.vector = function(){
        var v = [];
        var src = rows;
        if( this.what == "col" )
            src = cols;

        $(src[this.idx-1]).each( function( i,d ){ v[i] = $(this).text().trim() } );
        return v;
    }

    // 1-indexed
    this.cell_from_idx = function(idx){

        if( this.what == "row" )
            return $( "#cel_" + String(this.idx) + "_" + String(idx) );
        else if( this.what == "col" )
            return $( "#cel_" + String(idx) + "_" + String(this.idx) );

    }

    // util methods
    this.summary = function( inverse ){

        inverse = typeof inverse !== "undefined" ? inverse : false;

        var summary = [0,0];
        $(this.vector()).each( function(){ if( this != "" )summary[parseInt(this)]++ } );

        if( inverse ){
            summary[0] = this.length()/2 - summary[0];
            summary[1] = this.length()/2 - summary[1];
        }

        return summary;
    }

    this.html_id = function(){
        return "vector_button_" + this;
    }

    this.length = function(){
        if( this.what == "col" )
            return n_rows;
        else if( this.what == "row" )
            return n_cols;
    }

    this.derivative = function(){

        var diff = Array( this.length() );
        var v = this.vector();

        for( var i=0; i<this.length()-1; i++ ){

            el = v[i];

            if( el == "" )
                diff[i] = "";
            else if( v[i+1] == v[i] )
                diff[i] = 0;
            else
                diff[i] = 1;

        }

        return(diff)

    }

    this.blanks = function(){
        var s = this.summary(true);
        return s[0] + s[1]
    }

    this.first = function(){
        return this.vector()[0];
    }

    this.last = function(){
        return this.vector()[ this.length()-1 ];
    }

    this.is_not_filled = function(){
        return this.is_filled(true);
    }

    this.is_filled = function( inverse ){

        inverse = typeof inverse !== "undefined" ? inverse : false;

        var f = Array();
        var v = this.vector();
        for( var i=0; i<v.length; i++ ){
            if( String(v[i]) != "" ^ inverse ){
                f.push(i);
            }
        }

        return f;

    }

    this.missing = function(){
        return $.grep( this.vector(), function(el)el=="" ).length;
    }

    this.has_values = function(){
        return this.missing().length = this.length();
    }

    this.fill = function( what ){

        var what = parseInt(what);

        if( what != 1 && what != 0 )
            throw "'what' should be 1 or 0";

        var v = this.vector();

        for( var i=0; i<v.length; i++ ){

            if( v[i] == "" )
                this.setup_action( i+1, what );
        }

    }

    // reports the start of a 4-cell stretch that is not a given number
    // if returned index is negative, its the "special case of three", see +14 lines
    this.find_one_four_blank_stretch = function( not_number ){

        var has_blank=0;
        var blanks_in_interval=0;
        var s=this.summary();
        var blanks_in_total = this.blanks();
        var v=this.vector();
        var four_blank_start;
        for( var i=0; i<=v.length; i++ ){ // loop one too many to account for last cell too

            if( i<v.length &&
                String(v[i]) != String(not_number) ){
                has_blank++;
                if( String(v[i]) == "" )
                    blanks_in_interval++;
            }
            else {

                // also accept if this is 3rd and
                // there is one blank on any outside
                // also there must be given number on both sides

                // actually the blank under #2 need only be anywhere but in the interval

                if( has_blank == 3 && // 1st criterion
                    (
                        blanks_in_total - blanks_in_interval == 1
                    ) && // 2nd criterion
                    (
                        i>=4 && String(v[i-4]) == String(not_number) // other end is automatically covered since we're here
                    ) // 3rd criterion
                  ){

                    // find the one blank outside interval and return it negative
                    for( var j=0; j<v.length; j++ ){
                        if( (j<(this.length()-has_blank) || j>i) && String(v[j]) == "" )
                            return -(j+1);
                    }


                }
                else {
                    has_blank=0;
                    blanks_in_interval=0;
                }

            }

            if( has_blank == 4 ){
                four_blank_start = i-3;
            }

            if( has_blank>5 ){
                return;
            }

        }

        return four_blank_start;

    }

    // idx is 1-based
    this.setup_action = function( idx, value ){

        idx = parseInt( idx );
        value = String(value)

        if( this.vector()[idx-1] != value )
            load_action( new_action_from_cache( this.cell_from_idx(idx), value ) );

        found_action = true;

    }

    // solver logic
    this.check_pair = function(idx,direction){

        var v = this.vector();
        var d = this.derivative();

        for( var i=0; i<this.length()-1; i++ ){

            var cell_found = false;

            if( d[i] == "0" ){

                // check before
                if( i>=1 ){
                    if( v[i-1] == "" ){
                        cell_found = true;
                        this.setup_action( i, opposite(v[i]) );
                    }
                }

                // check after
                if( i < this.length()-2 ){
                    if( v[i+2] == "" ){
                        cell_found = true;
                        this.setup_action( i+3, opposite(v[i]) );
                    }
                }

                // nice message
                if( cell_found ){
                    this.message( "pair found at " + (i+1) + " and " + (i+2) );
                }

            }
        }
    }

    this.check_gap = function(){

        var v = this.vector();

        for( var i=1; i<v.length-1; i++ ){

            var el = v[i];

            if( el == "" && v[i-1] != "" && v[i-1] == v[i+1] ){
                this.message( "gap found at " + (i+1) )
                this.setup_action( i+1, opposite(v[i-1]) );
            }
        }


    }

    this.check_completness = function(){

        var s = this.summary();
        if( s[0] == this.length()/2 ){
            this.fill(1);
            this.message( "completed in 0's, fill up with 1's" );
        }
        else if( s[1] == this.length()/2 ){
            this.fill(0);
            this.message( "1 complete, fill with 0" );
        }
    }

    this.check_uniqueness = function(){

        var upper = n_cols;
        if( this.what == "col" )
            upper = n_rows;

        var filled = this.is_filled();
        var v = this.vector();

        // for now, handles only n-2
        if( this.missing() == 2 ){

            for( var i=0; i<upper; i++ ){

                var idx = i+1;

                if( idx != this.idx ){
                    var other = new_vector_from_cache( idx, this.what );
                    if( other.is_complete() ){

                        var ov = other.vector();

                        var match = true;
                        for( var j=0; j<filled.length; j++ ){
                            match = match && ov[ filled[j] ] == v[ filled[j] ];
                        }

                        if( match ){
                            var not_filled = this.is_not_filled();
                            for( var j=0; j<not_filled.length; j++ ){
                                this.setup_action( not_filled[j]+1, opposite( ov[not_filled[j]] ) );
                            }
                            this.message( "complets to keep unique from " + other.what + " " + other.idx  );
                            i = upper;
                        }

                    }
                }

            }

        }
        if( this.missing() == 3 ){ // and both 0's and 1's left

            var inverse_summary = this.summary(true);
            if( inverse_summary[0] != 0 && inverse_summary[1] != 0 ){ // 2 and 1 left


                for( var i=0; i<upper; i++ ){

                    var idx = i+1;

                    if( idx != this.idx ){
                        var other = new_vector_from_cache( idx, this.what );
                        if( other.is_complete() ){

                            var ov = other.vector();

                            var match = true;
                            for( var j=0; j<filled.length; j++ ){
                                match = match && ov[ filled[j] ] == v[ filled[j] ];
                            }

                            if( match ){
                                var not_filled = this.is_not_filled();

                                var number_to_enter = 0;
                                if( inverse_summary[1] == 2 )
                                    number_to_enter = 1;

                                for( var j=0; j<not_filled.length; j++ ){
                                    if( ov[ not_filled[j] ] == opposite( number_to_enter ) ){
                                        this.setup_action( not_filled[j]+1, number_to_enter );
                                        this.message( "needs '" + number_to_enter + "' at " + (not_filled[j]+1) +
                                                      " to keep unique from " + other.what + " " + other.idx  );
                                        i = upper;
                                        j = not_filled.length;
                                    }
                                }

                            } // if match

                        } // if other

                    } // for idx

                } // for var

            } // if inverse

        } // if this missing
    }

    this.check_endlogic = function (){

        // avoid having all 1's or all 0's on both ends
        var start_of_four;
        var number_to_enter;

        var s2 = this.summary(true);

        if( s2[0] == 1 ){
            var start_of_four_0 = this.find_one_four_blank_stretch( 0 );
            if( typeof start_of_four_0 != "undefined" ){
                start_of_four = start_of_four_0;
                number_to_enter = 1;
            }
        }
        else if( s2[1] == 1 ){
            var start_of_four_1 = this.find_one_four_blank_stretch( 1 );
            if( typeof start_of_four_1 != "undefined" ){
                start_of_four = start_of_four_1;
                number_to_enter = 0;
            }
        }

        // there must be only one missing of this number for this logic to be valid
        var s2 = this.summary( true );
        if( s2[opposite(number_to_enter)] != 1 )
            return;

        if( typeof start_of_four == "undefined" )
            return;

        var v = this.vector();

        if( start_of_four >= 0 ){ // a plain start of four

            if( String(v[start_of_four]) == "" ){
                this.setup_action( start_of_four+1, number_to_enter );
                this.message( "enter " + number_to_enter + " to avoid 3 identical in row" );
            }
            if( String(v[start_of_four+3]) == "" ){
                this.setup_action( start_of_four+4, number_to_enter );
                this.message( "enter " + number_to_enter + " to avoid 3 identical in row" );
            }

        }
        else if( start_of_four < 0 ){ // a special case where there is only 3
            this.setup_action( -start_of_four, number_to_enter );
            this.message( "enter " + number_to_enter + " to avoid 3 identical in row" );
        }

    }

    // the does-it-all
    this.solve = function(){

        if( this.is_complete() )
            return;

        this.check_completness();
        this.check_gap();
        this.check_pair();
        this.check_uniqueness();
        this.check_endlogic();
    }

}

function opposite( n ){

  if( String(n) == "" )
    return n;
  else if( n == "row" )
    return "col";
  else if( n == "col" )
    return "row";
  else if( parseInt(n) == 0 )
    return 1;
  else if( parseInt(n) == 1 )
    return 0;
  else if( typeof n == "undefined" )
    return n;
  else
    throw "Invalid input '" + n + "'";

}

function go_go_gadget(){

    run_mode = $("input[name='autorun']:checked").val();

    if( run_mode == "manual" )
        return;

    var a1 = $("a.action_button:first");

    setTimeout( function(){
        a1.click();
    }, 50 );

    if( a1.length )
        return;

    setTimeout( function(){
        $("a.vector_button:first").click();
    }, 50 );

}

$( function(){

    init_solver();

});
