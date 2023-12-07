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
