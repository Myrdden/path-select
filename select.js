(function() {
	'use strict';
	function charIs() {
		var chr = arguments[0];
		for (var i = arguments.length-1; i--;) {
			if (chr === arguments[i+1]) { return true; }
		}
		return false;
	}

	var inlineStartsWith = 'function startsWith(str, pred) {' +
    'if (typeof str !== "string") { if (typeof str === "undefined") { return false; } str = str.toString(); }' +
    'if (typeof pred !== "string") { if (typeof pred === "undefined") { return false; } pred = pred.toString(); }' +
		'if (str.length < pred.length) { return false; }'+
		'for (var i = 0; i !== pred.length; i++) { if (pred[i] !== str[i]) { return false; } }' +
		'return true;' +
	'}';

  var inlineEndsWith = 'function endsWith(str, pred) {' +
    'if (typeof str !== "string") { if (typeof str === "undefined") { return false; } str = str.toString(); }' +
    'if (typeof pred !== "string") { if (typeof pred === "undefined") { return false; } pred = pred.toString(); }' +
    'if (str.length < pred.length) { return false; }' +
    'var j = str.length-1;' +
    'for (var i = pred.length; i--;) { if (pred[i] !== str[j]) { return false; } j--; }' +
    'return true;' +
  '}';

  var inlineContains = 'function contains(str, pred) {'+
    'if (typeof str !== "string") { if (typeof str === "undefined") { return false; } str = str.toString(); }' +
    'if (typeof pred !== "string") { if (tyopeof pred === "undefined") { return false; } pred = pred.toString(); }' +
    'if (str.length < pred.length) { return false; }' +
    'var len = pred.length-1; var j = len;' +
    'for (var i = str.length; i--;) { if (j === 0) { return true; } if (str[i] === pred[j]) { j--; } else if (j < len) { j = len; } }' +
    'return false;' +
  '}';

  // Maybe too lenient
  // function inlineIsArray(x) { return '(typeof '+x+'==="object")&&'+x+'.constructor===Array||Object.prototype.toString.call('+x+')==="[object Array]"||'+x+'.length===0||'+x+'.length>0&&'+x+'.hasOwnProperty(0)&&'+x+'.hasOwnProperty('+x+'.length-1)'; }
  function inlineIsArray(x) { return '(typeof '+x+'==="object")&&'+x+'.constructor===Array||Object.prototype.toString.call('+x+')==="[object Array]"'; }

	function matchExpression(pred) {
		for (var i = pred.length; i--;) {
			if (!charIs(pred[i],'0','1','2','3','4','5','6','7','8','9','-',':')) { return 2; }
			if (charIs(pred[i], ':')) {
				var twoOfThem = false;
				for (var j = i; j--;) {
					if (pred[j] === ':') { if (twoOfThem) { throw "Too many ':' in [" + pred + ']'; } twoOfThem = true; }
					else if (!charIs(pred[j],'0','1','2','3','4','5','6','7','8','9','-')) { throw 'Non-numeric in [' + pred + ']'; }
				}
				return 1;
			}
		}
		return 0;
	}

  var totalVars; var totalLoops; var usingStartsWith; var usingEndsWith; var usingContains;

	var ops = {
		'!': '!', '*': '*', '/': '/', '%': '%', '+': '+', '-': '-', '<': '<',
		'<=': '<=', '>': '>', '>=': '>=', '=': '==', '==': '==', '!=': '!=',
		'^=': 'startsWith(', '$=': 'endsWith(', '*=': 'contains(', '&&': '&&', '||': '||'
	}
	function parsePredicate(pred, vars, loops) {
		var ex = '';
		var exp = [];
		var depth = 0;
		var inString = false;
		for (var i = pred.length; i--;) {
			if (depth === 0 && charIs(pred[i],'=','(',')','&','|','!','>','<','*','/','%','+','-','^','$')) {
				if (ex !== '') { exp.push(ex); ex = ''; }
				var op = pred[i];
				do { i--; op = pred[i] + op; }
				while (charIs(pred[i],'=','(',')','&','|','!','>','<','*','/','%','+','-','^','$'));
        i++; op = op.substring(1);
				if ((op in ops) || op === ')' || op === '(') { exp.push(op); }
				else { throw "Unknown operator '" + op + "'"; }
			} else {
				if (charIs(pred[i], ']', '}')) { depth += 1; }
				else if (charIs(pred[i], '[', '{')) { depth -= 1; }
				else if (pred[i] === '"' || pred[i] === "'") {
					if (inString) { depth -= 1; inString = false; }
					else { depth += 1; inString = true; }
				}
				if (pred[i] !== ' ') { ex = pred[i] + ex; }
			}
		}
		if (ex !== '') { exp.push(ex); }

    var sels = [];
    var selNum = 0;
		for (var i = exp.length; i--;) {
			if (exp[i] in ops) {
				if (charIs(exp[i][0],'^','$','*') & exp[i][1] === '=') {
          if (exp[i][0] === '^') { usingStartsWith = true; }
          else if (exp[i][0] === '$') { usingEndsWith = true; }
          else { usingContains = true; }
					var op = ops[exp[i]];
					exp[i] = exp[i+1] + ',';
					exp[i-1] = exp[i-1] + ')';
					exp[i+1] = op;
				} else { exp[i] = ops[exp[i]]; }
			}
			else if (charIs(exp[i][0],'"',"'",'(',')','0','1','2','3','4','5','6','7','8','9') || exp[i] === 'true' || exp[i] === 'false') { continue; }
      else {
        sels.push('s'); sels.push(vars+selNum); sels.push('=[];');
        sels.push(evaluate(exp[i], [], vars, loops, ('s'+(vars+selNum))).join(''));
        sels.push('if(s'); sels.push(vars+selNum); sels.push('.length===0){s'); sels.push(vars+selNum); sels.push('=null;}');
        sels.push('else if(s'); sels.push(vars+selNum); sels.push('.length===1){s'); sels.push(vars+selNum);
        sels.push('=s'); sels.push(vars+selNum); sels.push('[0];}');
        exp[i] = 's' + (vars+selNum);
        selNum += 1;
      }
		}
    return [sels.join(''), exp.reverse().join('')];
  }

	function evaluate(pred, fn, vars, loops, dest) {
    if (!pred.length) {
      fn.push(dest); fn.push('.push(v'); fn.push(vars); fn.push(');');
    } else {
      var ex = '';
      var type = 0;
      var depth = 0;
      var i = 0;

      if (pred[0] === '[') {
        type = 1; i++;
        while (i !== pred.length) {
          if (depth === 0 && pred[i] === ']') { i++; break; }
          else if (pred[i] === '[') { depth += 1; }
          else if (pred[i] === ']') { depth -= 1; }
          else { ex += pred[i]; }
          i++;
        }
      } else {
        while (i !== pred.length) {
          if (pred[i] === '.') { i++; break; }
          else if (pred[i] === '[') { break; }
          else { ex += pred[i]; }
          i++;
        }
      }

      var next;
      if (pred[i] == '.') { next = pred.slice(i+1); }
      else { next = pred.slice(i); }

      if (type === 0) {
        // if (isArray(v0)) {
        //   i0 = 0; len0 = v0.length;
        //   while (i0 !== len0) {
        //     v1 = v0[i0];
        //     if (v1['expression']){
        //       v2 = v1['expression'];
        //       NEXT
        //     }
        //     i0++;
        //   }
        // } else if(v0['expression']) {
        //   v2 = v0['expression'];
        //   NEXT
        // }
        totalLoops = loops + 1;
        totalVars = vars + 2;
        fn.push('if('); fn.push(inlineIsArray('v'+vars)); fn.push('){'); fn.push('i'); fn.push(loops); fn.push('=0;len');
        fn.push(loops); fn.push('=v'); fn.push(vars); fn.push('.length;');
        fn.push('while(i'); fn.push(loops); fn.push('!==len'); fn.push(loops); fn.push('){v');
        fn.push(++vars); fn.push('=v'); fn.push(vars-1); fn.push('[i'); fn.push(loops); fn.push('];');
        fn.push('if(v'); fn.push(vars); fn.push('["'); fn.push(ex); fn.push('"]){v');
        fn.push(++vars); fn.push('=v'); fn.push(vars-1); fn.push('["'); fn.push(ex); fn.push('"];');
        fn = evaluate(next, fn, vars, loops+1, dest);
        fn.push('}i'); fn.push(loops); fn.push('++;}}else if('); fn.push('(typeof v'); fn.push(vars-2); fn.push(')==="object"){v');
        fn.push(vars); fn.push('=v'); fn.push(vars-2); fn.push('["'); fn.push(ex); fn.push('"];if(v'); fn.push(vars); fn.push('!=null){');
        fn = evaluate(next, fn, vars, loops, dest);
        fn.push('}}');
      } else if (type === 1) {
        type = matchExpression(ex);
        if (type === 2) { // Predicate (i.e. [something == somethingElse])
          // if (isArray(v0)) {
          //   i0 = 0; len0 = v0.length;
          //   while (i0 !== len0) {
          //     v1 = v0[i0];
          //     if (predicate(v1)) {
          //       NEXT
          //     }
          //     i0++;
          //   }
          // } else if (object && predicate) {
          //   v1 = v0;
          //   NEXT
          // }
          totalLoops = loops + 2;
          totalVars = vars + 1;
          fn.push('if('); fn.push(inlineIsArray('v'+vars)); fn.push('){'); fn.push('i'); fn.push(loops); fn.push('=0;len');
          fn.push(loops); fn.push('=v'); fn.push(vars); fn.push('.length;');
          fn.push('while(i'); fn.push(loops); fn.push('!==len'); fn.push(loops); fn.push('){v');
          fn.push(++vars); fn.push('=v'); fn.push(vars-1); fn.push('[i'); fn.push(loops); fn.push('];');
          var p1 = parsePredicate(ex, vars, loops+1);
          var p2 = parsePredicate(ex, vars-1, loops+1);
          fn.push(p1[0]); //fn.push('console.log(v4); console.log(v5); console.log(v6);');
          fn.push('if('); fn.push(p1[1]); fn.push('){');
          fn = evaluate(next, fn, vars, loops+1, dest);
          fn.push('}i'); fn.push(loops); fn.push('++;}}else if('); fn.push('(typeof v'); fn.push(vars-1); fn.push(')==="object"){v');
          fn.push(vars); fn.push('=v'); fn.push(vars-1); fn.push(';');
          fn.push(p2[0]);
          fn.push('if('); fn.push(p2[1]); fn.push('){');
          fn = evaluate(next, fn, vars, loops, dest);
          fn.push('}}');
        } else if (type === 1) { // Range (i.e. [5:2:2])
          totalVars = vars + 1;
          var parts = ex.split(':');
          parts[0] = parts[0] === '' ? '0' : parts[0];
          if (parts.length === 3 && parts[2] !== '1' && parts[2] !== '') {
            totalLoops = loops + 1;
            parts[0] = parts[0] === '' ? '0' : parts[0];
            parts[1] = parts[1] === '' ? ('v' + vars + '.length') : parts[1];
            if (parts[2] < 0) {
              parts[2] = 0 - parts[2];
              // if (isArray(v0) {
              //   v1 = []; i0 = ex2; len0 = ex1;
              //   while (i0 >= len0) {
              //     if ()
              //     i0 -= ex3;
              //   }
              // }
            } else {
              // if (isArray(v0) {
              //   v1 = []; i0 = ex1; len0 = ex2;
              //   while (i0 <= len0) {
              //
              //     i0 += ex3;
              //   }
              // }
            }
          } else if (parts[1] === '') {
            // if (isArray(v0) {
            //   v1 = v0.slice(ex1);
            //   if (v1.length) {
            //     NEXT
            //   }
            // }
            fn.push('if('); fn.push(inlineIsArray('v'+vars)); fn.push('){v'); fn.push(++vars); fn.push('=v'); fn.push(vars-1);
            fn.push('.slice('); fn.push(parts[0]); fn.push(');if(v'); fn.push(vars); fn.push('.length){');
            fn = evaluate(next, fn, vars, loops, dest);
            fn.push('}}');
          } else {
            // if (isArray(v0)) {
            //   v1 = v0.slice(ex1, ex2);
            //   if (v1.length) {
            //     NEXT
            //   }
            // }
            fn.push('if('); fn.push(inlineIsArray('v'+vars)); fn.push('){v'); fn.push(++vars); fn.push('=v'); fn.push(vars-1);
            fn.push('.slice('); fn.push(parts[0]); fn.push(','); fn.push(parts[1]); fn.push(');if(v'); fn.push(vars); fn.push('.length){');
            fn = evaluate(next, fn, vars, loops, dest);
            fn.push('}}');
          }
        } else { // Index (i.e. [5])
          totalVars = vars + 1;
          // if (isArray(v0) && v0.length >= expression) {
          //   v1 = v0[expression]; OR v0[v0.length-expression]; if expression negative
          //   if (v1 != null) {
          //     NEXT
          //   }
          // }
          if (ex < 0) { ex = 'v' + vars + '.length-' + (0 - ex); }
          fn.push('if('); fn.push(inlineIsArray('v'+vars)); fn.push('&&v'); fn.push(vars); fn.push('.length>='); fn.push(ex);
          fn.push('){v'); fn.push(++vars); fn.push('=v'); fn.push(vars-1); fn.push('['); fn.push(ex); fn.push('];if(v');
          fn.push(vars); fn.push('!=null){');
          fn = evaluate(next, fn, vars, loops, dest);
          fn.push('}}');
        }
      }
    }
    return fn;
	}

	var cache = {};
  var cacheKeys = [];

	function select(pred, obj) {
		if (!typeof pred === 'string') { throw 'First argument of query() must be a string.'; }
		if (typeof obj === 'undefined') { return function() { select.apply(undefined, str, arguments); } }
		if (!typeof obj === 'object') { return obj; }
		var args;
		if (arguments.length > 2) { args = Array.prototype.slice.call(arguments, 2); }

		if (pred in cache) { return cache[pred](obj, args); }
    totalVars = 0; totalLoops = 0; usingStartsWith = false; usingEndsWith = false; usingContains = false;
		var fn = evaluate(pred.split(''), ['var result = [];var i0; var len0;', [], []], 0, 0, 'result');
    var i = 1;
    while (i <= totalVars) { fn[1].push('var v' + i + ';'); if(i <= totalLoops) { fn[1].push('var i'+i+';var len'+i+';'); } i++; }
    fn[1] = fn[1].join('');
    if (usingStartsWith) { fn[2].push(inlineStartsWith); }
    if (usingEndsWith) { fn[2].push(inlineEndsWith); }
    if (usingContains) { fn[2].push(inlineContains); }
    fn[2] = fn[2].join('');
    fn.push('if(result.length===0){return undefined;}else if(result.length===1){return result[0];}return result;');
    cache[pred] = Function('v0, args', fn.join(''));
    if (cacheKeys.push(pred) > 1000) { delete cache[cacheKeys.shift()]; }
		return cache[pred](obj, args);
	}

	if (typeof module === 'object' && typeof module.exports === 'object') {
		module.exports = select;
	} else if (typeof modules === 'object') {
		modules.define('', function(provide) { provide(select); });
	} else if (typeof define === 'function') {
		define(function(require, exports, module) { module.exports = select; });
	} else {
		window.select = select;
	}
})();