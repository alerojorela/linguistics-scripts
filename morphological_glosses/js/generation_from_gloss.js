/* TODO
esto debería ir a linguistic glosses y a el generador de lenguas
debería crearse una clase
y esta modificar la clase base permitiendo creación de texto a partir de glosas, con una gramática determinada

text_generation_from_gloss
    linguisticGlosses
    gloss_parser
    generator
        generator_parser
*/

// ordered by ESPECIFICIDAD preference because this funcion will return the first correct value
const categories = ['text', 'cat', 'type'];

/*
PLANTEAMIENTOS X:X
la lengua de destino no será ambigua
la lengua de origen, al ser una lengua natural, sí puede serlo
por lo que una misma forma puede corresponderse a varias traducciones
pero una forma+pos sólo puede corresponderse a una traducción

Primero se accede por categoría pues
1) si una forma se presenta sin categoría, se copia la forma. No hace falta registrar nada
1) si una categoría no está asociada a una forma puede, no obstante, recibir una forma
DET:él-LOC
De aquí que el siguiente objeto, tenga como primera clave la categoría, siempre necesaria
NULL puede ser clave de diccionario
e = {'LOC': {null: "so"}}
*/


// #region Load files

doc_data = undefined;
var grammar_data = undefined;
var fg = undefined;
var cat2form2translation = {};
/*
    'NV': {
        "murmullo": {"targetForm": "lúsurezal"
                    "selected": true
        // null: "..."
    }
};
*/
// set to avoid duplicates target forms
const target_forms = new Set();

function loadGrammar(data) {
    fg = frequency_grammar(data);
}

function loadVocabulary(data) {
    for (let n = 0; n < data.length; n++) {
        row = data[n];
        // pos source_form->target_form
        let [pos, source_form, target_form] = row;
        source_form = source_form.trim();
        source_form = source_form ? source_form : null;

        if (target_forms.has(target_form)) console.error('Duplicated target forms', target_form)
        target_forms.add(target_form);
        if (!(pos in cat2form2translation)) cat2form2translation[pos] = {};
        cat2form2translation[pos][source_form] = { "targetForm": target_form, "selected": true }
    }
    console.log('cat2form2translation', cat2form2translation);
}


function saveVocabulary(selected = false, separator = '\t') {
    rows = []
    for (const [pos, items] of Object.entries(cat2form2translation)) {
        for (const [source_form, subentry] of Object.entries(items)) {
            // pos source_form->target_form
            if (!selected || (selected && subentry.selected)) {
                if (source_form == "null") {
                    row = [pos, null, subentry.targetForm, subentry.selected];
                } else {
                    row = [pos, source_form, subentry.targetForm, subentry.selected];
                }
                // console.log(row)
                rows.push(row);
            }
        }
    }
    const contenidoCSV = rows.map(row => row.join(separator)).join('\n');
    // console.log(contenidoCSV);
    return contenidoCSV;
}

function resetNonSelectedVocabulary() {
    $.each(cat2form2translation, function (cat, sourceForms) {
        $.each(sourceForms, function (sourceForm, values) {
            if (!values.selected) {
                delete cat2form2translation[cat][sourceForm];
                //map_to_word({ pos: sourceForm }, force_new = true);
            }
        });
    });
    update();
}

// #endregion


// #region mapping
unavailablePos = new Set();

function mapUnit(item, force_new = false) {
    // console.log("map_to_word", item);
    tuples = Object.entries(item);
    let [pos, sourceForm] = tuples[0];
    // pos is compulsory for creating forms based on patterns

    // TODO, distinguir nombres propios de nombres comunes
    // lower case from source
    if (sourceForm) sourceForm = sourceForm.toLowerCase();
    // console.debug('map_to_word', pos, source_form);

    // source_form can be null, however a POS (part of speech) can map by itself to a form
    // if (source_form && pos in cat2form2translation && source_form in cat2form2translation[pos]) {
    let target_form = undefined;
    if (pos in cat2form2translation && sourceForm in cat2form2translation[pos]) {
        // target_form = cat2form2translation[pos][source_form];
        target_form = cat2form2translation[pos][sourceForm].targetForm;
        // Existe una correspondencia ya entre esa forma y otra en la lengua de destino
        // console.info(`Word '${source_form}' already mapped to '${mapped_to}', copied`);
        if (!force_new) {
            return target_form;
        } else {
            // delete mapping
            target_forms.delete(target_form);
        }
    }

    // generation section
    if (!fg.keys.includes(pos)) {
        if (!unavailablePos.has(pos)) {
            unavailablePos.add(pos);
            console.debug(`Part of speech '${pos}' not present in grammar, ignored, form copied`);
        }
        return sourceForm;
    }

    // No se ha correspondido esa forma con ninguna otra en la lengua de destino
    // TODO evita homonimia
    // console.log(translation_cat);
    counter = 0;
    target_form = undefined;
    while (!target_form || target_forms.has(target_form)) {
        // TODO: puede haber un bucle eterno si la gramática genera pocas formas y ya hay muchas asignadas
        // se ha generado una palabra que ya ha sido registrada
        // si hemos llegado aquí es porque es el mismo valor pero diferente categoría
        // console.info(`Avoiding ambiguity with: ${target_form}`);
        // si la misma forma pero de de otra categoría, insiste en crear otra forma
        [chars, log] = fg.generate_string(pos);
        target_form = chars.join('');
        counter += 1;
        if (counter > 100) {  // abort loop
            console.warn(`Aborting loop because of unmanaged ambiguity. Final mapping ${pos}:${sourceForm} -> ${target_form}`)
            break;
        }
    }
    // console.info(result, log);
    // if (target_form) {

    // if (source_form) {
    if (!(pos in cat2form2translation)) cat2form2translation[pos] = {};

    cat2form2translation[pos][sourceForm] = { "targetForm": target_form, "selected": false };
    target_forms.add(target_form);
    // }
    // console.debug(':)', pos, ':', source_form, '->', target_form);
    return target_form;
    // }


}

const delimiters = [' ', '-', '.'];

function mapSegment(expression, force_new = false) {
    // ANALYSIS
    // naive division by word: // analysis = glossData.split(' ');
    analysis = gloss_parser.parse(expression);
    // console.debug('ANALYZED', JSON.stringify(analysis));

    // MAPPING
    translation = mapRecursive(analysis, mapUnit, force_new);
    // console.debug('MAPPED', translation);

    // JOINING while preserving structure by using level specific delimiters
    joined = Delimiters_by_depth_join(translation, delimiters);
    // console.debug('JOINED', joined);
    return analysis, joined
}

function mapObject(line) {
    // line: object with .gloss attribute
    // TODO: no funciona
    // let [analysis, joined] = map_segment(line.gloss);
    analysis = gloss_parser.parse(line.gloss);
    // console.debug('ANALYZED', analysis);
    // console.debug('ANALYZED', JSON.stringify(analysis));

    // MAPPING
    translation = mapRecursive(analysis, mapUnit);
    // console.debug('MAPPED', translation);

    // JOINING while preserving structure by using level specific delimiters
    joined = Delimiters_by_depth_join(translation, delimiters);
    // modify data
    line.text = joined;
    // creates new attribute
    line.parsed = analysis;
}

// #endregion



// #region Data to Table to Cell and text generation

// Converts words to td elements
function formatCell(word) {
    morphemes = word.split('-');
    // mapping
    let new_m = [];
    for (let m = 0; m < morphemes.length; m++) {
        classes = morphemes[m] == '∅' ? "nullMorph" : undefined
        new_m.push(classes === undefined ? `<span>${morphemes[m]}</span>` : `<span class="${classes}">${morphemes[m]}</span>`);
    }
    return new_m.join('<span class="hyphen">-</span>');
}


function CreateTablesFromObject(docs, $appendObj) {
    /* json to html tables with rows and columns
    ESTO ASUME QUE TEXT ESTÁ VACÍO  y que gloss -> text
    */
    $appendObj.html('');
    // doc = text_data.docs[0];
    $.each(docs, function (index, doc) {
        $appendObj.append(`<h2>${doc.title}</h2>`);
        /* 
        SWAPPING FROM COMPLETE GLOSS
        source      --      target
        text                Empty
        gloss               gloss
        translation         text
        */
        $.each(doc.parts, function (index, part) {
            part.old_translation = part.translation;
            if (part.text) part.translation = part.text;
            part.text = '';
        });

        // creates tables with rows
        tfd = createTablesFromData(doc.parts, ['text', 'gloss', 'translation']);
        $appendObj.append(tfd);
    });

    // creates columns
    splitTableIntoColumns(splitBySpace, formatCell);

    update();

    /* GLOSSES BEHAVIOUR
    mouse click:
    - left
        - one click: protects word from word generation and promotes it for vocabulary saving
        - double click: edit word
    - right: generates another word
    */
    $('tr.gloss>td>span:not(.hyphen)').on('click', function (event) {
        // Manejar el clic simple
        if (event.detail === 1) {
            console.log('single click');

            $obj = $(this);
            expression = $obj.text();

            analysis = gloss_parser.parse(expression);
            item = analysis[0][0];  // first word, first morph
            let [pos, source_form] = Object.entries(item)[0];
            console.log(analysis, item);
            // invert value
            // fixed = $obj.hasClass("fixed");  // defined by gui
            if (cat2form2translation[pos] && cat2form2translation[pos][source_form]) {
                fixed = !cat2form2translation[pos][source_form].selected;  // defined by data
                cat2form2translation[pos][source_form].selected = fixed;
                // console.log(pos, cat2form2translation[pos]);

                // refresh display
                // analogous objects
                // WARNING Contains is not exact search
                $objs = $(`tr.gloss>td>span:not(.hyphen):contains('${expression}')`);
                if (fixed) {
                    $objs.addClass('fixed');
                } else {
                    $objs.removeClass('fixed');
                }
            }

        } else if (event.detail === 2) {
            // edita
            console.log('double click');
        }
    }).on('contextmenu', function (e) {
        e.preventDefault();

        expression = $(this).text();
        analysis = gloss_parser.parse(expression);
        item = analysis[0][0];  // first word, first morph
        let [pos, source_form] = Object.entries(item)[0];
        console.log(analysis, item);
        // fixed = $(this).hasClass("fixed");  // defined by gui
        fixed = cat2form2translation[pos][source_form].selected;  // defined by data

        if (!fixed) {
            gloss = $(this).text();
            new_gloss = mapSegment(gloss, force_new = true);  // {"NOUN": "orden"}
            if (new_gloss) console.log('new gloss', new_gloss, 'from', gloss);
            update();
        }
    })


}


function update() {
    /*
    updates text cells from gloss cells
    */

    // 1) Updates text from glosses
    $('tr.gloss>td').each(function (index, gloss_element) {
        let gloss = $(this).text();
        if (gloss) {
            let new_gloss = mapSegment(gloss);
            // analogous text item
            let children_index = $(this).index();
            // var text_element = $(this).closest('tbody').find('.text td').eq(children_index).first();
            let text_element = $(this).closest('tbody').find('.text td').eq(children_index)[0];
            // console.log(index, children_index, gloss, new_gloss, gloss_element, text_element);
            $(text_element).html(formatCell(new_gloss));
        }
    });

    // 2) Refresh Interface: display and behaviour

    // protected morphs
    console.log(cat2form2translation);
    $.each(cat2form2translation, function (cat, sourceForms) {
        $.each(sourceForms, function (sourceForm, values) {
            // console.log(cat, sourceForm, values);
            // TODO Contains
            // TODO IND.PST.2SG, F
            expression = (sourceForm === null || sourceForm === undefined) ? cat : `${cat}:${sourceForm}`;
            $obj = $(`tr.gloss>td>span:not(.hyphen):contains('${expression}')`);
            if (values.selected) {
                $obj.addClass('fixed');
            } else {
                $obj.removeClass('fixed');
            }
        });
    });

    // info visibility
    if (!$('#showHyphens').prop("checked")) $("tr.text span.hyphen").removeAttr("style").hide();
    if (!$('#showNullMorphs').prop("checked")) $("tr.text span.nullMorph").removeAttr("style").hide();
}

// #endregion





function lojban_create_word(values) {
    RAISE
    // first found success
    for (let n = 0; n < categories.length; n++) {

        // parece que recorre propiedades
        let cat = values[categories[n]];
        if (cat && fg.keys.includes(cat.toUpperCase())) {
            tuple = [cat, values.id];

            if (tuple in cat2form2translation) {
                return cat2form2translation[tuple];
            } else {
                output = fg.generate_string(cat.toUpperCase()).join('')
                cat2form2translation[tuple] = output;
                return output;
            }

        } else {
            console.error(values);
        }
    }
    // return fg.generate_string('START');
    return key; // don't throw an error 
}

