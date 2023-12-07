/************************************************
Creates linguistic glosses
using tables or other structures

2020 Alejandro Rojo Gualix

Creative Commons license
CC BY-NC Attribution & Non-commercial
*************************************************/

/*
Toma listas de objetos, cada uno con las siguientes propiedades
Requires a object with properties:
    text gloss translation
*/

function TableOverflow() {
    // checks tables horizontal overflow. If it overflows create an horizontal scrollable container
    $('table.linguistic_gloss').each(function (i, table) {
        var table = $(table);
        var parent = table.parent(); //table.closest("section");
        if (table.width() > parent.width()) {
            // console.log(table, table.width());
            $('<div class="horizontalOverflowContainer"></div>').insertBefore(table).append(table);
            /*
            width: 100%;
            overflow-x: scroll;
            */
        }

    });
}

// Converts words to td elements
function createTd(data) {
    if (Array.isArray(data)) {
        // Already divided
        parts = data
    } else {
        parts = data.split(' ')
    }
    return '<td>' + parts.join('</td><td>') + '</td>';
}


function createTablesFromData(data, properties_selection=[]) {
    /* properties object to columns
    */
    // console.log(data);
    tbodyList = [];
    
    jQuery.each(data, function (index, item) {
        // Itera sobre las propiedades del objeto para crear las celdas del encabezado
        tbodyList.push(`<table class="linguistic_gloss">`)
        // tbodyList.push(`<tbody>`)
        if (properties_selection.length) {
            $.each(properties_selection, function(index, key) {
                tbodyList.push(`<tr class="${key}"><td>${item[key]}</td></tr>`)
            });
        } else {
        $.each(item, function(key, value) {
            tbodyList.push(`<tr class="${key}"><td>${value}</td></tr>`)
            // $('<th>').text(propiedad).appendTo(encabezadoFila);
        });
        }
        // tbodyList.push(`</tbody>`)
        tbodyList.push(`</table>`)
    });
    let contents = tbodyList.join('\n');
    return contents
    return `<table class="linguistic_gloss">${contents}</table>`
}


function createDataFromTables(properties_selection=[]) {
    // linguistic_gloss not glossed yet

    var result = []
    // antes de glosarlas not(.glossed), de lo contrario habría que hacer join
    $('table.linguistic_gloss:not(.glossed)').each(function (i, table) {
        var text = $(table).find("tr.text td");
        var gloss = $(table).find("tr.gloss td");
        var translation = $(table).find("tr.translation td");
        // get translation row
        result.push({
            text: text.text(),
            gloss: gloss.text(),
            translation: translation.text()
        });
    });

    return result
}



function createLinguisticGlosses() {
    // linguistic_gloss not glossed yet
    $('table.linguistic_gloss:not(.glossed)').each(function (i, table) {
        // get translation row
        var translation = $(table).find("tr.translation td");

        // sólo convierte las que tengan un sólo td. Y translation no se divide
        var divisible_cells = $(table).find("tr:not(.translation) td:only-child");
        if (divisible_cells.length == 1) return true; // continue to next object because there is no need to correlate data

        // 1:1 divisible_cells - listOfListOfWords
        var listOfListOfWords = []; // list[list[str]] list of word lists
        divisible_cells.each(function (i, obj) {
            // var words = $(obj).text().split(' ');
            // split by spaces (use . or - for grouping metalanguage glosses) 
            var words = $(obj).text().split(/\s+/);
            listOfListOfWords.push(words);
        });

        // determina máximo de columnas
        lengths = listOfListOfWords.map(x => x.length);
        columns = new Set(lengths);
        // consensus not reached
        if (columns.length > 1) {
            console.error(divisible_cells, "table.linguistic_gloss tr:not(.translation) td:only-child\t have different words count");
        }
        // will take max division
        maxcol = Math.max(...columns);//Array.from(columns));
        // console.log(table, listOfListOfWords, lengths, columns, maxcol);

        var newHtml = '';
        const createDivs = false;
        if (createDivs) {
            transposedTable = transpose(listOfListOfWords);
            console.log(table, transposedTable);
            newHtml = '<tbody><tr><td class="row_gloss">' + transposedTable.map(entry => '<div class="word_gloss"><div>' + entry.join('</div><div>') + '</div></div>').join('') + '</td></tr></tbody>';
            $(newHtml).prependTo($(table));
            console.log(newHtml);
        } else { // <<<<<<<<<<<<<
            divisible_cells.each(function (i, obj) {
                newHtml = createTd(listOfListOfWords[i]);
                // console.log(obj, newHtml);
                // replace html content
                $(obj).parent().html(newHtml);
            });

            translation.attr('colspan', maxcol);
        }


        $(table).addClass("glossed");

    });

    TableOverflow();
}


