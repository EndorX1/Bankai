import sys
import argparse
import os
import time
import json

parser = argparse.ArgumentParser(prog="Bankai API", description="API for File synced Filesystems")
parser.add_argument("-r", "--root", help="Root folder for the database", default=os.path.abspath(os.getcwd()))
parser.add_argument("--page_limit", type=int, help="Specify Page limit")
parser.add_argument("-p", "--page", type=int, help="Specify Page number", default=0)

parser.add_argument("-f", "--folder", action='store_true', help="Exclude folder path from output")
parser.add_argument("--name", action='store_true', help="Exclude file name from output")
parser.add_argument("-s", action='store_true', help="Exclude subject from output")
parser.add_argument("-t", "--time", action='store_true', help="Exclude file ctime from output")

parser.add_argument("-a", "--absolute", help="Specify if paths should be absolute", action='store_true')

parser.add_argument("-d", "--days", help="Specify number of days for which to show files(1 is today)")
parser.add_argument("-S", "--search", type=str, help="Specify search term", default="")
parser.add_argument("--subject", type=str, help="Specify subject to filter by", default="")
parser.add_argument("-n", "--new", type=float, help="Show only new files since last sync")
parser.add_argument("--sort", type=str, help="Specify sort order(any combination of 'n' = name, 's' = subject, 't' = time)", default="")
parser.add_argument("--subjects", action='store_true', help="List all subjects in the root folder")

parsed_args = parser.parse_args(sys.argv[1:])
try:
    parsed_args.days = int(parsed_args.days)
except:
    parsed_args.days = None

def filter(args, filepath):
    #Don't filter by subject because we are already filtering by subject in the main function
    if args.days and os.stat(filepath).st_ctime <= (time.time() - (args.days * 86400)):
        return False
    if args.search and args.search not in filepath:
        return False
    if args.new and os.stat(filepath).st_ctime > args.new:
        return False
    return True

def createRecord(args):
    output = {}
    records = []
    subjects = os.listdir(args.root)
    if args.subjects:
        output["subjects"] = subjects
    subject_dirs = [os.path.join(args.root, subs) for subs in subjects]
    subject = ""
    for root, dirs, files in os.walk(os.path.join(args.root, args.subject), topdown=True):
        if root in subject_dirs:
            subject = os.path.basename(root)
        for file in files:
            filepath = os.path.join(root, file)
            if filter(args, filepath):
                if args.absolute:
                    record["path"] = filepath
                    if not args.folder:
                        record["folder"] = root
                else:
                    relative_path = os.path.relpath(filepath, start=args.root)
                    relative_root = os.path.relpath(root, start=args.root)
                    record = {"path": relative_path}
                    if not args.folder:
                        record["folder"] = relative_root
                if not args.name:
                    record["name"] = file
                if not args.s:
                    record["subject"] = subject
                if not args.time:
                    record["time"] = os.stat(filepath).st_ctime
                records.append(record)
    output["files"] = records
    return output


def main(args):
    output = createRecord(args)
    if args.sort:
        #Problem being you can only sort by one of the three options if also output the them
        output["files"].sort(key=lambda x: (
            x.get("name", "").lower() if "n" in args.sort else "",
            x.get("subject", "").lower() if "s" in args.sort else "",
            -x.get("time", 1) if "t" in args.sort else 0,
        ))
    return output

if __name__ == "__main__":
    result = main(parsed_args)
    print(json.dumps(result, indent=4))