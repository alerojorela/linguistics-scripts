import sys
import json
import parser

with open('/mnt/archivos/Lingüística/MI-sitio-web/conlang_whimsy/caprichos/test.json') as f:
    test_data = json.load(f)

# print(json.dumps(test_data, indent=1))

for doc in test_data["docs"]:
    print(doc["title"])
    # lines = test_data["docs"][0]["parts"]
    lines = doc["parts"]
    for index, line in enumerate(lines):
        glosses = parser.parse(line["text"])
        gloss = glosses[0]
        matches = gloss["gloss"] == line["gloss"]
        smatches = '✅' if matches else '❌'
        print(index, smatches, line["text"])
        if not matches:
            print('\t', gloss["gloss"])
            print('\t', line["gloss"])


