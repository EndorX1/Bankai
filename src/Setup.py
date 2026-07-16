import platform
import sys
import subprocess as sp
import os

password = input("Enter your password for sudo (Linux/macOS) or press Enter to continue (Windows): ")

if sys.platform in ("linux", "darwin"):
    print("Installing rclone on Linux or macOS...")
    proc = sp.run(f"echo {password} | sudo -S bash -c \"$(curl -fsSL https://rclone.org/install.sh)\"", shell=True)
    if proc.returncode == 0 or proc.returncode == 3:
        print("Rclone installed successfully!")
else:
    print("Installing rclone on Windows...")
    proc = sp.run(["winget", "install", "Rclone.Rclone"])
    if proc.returncode == 0 or proc.returncode == 3:
        print("Rclone installed successfully!")

import rcloneCookie
