var tt = (function() {
    var a = 1;
    console.log("hello world");

    function ttt() {
        console.log("internal: ",a);
    }

    return {
        ttt: ttt,
	a: a
    }
})();

module.exports = tt
