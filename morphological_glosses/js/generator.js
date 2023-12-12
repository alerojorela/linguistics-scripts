/********************************************************
*                    Alejandro Rojo                     *
*    https://creativecommons.org/licenses/by-nc/2.0/    *
********************************************************/
// String generator based on frequency

// import 'parser_peg';

/*
TODO:
use seed
JSON grammar
    category:frequency
*/
/*
grammar reglas de producción
LIST alternativas
LIST símbolos (grupos)

OPERATORS
  SPACE concatenation
  INT alternation

  4 OBJECTS
  OBJ RULES     LIST[OBJ]
    OBJ RULE      OBJ
      LIST alternatives
        STR nonTerm
        STR Term
      LIST string
        STR nonTerm
        STR Term
*/

var frequency_grammar = function (grammarString, seed_string=null) {

    // trims each line and removes repeated space characters
    const preProcessingTrim = /^[\t ]+|[\t ]+$/gm;
    var processedGrammarString = grammarString.replace(preProcessingTrim, '');
    const preProcessingRedundant = /[\t]+|[ ]{2,}/gm;
    processedGrammarString = processedGrammarString.replace(preProcessingRedundant, ' ');
    // |[\n]{2,}
    // console.log(processedGrammarString);

    // var [SyntaxError, parse] = getTuple();
    try {
        var parsed_expr = generator_parser.parse(processedGrammarString);
    } catch (error) {
        show_error('INCORRECT GRAMMAR', 'Please take a look at notation below and check the code accordingly', '');
        console.error(error)
        return;
    }

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
    // console.log('random_function', random_function);


    // some post processing
    // MERGE ENTRIES WITH SAME NAME
    var grammar = {};
    for (let i = 0; i < parsed_expr.length; i++) {
        // console.log(i, parsed_expr[i]);
        var rule_name = parsed_expr[i]["rule_name"]; // .toUpperCase()
        delete parsed_expr[i]["rule_name"];
        var value = parsed_expr[i];
        if (rule_name in grammar) {
            show_warning('DUPLICATE ENTRIES', 'not recommended', rule_name);
            grammar[rule_name].push(...value); // MERGE
            // grammar[rule_name] = value; //.push(...value)
        } else {
            grammar[rule_name] = value;
        }
    }
    console.debug(grammar);


    var check_data = function () {
        /********************************************************
        *                    CHECK CONSISTENCY                  *
        *                                                       *
        ********************************************************/
        // START symbol
        if (!("START" in grammar)) {
            show_error('START symbol not found', 'START symbol is required since it is the grammar initial symbol');
        }

        // referenced NonTerm 

        // referenced RULES
        function get_referenced_nonterminals(grammar) {
            referenced_nonterminals = [];

            function generate_string_obj(object) {
                // console.log('generate_string_obj', object);

                // CHECK consistency
                const obj_keys = Object.keys(object).sort();
                /* two distinct objects are not equal even if they look the same
                possible_keys2 = [
                  ["alternatives"],
                  ["string"],
                  ["nonTerm"],
                  ["Term"],
                  // frequency attribute are members of 'alternatives' children
                  ["alternatives", "frequency"],
                  ["frequency", "string"],
                  ["frequency", "nonTerm"],
                  ["frequency", "Term"]
                ];
                */
                possible_keys = [
                    "alternatives",
                    "string",
                    "nonTerm",
                    "Term",
                    // frequency attribute are members of 'alternatives' children
                    "alternatives, frequency",
                    "frequency, string",
                    "frequency, nonTerm",
                    "frequency, Term"
                ];
                if (!(possible_keys.includes(obj_keys.join(", ")))) throw "WTF??? " + obj_keys;


                if ('alternatives' in object || 'string' in object) {
                    if ('alternatives' in object) {
                        var values_list = object['alternatives']; // list
                    } else if ('string' in object) {
                        var values_list = object['string']; // list
                    }
                    for (let i = 0, size = values_list.length; i < size; i++) {
                        generate_string_obj(values_list[i]);
                    }
                } else if ('nonTerm' in object || 'Term' in object) {
                    if ('nonTerm' in object) {
                        var nonterm = object['nonTerm'];
                        if (!(referenced_nonterminals.includes(nonterm))) referenced_nonterminals.push(nonterm);
                    }
                }
            }

            const keys = Object.keys(grammar)
            // console.log(Object.entries(grammar));
            for (const [key, value] of Object.entries(grammar)) {
                generate_string_obj(value);
            }

            return referenced_nonterminals;
        }


        // A) explicitly declared rules
        const rule_names = Object.keys(grammar)
        // B) referenced rules found on rules right part
        var referenced_nonterminals = get_referenced_nonterminals(grammar);
        // console.log(referenced_nonterminals);

        // B-A
        diff_error = referenced_nonterminals.filter(x => !rule_names.includes(x));
        // console.log(diff_error);
        if (diff_error.length > 0) {
            console.log(diff_error);
            show_error('RULES NOT SPECIFIED', '', diff_error.join(', '));
        }
        // A-B
        diff_warning = rule_names.filter(x => !referenced_nonterminals.includes(x));
        // console.log(diff_warning);

        const index = diff_warning.indexOf('START');
        if (index > -1) diff_warning.splice(index, 1); // REMOVE START
        if (diff_warning.length > 0) show_warning('UNUSED RULES', '', diff_warning.join(', '));
    }();


    var generate_string_obj = function (object, level = 1) {
        errors = [];
        warnings = [];

        const verbose = false;
        var result = []; // ERROR DE 2h NO PUSISTE VAR, con lo cual buscó la variable en la función previa sobreescribiéndola 

        if ('alternatives' in object) { // RANDOM SELECTION
            var values_list = object['alternatives']; // list

            if (values_list.length > 1) {
                var frequencies = [];
                var additive_frequencies = [];
                for (let i = 0, size = values_list.length; i < size; i++) {
                    var item = values_list[i]; // object
                    if (!('frequency' in item)) throw "frequency must be a member of alternatives children";
                    frequencies.push(item.frequency);
                    if (additive_frequencies.length == 0) {
                        additive_frequencies.push(item.frequency);
                    } else {
                        additive_frequencies.push(item.frequency + additive_frequencies[additive_frequencies.length - 1]);
                    }

                }
                var cumulative_frequency = frequencies.reduce((a, b) => a + b, 0);
                if (verbose) console.log('\t'.repeat(level), 'SELECTIONpre: ', cumulative_frequency, additive_frequencies, object);

                // RANDOM
                // const rnd = getRandom(0, cumulative_frequency);
                const rnd = getRandomWithFunction(random_function, 0, cumulative_frequency);
                // const rnd = getRandomWithSeed(0, cumulative_frequency, 'anyth44ing');
                for (let i = 0; i < values_list.length; i++) {
                    if (rnd <= additive_frequencies[i]) {
                        if (verbose) console.log('\t'.repeat(level), 'SELECTION: ', rnd, i, values_list[i]);
                        result.push(...generate_string_obj(values_list[i], level + 1));
                        break;
                    }
                }
            } else {
                if (verbose) console.log('\t'.repeat(level), 'ONE ALTERNATIVE: ', values_list[0]);
                result.push(...generate_string_obj(values_list[0], level + 1));
            }

        } else if ('string' in object) { // generate_string_obj
            var values_list = object['string']; // list
            for (let i = 0; i < values_list.length; i++) {
                if (verbose) console.log('\t'.repeat(level), 'STRING: ', values_list[i]);
                result.push(...generate_string_obj(values_list[i], level + 1));
            }
        } else if ('nonTerm' in object) { // JUMP
            var value = object['nonTerm'];
            if (!(value in grammar)) throw "Non terminal not specified";
            if (verbose) console.log('\t'.repeat(level), 'JUMP TO: ', value);
            result.push(...generate_string_obj(grammar[value], level + 1));

        } else if ('Term' in object) { // TERMINAL
            var value = object['Term'];
            if (verbose) console.log('\t'.repeat(level), 'TERMINAL SELECTED: ', value);
            result.push(value);
        } else {
            throw 'wtf!';
        }
        if (verbose) console.log('\t'.repeat(level), '...: ', result);
        return result;

    }

    // RETURN: a list of terminals
    var generate_string = function (entry_point = 'START') {
        let entry = grammar[entry_point];        
        if (!entry) {
            errors = [];
            warnings = [];
            errors.push(
                {
                    description: 'ENTRY POINT NOT FOUND',
                    hint: 'entry points can be found on the left side of a production rule',
                    debug: entry_point
                });
            return [null, { "errors": errors, "warnings": warnings }];
        }

        // console.debug(entry_point, entry);
        result = generate_string_obj(entry);
        return [result, {}];
    }

    // RETURN: a list of strings
    var generate_strings = function (number, entry_point = 'START') {
        if (!entry_point in grammar) {
            return null, {
                "errors": {
                    description: 'ENTRY POINT NOT FOUND',
                    hint: 'entry points can be found on the left side of a production rule',
                    debug: entry_point
                }, "warnings": []
            };
        }

        let entry = grammar[entry_point];
        let items = [];
        for (let n = 0; n < number; n++) {
            result = generate_string_obj(entry);
            items.push(result.join(''));
        }
        return items;

    }

    // PUBLIC PROCEDURES
    return {
        keys: Object.keys(grammar),
        generate_string: generate_string,
        generate_strings: generate_strings,
    };

}



var show_error = function (message, explanation = '', debug = '') {
    $('#debug').css('display', 'block');
    $('#debug').append(`
      <p>
      <span class="debug_error">${message}</span>
      <span class="debug_explanation">${explanation}</span>
      <span class="debug_data">${debug}</span>
      </p>`);
}

var show_warning = function (message, explanation = '', debug = '') {
    $('#debug').css('display', 'block');
    $('#debug').append(`
      <p>
      <span class="debug_warning">${message}</span>
      <span class="debug_explanation">${explanation}</span>
      <span class="debug_data">${debug}</span>
      </p>`);
}