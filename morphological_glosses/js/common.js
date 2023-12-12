/************************************************
Common functions

I'm thankful for the code I've found and used here
The rest was created by me

2018- Alejandro Rojo Gualix

Creative Commons license
CC BY-NC Attribution & Non-commercial
*************************************************/


/*
SPLIT LINES
            var lines = obj.value.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/gm);
https://stackoverflow.com/questions/5034781/js-regex-to-split-by-line
As for what constitutes a newline, it's even worse than that. According to the Unicode Consortium we should always use (\r\n|[\n\v\f\r\x85\u2028\u2029]), no matter what platform the software runs on, or where the data comes from
*/
const newLineRegex = /\r\n|[\n\v\f\r\x85\u2028\u2029]/gm;


/*************************************************
 *                 READ FILES
 *************************************************/

function parseCSV(data, separator = '\t') {
  var table = [];
  // Procesa el contenido para convertirlo en un formato manejable
  var filas = data.split('\n');
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].trim()) {
      var columns = filas[i].split(separator);
      table.push(columns);
    }
  }
  return table;
}

function parseJSON(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
}


function readInputFile(e, callbackFunction) {
  /* - reads file from input file element
  - returns data to a callback function
  */
  inputElement = e.target;
  // console.log(readInputFile, inputElement);
  let files = $(inputElement).prop('files');

  if (files) {
      let file = files[0];
      let extension = file.name.split('.').pop();
      // console.log(extension);
      var reader = new FileReader();
      reader.onload = function (e) {
          let parsedData = e.target.result;
          /*
          if (file.type == "application/json") {
              try {
                  parsedData = JSON.parse(parsedData);
              } catch (error) {
                  console.error('Error al analizar el archivo como JSON:', error);
                  return;
              }
          }
          */
          callbackFunction(parsedData);
      }
      reader.readAsText(file);
      // reader.readAsBinaryString(file); //as bit work with base64 for example upload to server
      // reader.readAsDataURL(file);
  }
}


function loadPlainFile(url) {
  let data = undefined;
  $.ajax({
    url: url,
    dataType: "text",
    async: false,
    success: function (contents) {
      console.log("File loaded:", url);
      data = contents;
      // return data;
    },
    error: function () {
      console.error("Error loading file:", url);
    }
  });
  return data;
}

/* DEPRECATED
// alternative: Promise
// return new Promise(resolve => { resolve(data); }
function loadJSON(url) {
  let data = undefined;
  $.ajax({
    url: url,
    dataType: 'json',
    async: false,
    success: function (contents) {
      console.log("File loaded:", url);
      data = contents;
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error loading file:", url);
    }
  });
  return data;

}
*/

function hyperlinkDownload(id, filename, text, type = "text/plain") {
  // DEPRECATED in favour of DownloadFile
  /*
  types:
  text/plain
  application/json
  text/csv;charset=utf-8;'
  */
  var obj = document.getElementById(id);

  var blob = new Blob([text], { type: type });
  obj.href = window.URL.createObjectURL(blob);
  obj.download = filename;
  // obj.click(); // without asking the user to do obj right click

}

function DownloadFile(data, filename, type = "text/plain") {
  /*
  types:
  - text/plain
  - application/json
  - text/csv;charset=utf-8;'
  */
  var blob = new Blob([data], { type: type });
  const url = URL.createObjectURL(blob);

  // Crea un enlace para descargar el archivo JSON
  var enlaceDescarga = document.createElement('a');
  enlaceDescarga.href = url;
  enlaceDescarga.download = filename;
  // enlaceDescarga.setAttribute('href', url);
  enlaceDescarga.style.visibility = 'hidden';
  document.body.appendChild(enlaceDescarga);
  enlaceDescarga.click();
  // Elimina el enlace después de hacer clic
  document.body.removeChild(enlaceDescarga);
}

/*************************************************
 *                     
 *************************************************/
/* USE CSS CHECK slabtext.html
  textarea {
      resize: none;
      overflow: hidden;
  }
*/
function onkeyup_textarea_vertical_fit() {
  // if several arguments are provided max height is calculated  + 10
  if (arguments.length == 1) {
    arguments[0].style.height = (arguments[0].scrollHeight) + "px";
  } else {
    var maxheight = 0;
    for (let i = 0; i < arguments.length; i++) {
      var obj = arguments[i];
      maxheight = Math.max(maxheight, obj.scrollHeight);
    }
    for (let i = 0; i < arguments.length; i++) {
      var obj = arguments[i];
      obj.style.height = (maxheight) + "px";
    }
  }

  // 
}

function textAreaAdjust(element) {
  element.style.height = "1px";
  element.style.height = (25 + element.scrollHeight) + "px";
  // console.log(element);
}


function typeInTextarea(newText, el = document.activeElement) {
  el.focus();
  const [start, end] = [el.selectionStart, el.selectionEnd];
  el.setRangeText(newText, start, end, 'select');
  el.selectionStart = el.selectionEnd
}




// translation-highlighter.js
$.fn.extend({
  insertAtCaret: function (myValue) {
    this.each(function () {
      if (document.selection) {
        this.focus();
        var sel = document.selection.createRange();
        sel.text = myValue;
        this.focus();
      } else if (this.selectionStart || this.selectionStart == '0') {
        var startPos = this.selectionStart;
        var endPos = this.selectionEnd;
        var scrollTop = this.scrollTop;
        this.value = this.value.substring(0, startPos) +
          myValue + this.value.substring(endPos, this.value.length);
        this.focus();
        this.selectionStart = startPos + myValue.length;
        this.selectionEnd = startPos + myValue.length;
        this.scrollTop = scrollTop;
      } else {
        this.value += myValue;
        this.focus();
      }
    });
    return this;
  }
});

/*************************************************
 *                     HTML
 *************************************************/
/*   <!-- dynamically created table of contents -->
copy
    <script>
        createTableOfContents();
    </script>
*/
var createTableOfContents = function (caption = 'Contents') {
  var html = '';
  $("h1, h2, h3, h4, h5, h6").each(function () {
    var el = $(this);
    const title = el.text();
    var id = el.attr('id');
    if (!id) {
      id = 'h' + guidGenerator();
      el.attr("id", id);
    }
    var level = el.prop("tagName").substring(1);
    console.log(title);
    html += `<li style="padding: 0 ${(level - 1).toString()}em;">
    <a href="#${id}">${title}</a>
    </li>`;
  });
  if (html) {

    $('body').prepend(`
  <!-- dynamically created table of contents -->
  <aside class="TableOfContents">
    <details>
        <summary>${caption}</summary>
        <div class="content">
            <nav role='navigation' class='table-of-contents'>
                <ul>${html}
                </ul>
            </nav>
        </div>
    </details>
  </aside>`);
  }
}


// https://stackoverflow.com/questions/15164655/generate-html-table-from-2d-javascript-array#15164796
function makeTableHTML(matrix) {
  let result = ['<table>'];
  for (let row of matrix) {
    result.push('<tr>');
    for (let cell of row) {
      result.push(`<td>${cell}</td>`);
    }
    result.push('</tr>');
  }
  result.push('</table>');
  return result.join('\n');
}

function makeTableHTMLHeaders(matrix, horizontalHeader = false, verticalHeader = false) {
  var result = ['<table>'];
  for (let row = 0; row < matrix.length; row++) {
    result.push('<tr>');
    for (let col = 0; col < matrix[row].length; col++) {
      if ((horizontalHeader && row == 0) || (verticalHeader && col == 0)) {
        result.push(`<th>${matrix[row][col]}</th>`);
      } else {
        result.push(`<td>${matrix[row][col]}</td>`);
      }

    }
    result.push('</tr>');
  }
  result.push('</table>');
  return result.join('\n');
}

/*************************************************
 *                      URL PARSING
 *************************************************/
// SET with  document.location.search = 'q=' + value;

/* 
file:///media/WATASHI/Ling%C3%BC%C3%ADstica/MI-sitio-web/learning-tools/dictionary21/dictionary.html?q=see#graphSS
var url = `https://en.wikipedia.org/w/api.php
  ?
  action=query
  &callback=?
  &format=json
  &formatversion=2
  &prop=pageimages|pageterms
  &piprop=thumbnail
  &pithumbsize=600
  &titles=bacteria`
 */
// hierarchy ? &q=v |+
// use regex
var parseURLParameters = function () {
  var sPageURL = window.location.search.substring(1);
  if (sPageURL.trim() == '') return undefined;

  var result = {};
  sPageURL = decodeURI(sPageURL);
  console.log(sPageURL);
  var sURLVariables = sPageURL.split('&');
  for (let i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName.length != 2) continue;
    // result[sParameterName[0]] = sParameterName[1].split('+') ;
    result[sParameterName[0]] = sParameterName[1].split(/[+|]+/);
  }
  return result;
}


var GetURLParameter = function (sParam) {
  var sPageURL = window.location.search.substring(1);
  var sURLVariables = sPageURL.split('&');
  // alert(sURLVariables);
  for (let i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam) {
      return sParameterName[1].split('+');
    }
  }
}

function setURLParameter(key, value) {
  /*
  Adds param after ? ?param=value&param2=value2 
  */
  if (history.pushState) {
    var params = new URLSearchParams(window.location.search);
    params.set(key, value);
    var newUrl =
      // window.location.origin +
      window.location.pathname
      + '?' + params.toString();
    window.history.pushState({ path: newUrl }, '', newUrl);
  }
}



function copyToClipboard(data) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(data).select();
  document.execCommand("copy");
  $temp.remove();
}

/*************************************************
 *                      RANDOM
 *************************************************/
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277,
    h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

/*
// Create Class
if (seed_string) {
    // Create cyrb128 state:
    var seed = cyrb128(seed_string);
    // Four 32-bit component hashes provide the seed for sfc32.
    var random_function = sfc32(seed[0], seed[1], seed[2], seed[3]);
} else {
    var random_function = Math.random;
}
// console.log(rand(), rand(), rand());   
*/

function getRandomWithFunction(fun, min, max) {
  return fun() * (max - min) + min;
}

function getRandom(min, max) {
  return getRandomWithFunction(Math.random, min, max);
  return Math.random() * (max - min) + min;
}
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

/*************************************************
 *                    ARRAYS
 *************************************************/
// handles the mapping of terminal items in a nested list
// provide a function to handle the mapping of terminal items 
function mapRecursive(expr,
  terminal_function = function (expr) { return expr; },
  ...args) {

  var newarray = [];
  if (Array.isArray(expr)) {
    for (let n = 0; n < expr.length; n++) {
      newarray.push(mapRecursive(expr[n], terminal_function, ...args));
    }
    return newarray;
  } else {
    return terminal_function(expr, ...args);
  }
}

// CURRYING
// key dictionary key
// field dictionary field
var mapRecursive_dict = function (dict, field) {
  return function (key) {
    if (key in dict && field in dict[key]) {
      return dict[key][field];
    } else {
      return key; // don't throw an error
    }
  };
}

var mapValue = function (value, sourceArray, targetArray) {
  if (sourceArray.length != targetArray.length) throw 'non-mappable arrays: they have different length';
  var index = sourceArray.indexOf(value);
  if (index != -1) {
    return targetArray[index];
  } else {
    return null;
  }
}
/* e.g.
mapvalues("á", "áéíóú", "aeiou")
"é"  returns "e"
FILTER
*/
var mapValues = function (valueArray, sourceArray, targetArray) {
  var result = '';
  for (let n = 0; n < valueArray.length; n++) {
    var output = mapValue(valueArray[n], sourceArray, targetArray);
    // console.log(valueArray, sourceArray, index, targetArray);
    if (output === null) return null
    if (output !== null) result += output;
  }
  return result;
}


// const deepFlatten = arr => arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(deepFlatten(val)) : acc.concat(val),  []);
// https://stackoverflow.com/questions/10865025/merge-flatten-an-array-of-arrays?page=3&tab=oldest#tab-top
// because ES6 method requires depth .flat(depth);
const deepFlatten = arr =>
  arr.reduce(
    (acc, val) =>
      Array.isArray(val)
        ? acc.concat(deepFlatten(val))
        : acc.concat(val),
    []
  );


// Used for: translation showing syntax  ...
function Delimiters_by_depth_join(arr, delimiters = [''], depth = 0) {
  let delimiter = delimiters[Math.min(depth, delimiters.length - 1)];

  return arr.map((item) => {
    if (Array.isArray(item)) {
      return Delimiters_by_depth_join(item, delimiters, depth + 1);
    } else {
      return item
    }
  }).join(delimiter);
}


// Used for: translation showing syntax  ...
function joinArraysAfterMaxDepth(arr, depth, delimiter = '') {
  if (depth === 0 || !Array.isArray(arr)) {
    return deepFlatten(arr).join(delimiter);
  } else {
    return arr.map((item) => {
      if (Array.isArray(item)) {
        return joinArraysAfterMaxDepth(item, depth - 1, delimiter);
      } else {
        return item
      }
    });
  }
}


function joinArraysAfterMaxDepth_TEST(depth) {
  let test_array = [
    1,
    [2, [3, 4]],
    [5, 6],
    [[[7, 8], 9]]
  ];
  joinedArray = joinArraysAfterMaxDepth(test_array, depth);
  /*
  0: 1
   1: Array [ 2, "34" ]
   2: Array [ 5, 6 ]
   3: Array [ "789" ]
  */
  console.log(joinedArray);

  test_array = [
    1,
    [2, [3, 4]],
    [5, 6]
  ];
  joinedArray = joinArraysAfterMaxDepth(test_array, depth);
  console.log(joinedArray);
  /*
  0: 1
  1: Array [ 2, "34" ]
  2: Array [ 5, 6 ]
  }
  */
}

/*
joinArraysAfterMaxDepth_TEST(2);
joinArraysAfterMaxDepth_TEST(3);
*/


function transpose(matrix) {
  return matrix[0].map((col, i) => matrix.map(row => row[i]));
}

/*************************************************
 *                      MISC
 *************************************************/
/*
/* eg.
          var octave_notlilypond = [0, 1, 2, 3, 4, 5, 6, 7]
          var octave_lilypond = [",,,", ",,", ",", "", "'", "''", "'''", "''''"];
*/
function htmlToText(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* translation-highlighter.js */
function b64DecodeUnicode(str) {
  try {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (err) {
    alert("Error: data must be formatted as UTF-8\nConvert it or copy & paste its contents.");
  }
}


// https://stackoverflow.com/questions/4912788/truncate-not-round-off-decimal-numbers-in-javascript
truncateDecimals = function (number, digits) {
  var multiplier = Math.pow(10, digits),
    adjustedNum = number * multiplier,
    truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);

  return truncatedNum / multiplier;
};



function XOR(a, b) {
  return (a || b) && !(a && b);
}



function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
/*
String.prototype.endsWith = function(suffix) {};
*/



/* async function someFunction() {
    await delay(300);
    DoSomething();
} */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}