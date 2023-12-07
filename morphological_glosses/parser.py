import sys
import requests
from loguru import logger

import json
import re
# nlp

headers = {'content-type': 'application/json'}

def check_server(name, check_url):
    try:
        response = requests.get(check_url , headers=headers)
        # response.json()
    # except ConnectionError:
    except requests.exceptions.ConnectionError:
        logger.error(f'"{name.upper()}" server is unavailable. You must start it at {check_url}')
        return False
    except Exception as error:
        raise error
    else:
        logger.info(f'"{name.upper()}" server available at {check_url}')
        return True

server_available = False
server_available = check_server('NLP server', 'http://0.0.0.0:6003/')

nlp_model = None
if not server_available:
    import spacy
    # nlp_model = {"es": spacy.load("es_core_news_lg")}  # has vector info
    nlp_model = {"es": spacy.load("es_dep_news_trf")}  # no vector info, no entities


def serialize_token(token):
    # - token["morph"].get("Feat1") == "Val1", "Val2"]
    properties = {'text': token.text,
                'lemma': token.lemma_,
                'POS': token['POS'],
                'morph': token["morph"].to_dict(),
                # dep
                # parent
                'index': token.i
                }
    return properties


def parse_expression(text, language: str = "es"):
    if server_available:
        route = "http://0.0.0.0:6003/parse"
        dictionary = {"text": text, "language": language}
        # response = requests.post(route, json=dictionary, headers=headers)
        response = requests.get(route, params=dictionary, headers=headers)
        return response.json()
        # reply = json.loads(response.text)
    else:
        doc = nlp_model[language](text)
        result = [serialize_token(_) for _ in doc]
        return result


# if token['POS'] in ['NOUN', 'VERB', 'ADJ', 'ADV']
spacy_mappings = {
    "POS": {
        "ADJ": "ADJ",
        "ADV": "ADV",
        "ADP": "ADP",
        "PROPN": "PROPN",
        "PUNCT": "PUNCT",
        "CCONJ": "CCONJ",
        "SCONJ": "SCONJ",        
        # DET
        "DET": "DET",  # DET DEM ART DEF
        # "PRON": "DET",  # 1 2 3 PRON DET
        "PRON": "PRON",  # 1 2 3 PRON DET
        # FLEX
        "AUX": "FLEX",
        "COP": "FLEX",
        "NOUN": "N",  # M F N
        "VERB": "V",  # TR INTR
    },

    "Mood":  {
        "Ind": "IND", 
        "Sub": "SBJV", 
        "Imp": "IMP",  #  ¡canta ya! {'Mood': 'Imp', 'Number': 'Sing', 'Person': '2', 'VerbForm': 'Fin'}
    },    
    "Tense":{
        "Pres": "PRS",
        "Past": "PST",
        "Fut": "FUT",
        # Error: Imp
        # aquí no debe estar, sino en Mood {'Mood': 'Sub', 'Tense': 'Imp', 'VerbForm': 'Fin'}
        # - SCONJ:si FLEX:fueras-SBJV.IMP.3SG ADV:ma\u00f1ana
        # - comíamos : "V:comer-IND.IMP.1PL",
        # Solución: por la muestra, parece que es PRS 
        # "Imp": None
        # "Imp": "PRS"
        "Imp": "?"
    },

    "Person": {
        "1": "1",
        "2": "2",
        "3": "3",
    },
    "Gender":{
        "Masc": "M",
        "Fem": "F",
    },           
    "Number":{
        "Sing": "SG",
        "Plur": "PL",
    },
    "Number[psor]": {
        "Sing": "SG",
        "Plur": "PL",
    },

}

""" ambiguity
mapping spacy
ADV	no
OP	y
OP	no

ADP	del
DET	del
PRON	qué
PRON	él
DET	qué
DET	él
CCONJ	y

"""

def remove_nones(lista):
    assert isinstance(lista, list)
    new_list=[]
    for item in lista:
        if isinstance(item, list):
            n = remove_nones(item)
            if n:
                new_list.append(n)
        elif item is not None:  # add if is not None or empty string '' or 0
            new_list.append(item)
    return new_list

def structure_to_string(structure):
    a = remove_nones(structure)
    # '' without separation if the first item is a pronoun 1-3
    # '.' merged morphemes
    b = [''.join(fusion) if fusion[0] in ['1', '2', '3'] else '.'.join(fusion)
            for fusion in a]
    # b = ['.'.join(fusion) for fusion in a]
    c = '-'.join(b)
    return c

def morph_mapping(morph):
    for feature, value in morph.items():
        if feature in spacy_mappings:
            morph[feature] = spacy_mappings[feature][value]
        else:
            pass
            # logger.warning(f'feature {feature} does not exist')
            
def parse(text, is_object_language=True):
    text = text.strip()
    if not text:
        return
    

    sections = []
    gloss_accumulator = []
    text_accumulator = []
    previous_lemma = None

    def end_chunck():
        # ends chunck
        nonlocal previous_lemma, gloss_accumulator, text_accumulator
        previous_lemma = None  # cuts context

        if gloss_accumulator or text_accumulator:
            text = " ".join(text_accumulator)
            gloss = " ".join(gloss_accumulator)
            # transformations
            # ART:del-M-SG -> "ADP:de ART:el-M-SG"
            gloss = re.sub(r'ART:del-M-SG', "ADP:de ART:el-M-SG", gloss)
            gloss = re.sub(r'ART:al-M-SG', "ADP:a ART:el-M-SG", gloss)

            if is_object_language:
                translation= ""
                if server_available:
                    route = "http://0.0.0.0:6003/translate"
                    dictionary = {"text": text, "language": "english"}
                    response = requests.get(route, params=dictionary, headers=headers)
                    translation = response.json()
                    print(">translation: ", translation)
                sections.append({"text": text, "gloss": gloss, "translation": translation})                
            else:
                # TODO translate
                sections.append({"text": "", "gloss": gloss, "translation": text})
            gloss_accumulator = []
            text_accumulator = []

    doc = parse_expression(text)
    for token in doc: 
        if token['POS'] == 'SPACE':
            end_chunck()
        else:
            # print(token)
            #################################
            # Morfemas ambivalentes: persona PGN
            #################################
            # El grupo GN debe tratarse de manera diferentes segú la parte de la oración (POS)
            # PRON: se yuxtapone PGN
            # VERB: se fusionan P.G.N
            # ELSE: se concatenan G-N

            # Rule 5A. 3NSG-be.NPST
            # TODO ¿y si no es así? como en género número, persona género
            # verbos y pronombres: cant ába mos. PERSONANÚMERO
            # ingenier-a-s GÉNERO-NÚMERO
            text_accumulator.append(token['text'])
            lemma = token['lemma'] if token['POS'] == 'PROPN' else token['lemma'].lower()


            """ POSSESIVES (personal pronoun number vs. det number)
            POSS:Person Number[psor] -  Gender Number
            tus POSS:2SG-PL
                {'text': 'tus', 'lemma': 'tu', 'POS': 'DET', 'morph': {'Number': 'Plur', 'Number[psor]': 'Sing', 'Person': '2', 'Poss': 'Yes', 'PronType': 'Prs'}, 'index': 0}
            vuestros POSS:2PL-M-PL  
                {'text': 'vuestros', 'lemma': 'vuestro', 'POS': 'DET', 'morph': {'Gender': 'Masc', 'Number': 'Plur', 'Number[psor]': 'Plur', 'Person': '1', 'Poss': 'Yes', 'PronType': 'Prs'}, 'index': 3}
            """
            if token['POS'] == 'DET' and token["morph"].get('Poss') == 'Yes':
                s = token["morph"]
                morph_mapping(token["morph"])
                morpheme_structure = [[token["morph"].get('Person'), token["morph"].get('Number[psor]')],
                       [token["morph"].get('Gender')],
                       [token["morph"].get('Number')]]
                pair = "POSS:" + structure_to_string(morpheme_structure)
                gloss_accumulator.append(pair)
                continue
            # TODO mappings aparte, en una función automática

            pgn_morphemes = ["Person", "Gender", "Number"]
            sd = [spacy_mappings[feature][token["morph"].get(feature)]  
                for feature in pgn_morphemes if token["morph"].get(feature)]
            # print('\t', ','.join(sd))
            has_person = bool(token["morph"].get("Person"))
            if has_person:
                # PRON él 3SG.M  Case=Acc,Nom|Gender=Masc|Number=Sing|Person=3|PronType=Prs
                # Rule 5: Person and number are not separated by a period when they cooccur in this order.
                pgn_morphemes_string = ''.join(sd)  # person + spacy_mappings["Number"][number]
            else:
                pgn_morphemes_string = '-'.join(sd)


            # Gender=Fem|Number=Sing|PronType=Dem
            # DET Esta {'Gender': 'Fem', 'Number': 'Sing', 'PronType': 'Dem'}
            if token['POS'] == 'PRON' and has_person:
                # pronombre personal, excluyendo demostrativos sin complemento nominal
                # pair = pgn_morphemes_string
                pair = f"PRON:{pgn_morphemes_string}"
                pgn_morphemes_string = None  # consume person
            elif token["morph"].get("PronType") == "Dem":
                pair = f"DEM:{lemma}"
            elif token["morph"].get("PronType") == "Art":
                pair = f"ART:{lemma}"
                # pos = f"DET:{lemma}"
            else:
                mapping = spacy_mappings["POS"].get(token['POS'], token['POS'])
                pair = f"{mapping}:{lemma}"

            suffixes = []
            #################################
            # Morfemas fundidos: TAM
            #################################
            # assert token['POS'] in ['VERB', 'AUX', 'COP']
            if token['POS'] in ['VERB', 'AUX', 'COP']:
                tam_morphemes = []
                """ Lo no marcado no lo señalaré:
                - Voz activa
                - Aspecto imperfecto
                (además, ni siquiera encuentro las glosas correspondientes)
                pero sí: PASS e PRF
                """
                # Voz Voice

                # Modo
                # no todos tienen Modo: visto Gender=Masc|Number=Sing|Tense=Past|VerbForm=Part
                if token["morph"].get("Mood"):
                    mood = token["morph"].get("Mood")
                    tam_morphemes.append(spacy_mappings["Mood"][mood])

                # separemos tiempo y aspecto
                if token["morph"].get("VerbForm") == 'Part':  # [] porque es una lista
                    # TODO: Pero puede ser pasiva si antecede ser. es visto.
                    if previous_lemma == 'ser':
                        # TODO o si es un adjetivo
                        print(">participio pasivo, esto no excluye que pueda ser también perfecto")
                        tam_morphemes.append('PASS')
                        # tam_morphemes.append(pgn_morphemes)
                    else:
                        # TODO
                        tam_morphemes.append('PRF')
                        pgn_morphemes_string = None  # ignore person
                elif token["morph"].get("VerbForm") == 'Ger':  # [] porque es una lista
                    tam_morphemes.append('PROG')
                # TODO infinitivo imperfecto
                elif token["morph"].get("Tense"):  # TA tiempo y aspecto
                    # no todos tienen Tiempo: ¡canta ya! canta Mood=Imp|Number=Sing|Person=2|VerbForm=Fin
                    # las formas no finitas merecen especial consideración pues codifican aspecto, no tiempo
                    # "yo lo he visto"  "1SG 3SG.M <<<<< FLEX:haber.IND.PRS.1SG V:ver.PST.M <<<<<<<",
                    #    tam_morphemes.append('PTCP')
                    # TODO imperfecto
                    tense = token["morph"].get("Tense")
                    tam_morphemes.append(spacy_mappings["Tense"][tense])

                if has_person and pgn_morphemes_string:
                    # fusion
                    tam_morphemes.append(pgn_morphemes_string)
                    pgn_morphemes_string = None  # consume person
                if tam_morphemes:
                    suffixes.append('.'.join(tam_morphemes))

            #elif token['POS'] == 'PRON':
            #    suffixes.append(person_number)
            # elif token['POS'] != 'PRON' and pgn_morphemes:
                # ni verbo ni pronombre. nombre adjetivo determinante
                # suffixes.append(pgn_morphemes)
            elif token['POS'] == 'ADJ' and token["morph"].get("VerbForm") == 'Part':
                pair = f"VERB:{lemma}"
                # TODO lemma must be a verb, not an adjective
                pass
            else:
                assert not token["morph"].get("Mood") and not token["morph"].get("Tense") and not token["morph"].get("VerbForm"), token

            # si no pones esto aquí pasa de los participios, única parte del verbo que admite género
            # ahora bien sólo importan los participios pasivos, los perfectos no tienen género
            # if token['POS'] != 'PRON' and pgn_morphemes:
            if pgn_morphemes_string:
                # NO: verbo ni pronombre personal
                # SÍ: nombre adjetivo determinante o pronombre NO PERSONAL
                suffixes.append(pgn_morphemes_string)
                pass

            #################################
            # Finaliza
            #################################
            gloss_accumulator.append(pair)
            if suffixes:
                suffixes = [_ for _ in suffixes if _]
                gloss_accumulator[-1] += '-' + '-'.join(suffixes)
            previous_lemma = lemma
    
    end_chunck()

    return sections


if __name__ == '__main__':
    # text = input('Introduce texto y pulsa <intro>\n')
    text_altazor = """Altazor ¿por qué perdiste tu primera serenidad?
    ¿Qué ángel malo se paró en la puerta de tu sonrisa
    Con la espada en la mano?
    ¿Quién sembró la angustia en las llanuras de tus ojos como el adorno de un dios?
    ¿Por qué un día de repente sentiste el terror de ser?
    Y esa voz que te gritó vives y no te ves vivir
    ¿Quién hizo converger tus pensamientos al cruce de todos los vientos del dolor?
    Se rompió el diamante de tus sueños en un mar de estupor
    Estás perdido Altazor
    Solo en medio del universo
    Solo como una nota que florece en las alturas del vacío
    No hay bien no hay mal ni verdad ni orden ni belleza
    ¿En dónde estás Altazor?"""

    text2 = """
    la casa construida en el prado
    yo lo he visto
    fue vista con su pareja

    estamos comiendo
    tú hablas
    él cantará
    fuimos a comer
    si fueras mañana
    comíamos
    ¡canta ya!
    Estas casas no están menos invendibles que aquellas
    Aquellas casas no están menos invendibles que estas
    la innombrable
    comimos
    """

    determinantes = """
    tú comías
    tus llaves
    nuestras hijas
    vuestros problemas
    el coche
    este coche
    un coche
    """

    text = text_altazor
    # text = determinantes

    title = "Altazor I"
    sections = parse(text)
    document = {
    "docs": [
        {"title": title, "parts": sections}
    ]
    }
    print(json.dumps(document, indent=2))
    # return document
    with open('output.json', 'w') as f:
        f.write(json.dumps(document, indent=2))

