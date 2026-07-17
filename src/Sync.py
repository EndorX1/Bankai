import json
import subprocess as sp
import os
import argparse
import sys

parser = argparse.ArgumentParser(prog="Bankai Sync script", description="Handles the syncing of files from the remote to the local database")
parser.add_argument("-r", "--root", help="Root folder for the database", default=os.path.abspath(os.getcwd()))
parser.add_argument("-p", "--plugin", help="Path to the plugin folder", default=os.path.abspath(os.getcwd()))

parsed_args = parser.parse_args(sys.argv[1:])

dataPath = os.path.join(parsed_args.plugin, "subjects.json")
rclone_conf = os.path.join(parsed_args.plugin, "rclone.conf")

def convert(proc):
    if proc.stdout:
        for file in proc.stdout.decode().splitlines():
            if file.endswith(".docx") or file.endswith(".doc"):
                try:
                    source = os.path.join(catPath, file)
                    outdir = os.path.dirname(source)
                    conproc = sp.run(["soffice", "--headless", "--convert-to", "pdf", source, "--outdir", outdir], stdout=sp.PIPE)
                    print(conproc.returncode)
                except Exception as e:
                    #print(f"Error processing {file}: {e}")
                    pass

with open(dataPath, 'r', encoding='utf-8') as f:
    structure = json.load(f)

for category in structure:
    catPath = os.path.join(parsed_args.root, category)
    proc = sp.run(["rclone", "sync", "BankaiRemote:", catPath, "--config", rclone_conf, "--webdav-url", structure[category], "--exclude", "/Forms/**", "--missing-on-dst", "-"], stdout=sp.PIPE)
    convert(proc)
