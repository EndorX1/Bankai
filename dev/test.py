import json

with open(r'C:\Users\eliac\Documents\Obsidian\Plugins\.obsidian\plugins\Bankai\dependencies\subjects.json', 'r', encoding='utf-8') as f:
    subData = json.load(f)
                
print(subData)

pages = []
for page in subData:
    pages.append(subData[page])

Subjects = []
for subject in subData:
    Subjects.append(subject)
    
print(Subjects)
print(pages)