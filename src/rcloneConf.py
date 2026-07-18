#!/bin/python3

import os
import sqlite3
from pycookiecheat import BrowserType, get_cookies # only required for decrypting chromium cookies, can be commented out if using firefox
import subprocess as sp
import sys
import json
import argparse

parser = argparse.ArgumentParser(prog="Bankai Conf script", description="Handles Credentials and the fetching of cookies from browsers and the writing of them to the rclone.conf file")
parser.add_argument("-p", "--plugin", help="Path to the plugin folder", default=os.path.abspath(os.getcwd()))
parser.add_argument("-P", "--password", help="Password for sudo (Linux/macOS) or press Enter to continue (Windows)", default="")
parser.add_argument("--smail", help="School Email", default="")
parser.add_argument("--spass", help="School Password", default="")
parser.add_argument("-m", "--mode", help="Mode", default="")

parsed_args = parser.parse_args(sys.argv[1:])

json_path = os.path.join(parsed_args.plugin, "subjects.json")
rclone_conf = os.path.join(current_dir, "rclone.conf")
mode = int(parsed_args)

if mode == 0:
    rcloneSetup()
    BrowserCookie()
elif mode == 1:
    BrowserCookie()
elif mode == 2:
    rcloneSetup()
elif mode == 3:
    BrowserCookie()
else: pass

def rcloneSetup():
    if sys.platform in ("linux", "darwin"):
        print("Installing rclone on Linux or macOS...")
        proc = sp.run(f"echo {parsed_args.password} | sudo -S bash -c \"$(curl -fsSL https://rclone.org/install.sh)\"", shell=True)
        if proc.returncode == 0 or proc.returncode == 3:
            print("Rclone installed successfully!")
    else:
        print("Installing rclone on Windows...")
        proc = sp.run(["winget", "install", "Rclone.Rclone"])
        if proc.returncode == 0 or proc.returncode == 3:
            print("Rclone installed successfully!")

def writeHeaders():
        with open(rclone_conf, "r+") as f:
            lines = f.readlines()
            
            # Find the remote section
            remote_section_start = -1
            remote_section_end = -1
            headers_line_index = -1
            user_line_index = -1
            pass_line_index = -1
            
            for i, line in enumerate(lines):
                if line.strip() == f"[{remote_name}]":
                    remote_section_start = i
                elif remote_section_start != -1 and line.strip().startswith("["):
                    # Found the next section
                    remote_section_end = i
                    break
                elif remote_section_start != -1 and line.strip().startswith("headers ="):
                    headers_line_index = i

                elif mode in [0, 3]:
                    if remote_section_start != -1 and line.strip().startswith("user ="):
                        user_line_index = i
                    elif remote_section_start != -1 and line.strip().startswith("pass ="):
                        pass_line_index = i
            
            if remote_section_start == -1:
                print(f"ERROR: Remote '[{remote_name}]' not found in {rclone_conf}")
                exit(1)
            
            # If we didn't find another section, the remote goes to the end
            if remote_section_end == -1:
                remote_section_end = len(lines)
            
            print(f"Found remote '[{remote_name}]' at line {remote_section_start + 1}")
            
            new_header = f"headers = \"Cookie\",\"FedAuth={FedAuth};rtFa={rtFa}\"\n"
            new_user = f"user = {parsed_args.smail}\n"
            proc = sp.run(["rclone", "obscure", parsed_args.spass], stdout=sp.PIPE, text=True)
            new_pass = f"pass = {proc.stdout.strip()}\n"
            
            if headers_line_index != -1:
                print("Found existing headers line, replacing it:")
                print(f"Old: {lines[headers_line_index].strip()}")
                lines[headers_line_index] = new_header
                print(f"New: {new_header.strip()}")
            else:
                print("No existing headers line found, adding new one to the remote section:")
                # Find the last non-empty line in the section
                insert_position = remote_section_end
                for i in range(remote_section_end - 1, remote_section_start, -1):
                    if lines[i].strip():
                        insert_position = i + 1
                        break
                lines.insert(insert_position, new_header)
                print(f"New: {new_header.strip()}")

            if mode in [0, 3]:
                #User
                if user_line_index != -1:
                    print("Found existing user line, replacing it:")
                    print(f"Old: {lines[user_line_index].strip()}")
                    lines[user_line_index] = new_user
                    print(f"New: {new_user.strip()}")
                else:
                    print("No existing user line found, adding new one to the remote section:")
                    # Find the last non-empty line in the section
                    insert_position = remote_section_end
                    for i in range(remote_section_end - 1, remote_section_start, -1):
                        if lines[i].strip():
                            insert_position = i + 1
                            break
                    lines.insert(insert_position, new_user)
                    print(f"New: {new_user.strip()}")

                #Pass
                if pass_line_index != -1:
                    print("Found existing pass line, replacing it:")
                    print(f"Old: {lines[pass_line_index].strip()}")
                    lines[pass_line_index] = new_pass
                    print(f"New: {new_pass.strip()}")
                else:
                    print("No existing pass line found, adding new one to the remote section:")
                    # Find the last non-empty line in the section
                    insert_position = remote_section_end
                    for i in range(remote_section_end - 1, remote_section_start, -1):
                        if lines[i].strip():
                            insert_position = i + 1
                            break
                    lines.insert(insert_position, new_pass)
                    print(f"New: {new_pass.strip()}")
            
            f.seek(0)
            f.writelines(lines)
            f.truncate()
            f.close()


def BrowserCookie():
    # CONFIGURATION
    username = getpass.getuser()

    tenant = "eduzh" # replace with the actual Microsoft tenant name of your university, e.g. "mitedu"

    with open(json_path, 'r', encoding='utf-8') as f:
        structure = json.load(f)
    for category in structure:
        webdav_url = structure[category]
        break # just get the first url, since all of them are on the same sharepoint site
    f.close()

    remote_name = "BankaiRemote" # replace with the name of your rclone remote for onedrive

    def find_firefox_cookies():
        if sys.platform == "linux":
            profile_root = os.path.join(os.path.expanduser("~"), ".config", "mozilla", "firefox")
        elif sys.platform == "darwin":
            profile_root = os.path.join(os.path.expanduser("~"), "Library", "Mozilla", "Firefox", "Profiles")
        elif sys.platform.startswith("win"):
            appdata = os.environ.get("APPDATA")
            if not appdata:
                return None
            profile_root = os.path.join(appdata, "Mozilla", "Firefox", "Profiles")
        else:
            return None

        if not os.path.isdir(profile_root):
            return None

        try:
            for profile in os.listdir(profile_root):
                if profile.endswith(".default-release"):
                    cookies_file = os.path.join(profile_root, profile, "cookies.sqlite")
                    if os.path.isfile(cookies_file):
                        return cookies_file
        except (OSError, FileNotFoundError):
            return None

        return None

    if sys.platform.startswith("linux"):
        browserStrings = ["BRAVE", "CHROME"]
        browserPaths = [
            os.path.join(os.path.expanduser("~"), ".config", "BraveSoftware", "Brave-Browser", "Default", "Cookies"),
            os.path.join(os.path.expanduser("~"), ".config", "google-chrome", "Default", "Cookies")
        ]
    elif sys.platform.startswith("win"):
        browserStrings = ["BRAVE", "CHROME"]
        browserPaths = [
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "BraveSoftware", "Brave-Browser", "User Data", "Default", "Cookies"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "User Data", "Default", "Network", "Cookies")
        ]
    elif sys.platform == "darwin":
        browserStrings = ["BRAVE", "CHROME"]
        browserPaths = [
            os.path.join(os.path.expanduser("~"), "Library", "Application Support", "BraveSoftware", "Brave-Browser", "Default", "Cookies"),
            os.path.join(os.path.expanduser("~"), "Library", "Application Support", "Google", "Chrome", "Default", "Cookies")
        ]
    else:
        browserStrings = []
        browserPaths = []

    firefox_cookies = find_firefox_cookies()

    # CONFIGURATION END     
    if firefox_cookies:
        print("Fetching cookies from Firefox database...")
        uri = "file:" + firefox_cookies.replace("\\", "/") + "?immutable=1"

        cookies = sqlite3.connect(uri, uri=True) #, check_same_thread=False, isolation_level="IMMEDIATE")

        cursor = cookies.cursor()
        auth = cursor.execute(f"select value from main.moz_cookies \
                            where host = '.sharepoint.com' and name = 'rtFa' \
                            or host = '{tenant}-my.sharepoint.com' and name = 'FedAuth' ;")
        try:
            fetched = auth.fetchall()
            rtFa = fetched[0][0]
            FedAuth = fetched[1][0]

            writeToRcloneConf()

            try:
                proc = sp.run(["rclone", "ls", remote_name+":", "--webdav-url", webdav_url, "--config", rclone_conf])
                if proc.returncode == 0:
                    print("Firefox cookies worked!")
                    sys.exit(0)
                else:
                    print("Firefox cookies didn't work, trying Chromium...")   
            except Exception:
                pass
        except Exception:
            pass
    else:
        print("No Firefox cookies database found; trying Chromium cookies...")

    for bs in range(len(browserStrings)):
        chromium_cookies = browserPaths[bs]

        if os.path.isfile(chromium_cookies):
            print("Fetching cookies from Chromium database...")
            rtFa = get_cookies("https://sharepoint.com", browser=getattr(BrowserType, browserStrings[bs]), cookie_file=chromium_cookies)["rtFa"]
            FedAuth = get_cookies(f"https://{tenant}-my.sharepoint.com", browser=getattr(BrowserType, browserStrings[bs]),cookie_file=chromium_cookies)["FedAuth"]
        

        writeHeaders()

        proc = sp.run(["rclone", "ls", remote_name+":", "--webdav-url", webdav_url, "--config", rclone_conf])
        if proc.returncode == 0:
            print(f"Chromium cookies worked with {browserStrings[bs]}!")
            break
        else:
            continue

    print("Done!")