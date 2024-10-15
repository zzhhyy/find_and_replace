import requests
import json

base_path = "./src/ui/i18n/"
supported_languages = ["ar", "es", "hi", "zh"]
token = "";
url = "https://translation.googleapis.com/language/translate/v2?key=" + token

with open(base_path + "strings.json", "r") as file:
  strings_data = json.load(file)
  keys_list = list(strings_data.keys())
  values_list = list(strings_data.values())

  count = len(keys_list)

  # Write R.js
  with open(base_path + "R.js", "w") as file:
    file.write("const R = {\n")
    for i in range(0, count):
      file.write('  {}: "{}",\n'.format(keys_list[i], keys_list[i]))
    file.write("};\n")
    file.write("export default R;\n")

  # Write en.js
  with open(base_path + "resource/en.js", "w") as file:
    file.write("export const en = {\n")
    for i in range(0, count):
      file.write(
        '  {}: "{}",\n'.format(keys_list[i], values_list[i])
      )
    file.write("};\n")

  for language in supported_languages:
    body = {"q": values_list, "source": "en", "target": language, "format": "text"}

    response = requests.post(
      url, headers={"Content-Type": "application/json"}, data=json.dumps(body)
    )
    result = response.json()
    translate_data = result["data"]["translations"]

    if len(keys_list) != len(translate_data):
      print("Translate error")
      exit(0)

    with open(base_path + "resource/{}.js".format(language), "w") as file:
      file.write("export const {} = {{\n".format(language))
      for i in range(0, count):
        file.write(
          '  {}: "{}",\n'.format(
            keys_list[i], translate_data[i]["translatedText"]
          )
        )
      file.write("};\n")
