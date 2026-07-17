#!/bin/python3

import os
import sqlite3
from pathlib import Path
from pycookiecheat import BrowserType, get_cookies # only required for decrypting chromium cookies, can be commented out if using firefox
import getpass
import subprocess as sp
import sys
import json


# CONFIGURATION
username = getpass.getuser()

tenant = "eduzh" # replace with the actual Microsoft tenant name of your university, e.g. "mitedu"

current_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(current_dir, "subjects.json")

rclone_conf = os.path.join(current_dir, "rclone.conf") # replace with the path to your rclone.conf

with open(json_path, 'r', encoding='utf-8') as f:
    structure = json.load(f)
for category in structure:
    webdav_url = structure[category]
    break # just get the first url, since all of them are on the same sharepoint site
f.close()

remote_name = "BankaiRemote:" # replace with the name of your rclone remote for onedrive


proc = sp.run(["rclone", "ls", remote_name, "--webdav-url", webdav_url, "--config", rclone_conf])
if proc.returncode == 0:
    print(f"Chromium cookies worked with")