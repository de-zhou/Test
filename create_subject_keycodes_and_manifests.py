# Created by Rani Gera

# *** This code needs to run before running the app in order to create: ***
# 1. mapping_key_to_subId.js - a required js file with a mapping between individual subject keycodes (part of the link we send them) and their subject ids.
# 2. mapping_key_to_subId.csv - a csv file with the individual  links to the app (that encodes the subject number).
# 3. individual matching manifest files in the "manifests" folder for each subject (This are reuiqred for the app to be used as a progressive web application [PWA] for which it was desinged).
# 4. backup the newly formed mapping_key_to_subId.js and mapping_key_to_subId.csv files with a timestamp and put them in the "backup" folder.
# * edit ROOT_DOMAIN to the root domain of the app


# Load packages:

import os
from shutil import copyfile
import csv
import json
import time
import string
import random

# basic parameters and names:
# --------------------------
# get the context name from the settings.js file:
with open("settings.js", "r") as f:
    for line in f:
        if "context: " in line:
            context_name = line.split('"')[1]
        if "app_base_adress: " in line:
            app_base_adress = line.split('"')[1]

mainAdress = app_base_adress + "/" + context_name + "/"
commonStartAdress = mainAdress + "index.html?subId="
commonIconsAdress = mainAdress + "icons/"


# FUNCTIONS:
# ----------
def get_random_string(length):
    letters = string.ascii_letters + string.digits
    result_str = "".join(random.choice(letters) for i in range(length))
    return result_str


def createSubNumDict(
    ranges=[(101, 131)],
    key_code_length=20,
):
    sub_key_dict = {}
    for i in ranges:
        for j in range(i[0], i[1]):
            # the logic here below is to prevent the last 3 characters of being the same.
            get_code = True
            while get_code:
                new_key = get_random_string(key_code_length)
                get_code = False
                for key in sub_key_dict.keys():
                    if new_key[-3:].lower() == key[-3:].lower():
                        get_code = True
                        break

            sub_key_dict[new_key] = j

    return sub_key_dict


# MANIFEST TEMPLATE:
# ------------------
myDynamicManifest = {
    "name": context_name.replace("_", " "),
    "short_name": context_name.replace("_", " "),
    "start_url": "",
    "display": "standalone",
    #   "orientation": "portrait",
    "background_color": "#666666ff",
    "theme_color": "#000000",
    "icons": [
        {
            "src": "android-icon-36x36.png",
            "sizes": "36x36",
            "type": "image/png",
            "density": "0.75",
        },
        {
            "src": "android-icon-48x48.png",
            "sizes": "48x48",
            "type": "image/png",
            "density": "1.0",
        },
        {
            "src": "android-icon-72x72.png",
            "sizes": "72x72",
            "type": "image/png",
            "density": "1.5",
        },
        {
            "src": "android-icon-96x96.png",
            "sizes": "96x96",
            "type": "image/png",
            "density": "2.0",
        },
        {
            "src": "android-icon-144x144.png",
            "sizes": "144x144",
            "type": "image/png",
            "density": "3.0",
        },
        {
            "src": "android-icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "density": "4.0",
        },
        {
            "src": "android-icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "density": "1.0",
        },
    ],
}
# set the icons full path:
for icon in myDynamicManifest["icons"]:
    icon["src"] = commonIconsAdress + icon["src"]


# RUN THE CODE:

# change dir to the current dir:
os.chdir(os.path.dirname(os.path.abspath(__file__)))

os.makedirs("backup", exist_ok=True)
sub_key_dict = createSubNumDict()

if not os.path.exists("./mapping_key_to_subId.js") or (
    input("The files already exists. Do you want to overwrite them? (y/n)").lower()
    == "y"
):
    # create the js file:
    with open("mapping_key_to_subId.js", "w") as f:
        f.write("var key2subId_mapping = ")
        json.dump(sub_key_dict, f, indent=4)
    print("The file mapping_key_to_subId.js was saved")
    # backup a copy with a timestamp:
    copyfile(
        "mapping_key_to_subId.js",
        "backup/mapping_key_to_subId" + str(time.time()) + ".js",
    )

    # saving a csv file with url's:
    with open("mapping_key_to_subId.csv", "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Sub_ID", "URL", "key_code"])
        for key, val in sub_key_dict.items():
            writer.writerow([val, commonStartAdress + key, key])
    print("The file mapping_key_to_subId.csv was saved")
    # backup a copy with a timestamp:
    copyfile(
        "mapping_key_to_subId.csv",
        "backup/mapping_key_to_subId." + str(time.time()) + ".csv",
    )

    # creating manifest files:
    # ask if to clean the folder:
    if os.path.exists("manifests"):
        if (
            input(
                "The folder manifests already exists. Do you want to clean it? (y/n)"
            ).lower()
            == "y"
        ):
            for file in os.listdir("manifests"):
                os.remove("manifests/" + file)
    else:
        os.makedirs("manifests")
    for key, val in sub_key_dict.items():
        myDynamicManifest["start_url"] = commonStartAdress + key
        with open("manifests/manifest_" + key + ".json", "w") as f:
            json.dump(myDynamicManifest, f, indent=4)
    print("The manifest files were saved")

else:
    print("STOPPING! *** The files already exists ***")
