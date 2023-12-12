/************************************************
Creates linguistic glosses
using tables or other structures

2020- Alejandro Rojo Gualix
2023-12 updated

Creative Commons license
CC BY-NC Attribution & Non-commercial
*************************************************/

/*
Dos situaciones:
1. no tenemos tablas pero tenemos un objeto con atributos que podemos corresponder con filas
2. tenemos las tablas con filas

Luego crearemos las columnas dividiendo de alguna manera (por palabras-espacios por ejemplo)

Requires an object with properties: text gloss translation
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


function createTablesFromData(data, properties_selection = []) {
    /* creates rows with one column
    properties object to columns
    */
    tbodyList = [];
    jQuery.each(data, function (index, item) {
        tbodyList.push(`<table class="linguistic_gloss">`)
        // tbodyList.push(`<tbody>`)
        if (properties_selection.length) {
            // just selected properties
            $.each(properties_selection, function (index, key) {
                tbodyList.push(`<tr class="${key}"><td>${item[key]}</td></tr>`)
            });
        } else {
            // all
            $.each(item, function (key, value) {
                tbodyList.push(`<tr class="${key}"><td>${value}</td></tr>`)
                // $('<th>').text(propiedad).appendTo(encabezadoFila);
            });
        }
        // tbodyList.push(`</tbody>`)
        tbodyList.push(`</table>`)
    });
    let contents = tbodyList.join('\n');
    return contents
}


function createDataFromTables() {
    // each table
    return jQuery.map($('table.linguistic_gloss.glossed'), table => {
        // each tr
        let pairs = jQuery.map($(table).find("tr"), tr => [
            [$(tr).attr('class'),
            jQuery.map($(tr).find("td"), obj => [$(obj).text()])
            // each td as text
        ]]);
        var object = Object.assign({}, ...pairs.map(([k, v]) => ({ [k]: v })))
        return [object]
    });
}


// Converts words to td elements
function splitBySpace(data) {
    return data.split(/\s+/);
}

function NullCellFormating(data) {
    return data;
}

function splitTableIntoColumns(splitFunction = splitBySpace, formatCellFunction = NullCellFormating) {
    // parte de tablas html, y las divide por columnas

    // linguistic_gloss not glossed yet
    $('table.linguistic_gloss:not(.glossed)').each(function (i, table) {
        // get translation row
        // TODO exclude classes <<<<<<<<<<<<<<<<<<<<<<<<<<<<
        let translation = $(table).find("tr.translation td");
        // sólo convierte las que tengan un sólo td. Y translation no se divide
        let $divisible_cells = $(table).find("tr:not(.translation) td:only-child");

        if ($divisible_cells.length == 1) return true; // continue to next object because there is no need to correlate data

        // console.log($divisible_cells);
        // avoid flattening with []
        // https://stackoverflow.com/questions/703355/is-there-a-jquery-map-utility-that-doesnt-automically-flatten        
        let listOfListOfWords = jQuery.map($divisible_cells, obj => [splitFunction($(obj).text())]);

        // get max columns
        lengths = listOfListOfWords.map(x => x.length);
        // consensus?
        columns = new Set(lengths);
        if (columns.length > 1) console.warn($divisible_cells, "row have different word count");
        // take max columns value
        maxcol = Math.max(...columns); //Array.from(columns));
        // console.log(table, listOfListOfWords, lengths, columns, maxcol);

        $divisible_cells.each(function (i, obj) {
            // console.log(materials.map((material) => material.length));
            let new_w = listOfListOfWords[i].map((cellData) => formatCellFunction(cellData))
            let newHtml = '<td>' + new_w.join('</td><td>') + '</td>';
            // fill columns
            diff = maxcol - listOfListOfWords[i].length;
            if (diff > 0) newHtml += '<td></td>'.repeat(diff);
            // replace html content
            $(obj).parent().html(newHtml);
        });

        translation.attr('colspan', maxcol);

        // mark as done
        $(table).addClass("glossed");
    });

    TableOverflow();
}


